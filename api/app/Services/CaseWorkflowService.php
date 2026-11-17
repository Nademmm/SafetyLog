<?php

namespace App\Services;

use App\Enums\ActionStatus;
use App\Enums\ActionType;
use App\Enums\CaseStatus;
use App\Enums\UserRole;
use App\Exceptions\DomainRuleException;
use App\Models\Attachment;
use App\Models\CaseAction;
use App\Models\CaseType;
use App\Models\Category;
use App\Models\Configuration;
use App\Models\Machine;
use App\Models\SafetyCase;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;

class CaseWorkflowService
{
    public function __construct(
        private readonly CaseNumberGenerator $caseNumberGenerator,
        private readonly AuditLogService $auditLogService,
        private readonly AttachmentService $attachmentService,
        private readonly RiskAssessmentService $riskAssessmentService,
        private readonly NotificationService $notificationService,
    ) {}

    /**
     * @return Collection<int, SafetyCase>
     */
    public function getOpenCasesForMachine(Machine $machine, ?int $days = null): Collection
    {
        $windowDays = $days ?? (int) Configuration::getValue($machine->organization_id, 'open_case_warning_days', 7);

        return SafetyCase::query()
            ->forOrganization($machine->organization_id)
            ->where('machine_id', $machine->id)
            ->whereIn('status', CaseStatus::openValues())
            ->where('reported_at', '>=', now()->subDays(max(1, $windowDays)))
            ->with(['caseType:id,code,name'])
            ->latest('reported_at')
            ->get();
    }

    /**
     * @param  array<string, mixed>  $data
     * @param  list<UploadedFile>  $photos
     * @return array{case: SafetyCase, emergency_reminder: ?string, open_cases_warning: Collection<int, SafetyCase>}
     */
    public function reportCase(User $reporter, array $data, array $photos = []): array
    {
        $machine = Machine::query()
            ->forOrganization($reporter->organization_id)
            ->active()
            ->with(['site', 'area'])
            ->find($data['machine_id']);

        if (! $machine || ! $machine->site || ! $machine->site->is_active) {
            throw new DomainRuleException('Mesin tidak ditemukan atau sudah diarsipkan.', 'MACHINE_UNAVAILABLE', 422, [
                'machine_id' => ['Mesin tidak ditemukan atau sudah diarsipkan.'],
            ]);
        }

        $caseType = CaseType::query()
            ->forOrganization($reporter->organization_id)
            ->where('is_active', true)
            ->find($data['case_type_id']);

        if (! $caseType) {
            throw new DomainRuleException('Jenis kasus tidak valid untuk organisasi Anda.', 'INVALID_CASE_TYPE', 422, [
                'case_type_id' => ['Jenis kasus tidak valid untuk organisasi Anda.'],
            ]);
        }

        $existingOpenCases = $this->getOpenCasesForMachine($machine);
        $reportedAt = now();

        $case = DB::transaction(function () use ($reporter, $machine, $caseType, $data, $photos, $reportedAt): SafetyCase {
            $caseNumber = $this->caseNumberGenerator->nextForSite($machine->site, $reportedAt);

            $case = SafetyCase::query()->create([
                'organization_id' => $reporter->organization_id,
                'site_id' => $machine->site_id,
                'area_id' => $machine->area_id,
                'machine_id' => $machine->id,
                'reporter_id' => $reporter->id,
                'case_type_id' => $caseType->id,
                'case_number' => $caseNumber,
                'description' => trim((string) $data['description']),
                'is_machine_stopped' => (bool) ($data['is_machine_stopped'] ?? false),
                'has_affected_people' => (bool) ($data['has_affected_people'] ?? false),
                'status' => CaseStatus::New,
                'reported_at' => $reportedAt,
            ]);

            if ($photos !== []) {
                $this->attachmentService->storePhotos($case, $reporter->organization_id, $reporter, $photos);
            }

            $this->auditLogService->record(
                case: $case,
                actor: $reporter,
                fromStatus: null,
                toStatus: CaseStatus::New,
                actionName: 'case_reported',
                metadata: [
                    'machine_id' => $machine->id,
                    'case_type_id' => $caseType->id,
                ],
            );

            $this->notificationService->notifyRole(
                organizationId: $reporter->organization_id,
                role: UserRole::Supervisor,
                type: 'case_reported',
                title: "Laporan baru {$caseNumber}",
                body: "{$machine->name}: {$caseType->name}",
                case: $case,
                excludeUserIds: [$reporter->id],
            );

            return $case;
        });

        $emergencyReminder = null;
        if ($caseType->is_incident && $case->has_affected_people) {
            $emergencyReminder = (string) Configuration::getValue(
                $reporter->organization_id,
                'emergency_reminder_text',
                'Ikuti prosedur darurat perusahaan terlebih dahulu. SafetyLog bukan pengganti prosedur resmi K3.',
            );
        }

        return [
            'case' => $case->fresh($this->caseDetailRelations()),
            'emergency_reminder' => $emergencyReminder,
            'open_cases_warning' => $existingOpenCases,
        ];
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array{case: SafetyCase, suggested_deadlines: ?array<string, string>}
     */
    public function triageCase(User $actor, SafetyCase $case, array $data): array
    {
        $this->ensureCaseIsEditable($case);

        $decision = (string) ($data['decision'] ?? '');

        if (! in_array($decision, ['assess', 'reject', 'duplicate'], true)) {
            throw new DomainRuleException('Keputusan triase tidak valid.', 'INVALID_TRIAGE_DECISION');
        }

        $canReassess = $case->status === CaseStatus::Assessed && $decision === 'assess';
        if ($case->status !== CaseStatus::New && ! $canReassess) {
            throw new DomainRuleException(
                'Triase hanya dapat dilakukan pada kasus berstatus Baru.',
                'INVALID_CASE_STATUS',
            );
        }

        return match ($decision) {
            'assess' => $this->assessCaseRisk($actor, $case, $data),
            'reject' => ['case' => $this->rejectCase($actor, $case, $data), 'suggested_deadlines' => null],
            'duplicate' => ['case' => $this->markCaseDuplicate($actor, $case, $data), 'suggested_deadlines' => null],
        };
    }

    /**
     * Save 5 Why and 6M root cause analysis (B-13).
     *
     * @param  array<string, mixed>  $data
     */
    public function analyzeRootCause(User $actor, SafetyCase $case, array $data): SafetyCase
    {
        $this->ensureCaseIsEditable($case);

        if ($case->status === CaseStatus::New) {
            throw new DomainRuleException(
                'Kasus harus dinilai risikonya melalui triase sebelum analisis penyebab dilakukan.',
                'TRIAGE_REQUIRED',
            );
        }

        $allowedCategories = (array) Configuration::getValue(
            $case->organization_id,
            'root_cause_categories',
            ['Manusia', 'Mesin', 'Metode', 'Material', 'Pengukuran', 'Lingkungan'],
        );

        $category = trim((string) ($data['root_cause_category'] ?? ''));
        if (! in_array($category, $allowedCategories, true)) {
            throw new DomainRuleException('Kategori akar penyebab (6M) tidak valid.', 'INVALID_ROOT_CAUSE_CATEGORY', 422, [
                'root_cause_category' => ['Kategori akar penyebab tidak sesuai konfigurasi organisasi.'],
            ]);
        }

        $fiveWhys = array_values(array_map(
            fn ($item) => trim((string) $item),
            (array) ($data['five_whys'] ?? []),
        ));

        return DB::transaction(function () use ($actor, $case, $category, $fiveWhys, $data): SafetyCase {
            $fromStatus = $case->status;
            $toStatus = $fromStatus === CaseStatus::Assessed ? CaseStatus::Analyzed : $fromStatus;

            $case->update([
                'root_cause_category' => $category,
                'five_whys' => $fiveWhys,
                'root_cause_summary' => isset($data['root_cause_summary']) ? trim((string) $data['root_cause_summary']) : end($fiveWhys),
                'analyzed_by' => $actor->id,
                'analyzed_at' => now(),
                'status' => $toStatus,
            ]);

            $this->auditLogService->record(
                case: $case,
                actor: $actor,
                fromStatus: $fromStatus,
                toStatus: $toStatus,
                actionName: 'root_cause_analyzed',
                metadata: [
                    'root_cause_category' => $category,
                    'why_count' => count($fiveWhys),
                ],
            );

            return $case->fresh($this->caseDetailRelations());
        });
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function addAction(User $actor, SafetyCase $case, array $data): CaseAction
    {
        $this->ensureCaseIsEditable($case);

        if ($case->status === CaseStatus::New) {
            throw new DomainRuleException(
                'Kasus harus dinilai risikonya melalui triase sebelum tindakan dapat ditambahkan.',
                'TRIAGE_REQUIRED',
            );
        }

        $actionType = ActionType::fromInput((string) ($data['action_type'] ?? ''));
        if (! $actionType) {
            throw new DomainRuleException('Jenis tindakan tidak valid.', 'INVALID_ACTION_TYPE', 422, [
                'action_type' => ['Jenis tindakan harus Sementara, Korektif, atau Preventif.'],
            ]);
        }

        $pic = $this->findActiveOrganizationUser((int) $data['pic_user_id'], $case->organization_id, 'pic_user_id');

        $dueAt = isset($data['due_at']) && $data['due_at'] !== null
            ? CarbonImmutable::parse((string) $data['due_at'])
            : $this->riskAssessmentService->suggestActionDueAt($case, $actionType);

        return DB::transaction(function () use ($actor, $case, $actionType, $pic, $dueAt, $data): CaseAction {
            $action = CaseAction::query()->create([
                'organization_id' => $case->organization_id,
                'safety_case_id' => $case->id,
                'action_type' => $actionType,
                'title' => trim((string) $data['title']),
                'description' => isset($data['description']) ? trim((string) $data['description']) : null,
                'pic_user_id' => $pic->id,
                'created_by' => $actor->id,
                'due_at' => $dueAt,
                'status' => ActionStatus::Open,
            ]);

            $previousStatus = $case->status;
            if ($previousStatus !== CaseStatus::InProgress) {
                $case->status = CaseStatus::InProgress;
                $case->save();
            }

            $this->auditLogService->record(
                case: $case,
                actor: $actor,
                fromStatus: $previousStatus,
                toStatus: CaseStatus::InProgress,
                actionName: 'action_created',
                metadata: [
                    'action_id' => $action->id,
                    'action_type' => $actionType->value,
                    'pic_user_id' => $pic->id,
                    'due_at' => $dueAt->toIso8601String(),
                ],
            );

            if ($pic->id !== $actor->id) {
                $this->notificationService->notifyUser(
                    userId: $pic->id,
                    organizationId: $case->organization_id,
                    type: 'action_assigned',
                    title: "Tindakan baru pada {$case->case_number}",
                    body: "{$actionType->label()}: {$action->title}",
                    case: $case,
                    action: $action,
                );
            }

            return $action->fresh(['pic:id,name,email,role,job_title', 'creator:id,name,email,role', 'attachments']);
        });
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function updateAction(User $actor, CaseAction $action, array $data): CaseAction
    {
        $case = $action->safetyCase()->firstOrFail();
        $this->ensureCaseIsEditable($case);

        if ($action->status === ActionStatus::Completed) {
            throw new DomainRuleException('Tindakan yang sudah selesai tidak dapat diedit; buka ulang terlebih dahulu bila perlu revisi.', 'ACTION_ALREADY_COMPLETED');
        }

        $updates = [];

        if (array_key_exists('action_type', $data)) {
            $actionType = ActionType::fromInput((string) $data['action_type']);
            if (! $actionType) {
                throw new DomainRuleException('Jenis tindakan tidak valid.', 'INVALID_ACTION_TYPE', 422, [
                    'action_type' => ['Jenis tindakan harus Sementara, Korektif, atau Preventif.'],
                ]);
            }
            $updates['action_type'] = $actionType;
        }

        if (array_key_exists('title', $data)) {
            $updates['title'] = trim((string) $data['title']);
        }

        if (array_key_exists('description', $data)) {
            $updates['description'] = $data['description'] !== null ? trim((string) $data['description']) : null;
        }

        $newPic = null;
        if (array_key_exists('pic_user_id', $data)) {
            $newPic = $this->findActiveOrganizationUser((int) $data['pic_user_id'], $case->organization_id, 'pic_user_id');
            $updates['pic_user_id'] = $newPic->id;
        }

        if (array_key_exists('due_at', $data)) {
            $updates['due_at'] = CarbonImmutable::parse((string) $data['due_at']);
        }

        return DB::transaction(function () use ($actor, $action, $case, $updates, $newPic): CaseAction {
            $previousPicId = $action->pic_user_id;
            $action->update($updates);

            $this->auditLogService->record(
                case: $case,
                actor: $actor,
                fromStatus: $case->status,
                toStatus: $case->status,
                actionName: 'action_updated',
                metadata: [
                    'action_id' => $action->id,
                    'updated_fields' => array_keys($updates),
                ],
            );

            if ($newPic && $newPic->id !== $previousPicId && $newPic->id !== $actor->id) {
                $this->notificationService->notifyUser(
                    userId: $newPic->id,
                    organizationId: $case->organization_id,
                    type: 'action_assigned',
                    title: "Anda ditunjuk sebagai PIC pada {$case->case_number}",
                    body: $action->title,
                    case: $case,
                    action: $action,
                );
            }

            return $action->fresh(['pic:id,name,email,role,job_title', 'creator:id,name,email,role', 'attachments']);
        });
    }

    /**
     * @param  array<string, mixed>  $data
     * @param  list<UploadedFile>  $photos
     */
    public function completeAction(User $actor, CaseAction $action, array $data, array $photos = []): CaseAction
    {
        if ($action->organization_id !== $actor->organization_id || $action->pic_user_id !== $actor->id) {
            throw new DomainRuleException(
                'Hanya PIC yang ditunjuk yang dapat menyelesaikan tindakan ini.',
                'ONLY_ASSIGNED_PIC_CAN_COMPLETE',
                403,
            );
        }

        $case = $action->safetyCase()->firstOrFail();
        $this->ensureCaseIsEditable($case);

        if ($action->status === ActionStatus::Completed) {
            throw new DomainRuleException('Tindakan ini sudah ditandai selesai sebelumnya.', 'ACTION_ALREADY_COMPLETED');
        }

        $note = trim((string) ($data['completion_note'] ?? ''));
        if ($note === '') {
            throw new DomainRuleException('Catatan hasil tindakan wajib diisi.', 'COMPLETION_NOTE_REQUIRED', 422, [
                'completion_note' => ['Catatan hasil tindakan wajib diisi.'],
            ]);
        }

        return DB::transaction(function () use ($actor, $action, $case, $note, $photos): CaseAction {
            $action->update([
                'status' => ActionStatus::Completed,
                'completion_note' => $note,
                'completed_at' => now(),
                'completed_by' => $actor->id,
            ]);

            if ($photos !== []) {
                $this->attachmentService->storePhotos($action, $actor->organization_id, $actor, $photos);
            }

            $hasOpenActions = $case->actions()
                ->where('status', ActionStatus::Open->value)
                ->exists();

            $fromStatus = $case->status;
            if (! $hasOpenActions) {
                $case->status = CaseStatus::PendingVerification;
                $case->save();

                $this->auditLogService->record(
                    case: $case,
                    actor: $actor,
                    fromStatus: $fromStatus,
                    toStatus: CaseStatus::PendingVerification,
                    actionName: 'all_actions_completed',
                    metadata: ['completed_action_id' => $action->id],
                );

                $picIds = $case->actions()->pluck('pic_user_id')->push($case->assigned_pic_id)->filter()->unique()->values()->all();
                $this->notificationService->notifyRole(
                    organizationId: $case->organization_id,
                    role: UserRole::Hse,
                    type: 'case_pending_verification',
                    title: "{$case->case_number} siap diverifikasi",
                    body: 'Semua tindakan telah selesai dikerjakan.',
                    case: $case,
                    excludeUserIds: array_map('intval', $picIds),
                );
            } else {
                $this->auditLogService->record(
                    case: $case,
                    actor: $actor,
                    fromStatus: $fromStatus,
                    toStatus: $fromStatus,
                    actionName: 'action_completed',
                    metadata: ['completed_action_id' => $action->id],
                );
            }

            return $action->fresh(['pic:id,name,email,role,job_title', 'completer:id,name,email,role', 'attachments', 'safetyCase']);
        });
    }

    public function reopenAction(User $actor, CaseAction $action, string $reason): CaseAction
    {
        $case = $action->safetyCase()->firstOrFail();
        $this->ensureCaseIsEditable($case);

        if ($action->status !== ActionStatus::Completed) {
            throw new DomainRuleException('Tindakan masih berstatus terbuka.', 'ACTION_ALREADY_OPEN');
        }

        return DB::transaction(function () use ($actor, $action, $case, $reason): CaseAction {
            $action->update([
                'status' => ActionStatus::Open,
                'completed_at' => null,
                'completed_by' => null,
            ]);

            $fromStatus = $case->status;
            if ($fromStatus === CaseStatus::PendingVerification) {
                $case->status = CaseStatus::InProgress;
                $case->save();
            }

            $this->auditLogService->record(
                case: $case,
                actor: $actor,
                fromStatus: $fromStatus,
                toStatus: $case->status,
                actionName: 'action_reopened',
                reason: trim($reason),
                metadata: ['action_id' => $action->id],
            );

            if ($action->pic_user_id !== $actor->id) {
                $this->notificationService->notifyUser(
                    userId: $action->pic_user_id,
                    organizationId: $case->organization_id,
                    type: 'action_reopened',
                    title: "Tindakan dibuka ulang pada {$case->case_number}",
                    body: trim($reason),
                    case: $case,
                    action: $action,
                );
            }

            return $action->fresh(['pic:id,name,email,role,job_title', 'attachments', 'safetyCase']);
        });
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function verifyCase(User $actor, SafetyCase $case, array $data): SafetyCase
    {
        $this->ensureCaseIsEditable($case);

        if ($case->status !== CaseStatus::PendingVerification) {
            throw new DomainRuleException(
                'Verifikasi hanya dapat dilakukan ketika status kasus Menunggu verifikasi.',
                'INVALID_CASE_STATUS',
            );
        }

        $this->ensureVerifierIsNotPic($actor, $case);

        $decision = (string) ($data['decision'] ?? '');
        if (! in_array($decision, ['approve', 'reject'], true)) {
            throw new DomainRuleException('Keputusan verifikasi harus berupa approve atau reject.', 'INVALID_VERIFY_DECISION');
        }

        if ($decision === 'approve') {
            return $this->approveVerification($actor, $case, $data);
        }

        return $this->rejectVerification($actor, $case, $data);
    }

    /**
     * Reopen a closed case when an issue recurs (B-17, U10).
     *
     * @param  array<string, mixed>  $data
     */
    public function reopenCase(User $actor, SafetyCase $case, array $data): SafetyCase
    {
        if ($case->status !== CaseStatus::Closed) {
            throw new DomainRuleException(
                'Hanya kasus berstatus Selesai yang dapat dibuka ulang.',
                'INVALID_CASE_STATUS',
            );
        }

        $reason = trim((string) ($data['reason'] ?? ''));
        if ($reason === '') {
            throw new DomainRuleException('Alasan pembukaan ulang kasus wajib diisi.', 'REOPEN_REASON_REQUIRED', 422, [
                'reason' => ['Alasan pembukaan ulang kasus wajib diisi.'],
            ]);
        }

        $reopenActionIds = $this->validateBelongingActionIds($case, (array) ($data['reopen_action_ids'] ?? []));

        return DB::transaction(function () use ($actor, $case, $reason, $reopenActionIds): SafetyCase {
            if ($reopenActionIds !== []) {
                $case->actions()
                    ->whereIn('id', $reopenActionIds)
                    ->update([
                        'status' => ActionStatus::Open->value,
                        'completed_at' => null,
                        'completed_by' => null,
                    ]);
            }

            $case->update([
                'status' => CaseStatus::InProgress,
                'is_locked' => false,
                'reopened_by' => $actor->id,
                'reopened_at' => now(),
                'reopen_reason' => $reason,
            ]);

            $this->auditLogService->record(
                case: $case,
                actor: $actor,
                fromStatus: CaseStatus::Closed,
                toStatus: CaseStatus::InProgress,
                actionName: 'case_reopened',
                reason: $reason,
                metadata: $reopenActionIds !== [] ? ['reopened_action_ids' => $reopenActionIds] : [],
            );

            $notifyIds = collect([$case->triaged_by, $case->assigned_pic_id])
                ->merge($case->actions()->pluck('pic_user_id'))
                ->filter()
                ->unique()
                ->reject(fn ($id) => (int) $id === $actor->id);

            foreach ($notifyIds as $userId) {
                $this->notificationService->notifyUser(
                    userId: (int) $userId,
                    organizationId: $case->organization_id,
                    type: 'case_reopened',
                    title: "Kasus {$case->case_number} dibuka ulang",
                    body: $reason,
                    case: $case,
                );
            }

            return $case->fresh($this->caseDetailRelations());
        });
    }

    /**
     * @param  list<UploadedFile>  $photos
     * @return list<Attachment>
     */
    public function attachPhotosToCase(User $actor, SafetyCase $case, array $photos): array
    {
        $this->ensureCaseIsEditable($case);

        return $this->attachmentService->storePhotos($case, $case->organization_id, $actor, $photos);
    }

    /**
     * @param  list<UploadedFile>  $photos
     * @return list<Attachment>
     */
    public function attachPhotosToAction(User $actor, CaseAction $action, array $photos): array
    {
        $case = $action->safetyCase()->firstOrFail();
        $this->ensureCaseIsEditable($case);

        return $this->attachmentService->storePhotos($action, $action->organization_id, $actor, $photos);
    }

    public function deleteAttachment(Attachment $attachment): void
    {
        $attachable = $attachment->attachable;
        if ($attachable instanceof SafetyCase) {
            $this->ensureCaseIsEditable($attachable);
        } elseif ($attachable instanceof CaseAction && $attachable->safetyCase) {
            $this->ensureCaseIsEditable($attachable->safetyCase);
        }

        $this->attachmentService->deleteAttachment($attachment);
    }

    /**
     * @return list<string>
     */
    public function caseDetailRelations(): array
    {
        return [
            'site:id,name,code',
            'area:id,site_id,name,code',
            'machine:id,site_id,area_id,code,name,qr_token',
            'reporter:id,name,email,role,job_title',
            'caseType:id,code,name,is_incident',
            'category:id,code,name',
            'assignedPic:id,name,email,role,job_title',
            'triagedBy:id,name,email,role',
            'analyzedBy:id,name,email,role',
            'verifiedBy:id,name,email,role',
            'reopenedBy:id,name,email,role',
            'duplicateOf:id,case_number,status',
            'attachments',
            'actions.pic:id,name,email,role,job_title',
            'actions.creator:id,name,email,role',
            'actions.completer:id,name,email,role',
            'actions.attachments',
            'statusHistories.changedBy:id,name,email,role',
        ];
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array{case: SafetyCase, suggested_deadlines: array<string, string>}
     */
    private function assessCaseRisk(User $actor, SafetyCase $case, array $data): array
    {
        $maxScale = $this->riskAssessmentService->maxScaleForOrganization($case->organization_id);
        $severity = (int) ($data['severity'] ?? 0);
        $likelihood = (int) ($data['likelihood'] ?? 0);

        if ($severity < 1 || $severity > $maxScale || $likelihood < 1 || $likelihood > $maxScale) {
            throw new DomainRuleException(
                "Nilai keparahan dan kemungkinan harus berada di antara 1 sampai {$maxScale}.",
                'INVALID_RISK_SCALE',
            );
        }

        $score = $severity * $likelihood;
        $riskConfig = $this->riskAssessmentService->resolveConfigByScore($case->organization_id, $score);

        $categoryId = $data['category_id'] ?? $case->category_id;
        if ($categoryId !== null) {
            $categoryExists = Category::query()
                ->forOrganization($case->organization_id)
                ->where('is_active', true)
                ->whereKey($categoryId)
                ->exists();

            if (! $categoryExists) {
                throw new DomainRuleException('Kategori tidak valid untuk organisasi Anda.', 'INVALID_CATEGORY', 422, [
                    'category_id' => ['Kategori tidak valid untuk organisasi Anda.'],
                ]);
            }
        }

        $assignedPicId = $data['assigned_pic_id'] ?? null;
        if ($assignedPicId !== null) {
            $this->findActiveOrganizationUser((int) $assignedPicId, $case->organization_id, 'assigned_pic_id');
        }

        $updated = DB::transaction(function () use ($actor, $case, $severity, $likelihood, $score, $riskConfig, $categoryId, $assignedPicId): SafetyCase {
            $fromStatus = $case->status;
            $now = now();

            $case->update([
                'category_id' => $categoryId,
                'severity' => $severity,
                'likelihood' => $likelihood,
                'risk_score' => $score,
                'risk_level' => $riskConfig->level,
                'assigned_pic_id' => $assignedPicId,
                'triaged_by' => $actor->id,
                'triaged_at' => $now,
                'status' => CaseStatus::Assessed,
            ]);

            $this->auditLogService->record(
                case: $case,
                actor: $actor,
                fromStatus: $fromStatus,
                toStatus: CaseStatus::Assessed,
                actionName: 'case_triaged',
                metadata: [
                    'severity' => $severity,
                    'likelihood' => $likelihood,
                    'risk_score' => $score,
                    'risk_level' => $riskConfig->level->value,
                    'assigned_pic_id' => $assignedPicId,
                ],
            );

            if ($assignedPicId !== null && (int) $assignedPicId !== $actor->id) {
                $this->notificationService->notifyUser(
                    userId: (int) $assignedPicId,
                    organizationId: $case->organization_id,
                    type: 'case_assigned',
                    title: "Anda ditunjuk menangani {$case->case_number}",
                    body: "Tingkat risiko: {$riskConfig->label} (skor {$score}).",
                    case: $case,
                );
            }

            return $case->fresh($this->caseDetailRelations());
        });

        return [
            'case' => $updated,
            'suggested_deadlines' => $this->riskAssessmentService->suggestedDeadlines($riskConfig, $updated->triaged_at),
        ];
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function rejectCase(User $actor, SafetyCase $case, array $data): SafetyCase
    {
        $reason = trim((string) ($data['rejection_reason'] ?? ''));
        if ($reason === '') {
            throw new DomainRuleException('Alasan penolakan wajib diisi.', 'REJECTION_REASON_REQUIRED', 422, [
                'rejection_reason' => ['Alasan penolakan wajib diisi.'],
            ]);
        }

        return DB::transaction(function () use ($actor, $case, $reason): SafetyCase {
            $fromStatus = $case->status;

            $case->update([
                'status' => CaseStatus::Rejected,
                'rejection_reason' => $reason,
                'triaged_by' => $actor->id,
                'triaged_at' => now(),
                'is_locked' => true,
            ]);

            $this->auditLogService->record(
                case: $case,
                actor: $actor,
                fromStatus: $fromStatus,
                toStatus: CaseStatus::Rejected,
                actionName: 'case_rejected',
                reason: $reason,
            );

            return $case->fresh($this->caseDetailRelations());
        });
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function markCaseDuplicate(User $actor, SafetyCase $case, array $data): SafetyCase
    {
        $reason = trim((string) ($data['rejection_reason'] ?? ''));
        if ($reason === '') {
            throw new DomainRuleException('Alasan penandaan duplikat wajib diisi.', 'DUPLICATE_REASON_REQUIRED', 422, [
                'rejection_reason' => ['Alasan penandaan duplikat wajib diisi.'],
            ]);
        }

        $duplicateOfId = (int) ($data['duplicate_of_case_id'] ?? 0);
        if ($duplicateOfId === 0 || $duplicateOfId === $case->id) {
            throw new DomainRuleException('Pilih kasus asli yang valid sebagai rujukan duplikat.', 'INVALID_DUPLICATE_TARGET', 422, [
                'duplicate_of_case_id' => ['Pilih kasus asli yang valid (bukan kasus ini sendiri).'],
            ]);
        }

        $targetExists = SafetyCase::query()
            ->forOrganization($case->organization_id)
            ->whereKey($duplicateOfId)
            ->exists();

        if (! $targetExists) {
            throw new DomainRuleException('Kasus rujukan duplikat tidak ditemukan pada organisasi Anda.', 'INVALID_DUPLICATE_TARGET', 422, [
                'duplicate_of_case_id' => ['Kasus rujukan duplikat tidak ditemukan pada organisasi Anda.'],
            ]);
        }

        return DB::transaction(function () use ($actor, $case, $reason, $duplicateOfId): SafetyCase {
            $fromStatus = $case->status;

            $case->update([
                'status' => CaseStatus::Duplicate,
                'rejection_reason' => $reason,
                'duplicate_of_case_id' => $duplicateOfId,
                'triaged_by' => $actor->id,
                'triaged_at' => now(),
                'is_locked' => true,
            ]);

            $this->auditLogService->record(
                case: $case,
                actor: $actor,
                fromStatus: $fromStatus,
                toStatus: CaseStatus::Duplicate,
                actionName: 'case_marked_duplicate',
                reason: $reason,
                metadata: ['duplicate_of_case_id' => $duplicateOfId],
            );

            return $case->fresh($this->caseDetailRelations());
        });
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function approveVerification(User $actor, SafetyCase $case, array $data): SafetyCase
    {
        if ($this->riskAssessmentService->requiresPreventiveAction($case)) {
            $hasCompletedPreventive = $case->actions()
                ->where('action_type', ActionType::Preventive->value)
                ->where('status', ActionStatus::Completed->value)
                ->exists();

            if (! $hasCompletedPreventive) {
                $riskLabel = $case->risk_level?->label() ?? 'Sedang/Tinggi';

                throw new DomainRuleException(
                    "Kasus dengan risiko {$riskLabel} tidak dapat ditutup tanpa minimal 1 tindakan Preventif yang sudah selesai.",
                    'PREVENTIVE_ACTION_REQUIRED',
                );
            }
        }

        $learningSummary = trim((string) ($data['learning_summary'] ?? ''));
        if ($learningSummary === '') {
            throw new DomainRuleException('Ringkasan pembelajaran wajib diisi saat menutup kasus.', 'LEARNING_SUMMARY_REQUIRED', 422, [
                'learning_summary' => ['Ringkasan pembelajaran wajib diisi saat menutup kasus.'],
            ]);
        }

        return DB::transaction(function () use ($actor, $case, $learningSummary): SafetyCase {
            $now = now();

            $case->update([
                'status' => CaseStatus::Closed,
                'learning_summary' => $learningSummary,
                'verified_by' => $actor->id,
                'verified_at' => $now,
                'closed_at' => $now,
                'is_locked' => true,
            ]);

            $this->auditLogService->record(
                case: $case,
                actor: $actor,
                fromStatus: CaseStatus::PendingVerification,
                toStatus: CaseStatus::Closed,
                actionName: 'verification_approved',
                metadata: ['learning_summary_length' => mb_strlen($learningSummary)],
            );

            if ($case->reporter_id !== $actor->id) {
                $this->notificationService->notifyUser(
                    userId: $case->reporter_id,
                    organizationId: $case->organization_id,
                    type: 'case_closed',
                    title: "Laporan {$case->case_number} telah selesai",
                    body: $learningSummary,
                    case: $case,
                );
            }

            return $case->fresh($this->caseDetailRelations());
        });
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function rejectVerification(User $actor, SafetyCase $case, array $data): SafetyCase
    {
        $reason = trim((string) ($data['rejection_reason'] ?? ''));
        if ($reason === '') {
            throw new DomainRuleException('Alasan penolakan verifikasi wajib diisi.', 'VERIFICATION_REJECTION_REASON_REQUIRED', 422, [
                'rejection_reason' => ['Alasan penolakan verifikasi wajib diisi.'],
            ]);
        }

        $reopenActionIds = $this->validateBelongingActionIds($case, (array) ($data['reopen_action_ids'] ?? []));

        return DB::transaction(function () use ($actor, $case, $reason, $reopenActionIds): SafetyCase {
            if ($reopenActionIds !== []) {
                $case->actions()
                    ->whereIn('id', $reopenActionIds)
                    ->update([
                        'status' => ActionStatus::Open->value,
                        'completed_at' => null,
                        'completed_by' => null,
                    ]);
            }

            $case->update([
                'status' => CaseStatus::InProgress,
                'verified_by' => null,
                'verified_at' => null,
            ]);

            $this->auditLogService->record(
                case: $case,
                actor: $actor,
                fromStatus: CaseStatus::PendingVerification,
                toStatus: CaseStatus::InProgress,
                actionName: 'verification_rejected',
                reason: $reason,
                metadata: $reopenActionIds !== [] ? ['reopened_action_ids' => $reopenActionIds] : [],
            );

            $notifyIds = collect([$case->triaged_by])
                ->merge($case->actions()->pluck('pic_user_id'))
                ->filter()
                ->unique()
                ->reject(fn ($id) => (int) $id === $actor->id);

            foreach ($notifyIds as $userId) {
                $this->notificationService->notifyUser(
                    userId: (int) $userId,
                    organizationId: $case->organization_id,
                    type: 'verification_rejected',
                    title: "Verifikasi {$case->case_number} ditolak",
                    body: $reason,
                    case: $case,
                );
            }

            return $case->fresh($this->caseDetailRelations());
        });
    }

    /**
     * @param  array<int|string>  $actionIds
     * @return list<int>
     */
    private function validateBelongingActionIds(SafetyCase $case, array $actionIds): array
    {
        $ids = array_values(array_unique(array_map('intval', $actionIds)));

        if ($ids !== []) {
            $matchedCount = $case->actions()->whereIn('id', $ids)->count();
            if ($matchedCount !== count($ids)) {
                throw new DomainRuleException('Sebagian tindakan yang dipilih tidak berasal dari kasus ini.', 'INVALID_REOPEN_ACTIONS', 422, [
                    'reopen_action_ids' => ['Sebagian tindakan yang dipilih tidak berasal dari kasus ini.'],
                ]);
            }
        }

        return $ids;
    }

    private function ensureCaseIsEditable(SafetyCase $case): void
    {
        if ($case->is_locked || $case->status->isTerminal()) {
            throw new DomainRuleException(
                'Kasus sudah ditutup atau dikunci sehingga tidak dapat diubah lagi.',
                'CASE_LOCKED',
            );
        }
    }

    private function ensureVerifierIsNotPic(User $actor, SafetyCase $case): void
    {
        $isActionPic = $case->actions()->where('pic_user_id', $actor->id)->exists();
        $isCasePic = $case->assigned_pic_id === $actor->id;

        if ($isActionPic || $isCasePic) {
            throw new DomainRuleException(
                'Verifikator tidak boleh sama dengan PIC pada kasus atau tindakan ini.',
                'VERIFIER_CANNOT_BE_PIC',
            );
        }
    }

    private function findActiveOrganizationUser(int $userId, int $organizationId, string $fieldName): User
    {
        $user = User::query()
            ->forOrganization($organizationId)
            ->where('is_active', true)
            ->find($userId);

        if (! $user) {
            throw new DomainRuleException(
                'PIC tidak ditemukan atau bukan bagian dari organisasi Anda.',
                'INVALID_PIC_USER',
                422,
                [$fieldName => ['PIC harus merupakan pengguna aktif pada organisasi yang sama.']],
            );
        }

        return $user;
    }
}

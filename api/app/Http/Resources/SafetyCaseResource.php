<?php

namespace App\Http\Resources;

use App\Enums\CaseStatus;
use App\Models\SafetyCase;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin SafetyCase */
class SafetyCaseResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $user = $request->user();
        $isEditable = ! $this->is_locked && ! $this->status->isTerminal();
        $isPicOnCase = $user !== null && (
            $this->assigned_pic_id === $user->id
            || ($this->relationLoaded('actions') && $this->actions->contains('pic_user_id', $user->id))
        );

        return [
            'id' => $this->id,
            'organization_id' => $this->organization_id,
            'case_number' => $this->case_number,
            'description' => $this->description,
            'is_machine_stopped' => $this->is_machine_stopped,
            'has_affected_people' => $this->has_affected_people,
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'is_locked' => $this->is_locked,
            'reported_at' => $this->reported_at?->toIso8601String(),

            'site' => $this->whenLoaded('site', fn () => $this->site ? [
                'id' => $this->site->id,
                'name' => $this->site->name,
                'code' => $this->site->code,
            ] : null),
            'area' => $this->whenLoaded('area', fn () => $this->area ? [
                'id' => $this->area->id,
                'name' => $this->area->name,
                'code' => $this->area->code,
                'pic_user' => $this->area->relationLoaded('picUser') && $this->area->picUser ? [
                    'id' => $this->area->picUser->id,
                    'name' => $this->area->picUser->name,
                    'email' => $this->area->picUser->email,
                    'role' => $this->area->picUser->role->value,
                    'role_label' => $this->area->picUser->role->label(),
                    'job_title' => $this->area->picUser->job_title,
                ] : null,
            ] : null),
            'machine' => $this->whenLoaded('machine', fn () => $this->machine ? [
                'id' => $this->machine->id,
                'code' => $this->machine->code,
                'name' => $this->machine->name,
                'qr_token' => $this->machine->qr_token,
            ] : null),
            'reporter' => $this->whenLoaded('reporter', fn () => $this->reporter ? [
                'id' => $this->reporter->id,
                'name' => $this->reporter->name,
                'email' => $this->reporter->email,
                'role' => $this->reporter->role->value,
                'role_label' => $this->reporter->role->label(),
                'job_title' => $this->reporter->job_title,
            ] : null),
            'case_type' => $this->whenLoaded('caseType', fn () => $this->caseType ? [
                'id' => $this->caseType->id,
                'code' => $this->caseType->code,
                'name' => $this->caseType->name,
                'is_incident' => $this->caseType->is_incident,
            ] : null),
            'category' => $this->whenLoaded('category', fn () => $this->category ? [
                'id' => $this->category->id,
                'code' => $this->category->code,
                'name' => $this->category->name,
            ] : null),

            'risk_assessment' => [
                'severity' => $this->severity,
                'likelihood' => $this->likelihood,
                'risk_score' => $this->risk_score,
                'risk_level' => $this->risk_level?->value,
                'risk_level_label' => $this->risk_level?->label(),
                'assigned_pic' => $this->whenLoaded('assignedPic', fn () => $this->assignedPic ? [
                    'id' => $this->assignedPic->id,
                    'name' => $this->assignedPic->name,
                    'email' => $this->assignedPic->email,
                    'job_title' => $this->assignedPic->job_title,
                ] : null),
                'triaged_by' => $this->whenLoaded('triagedBy', fn () => $this->triagedBy ? [
                    'id' => $this->triagedBy->id,
                    'name' => $this->triagedBy->name,
                ] : null),
                'triaged_at' => $this->triaged_at?->toIso8601String(),
                'rejection_reason' => $this->rejection_reason,
                'duplicate_of' => $this->whenLoaded('duplicateOf', fn () => $this->duplicateOf ? [
                    'id' => $this->duplicateOf->id,
                    'case_number' => $this->duplicateOf->case_number,
                    'status' => $this->duplicateOf->status->value,
                    'status_label' => $this->duplicateOf->status->label(),
                ] : null),
            ],

            'root_cause' => [
                'root_cause_category' => $this->root_cause_category,
                'five_whys' => $this->five_whys,
                'root_cause_summary' => $this->root_cause_summary,
                'analyzed_by' => $this->whenLoaded('analyzedBy', fn () => $this->analyzedBy ? [
                    'id' => $this->analyzedBy->id,
                    'name' => $this->analyzedBy->name,
                ] : null),
                'analyzed_at' => $this->analyzed_at?->toIso8601String(),
            ],

            'verification' => [
                'learning_summary' => $this->learning_summary,
                'verified_by' => $this->whenLoaded('verifiedBy', fn () => $this->verifiedBy ? [
                    'id' => $this->verifiedBy->id,
                    'name' => $this->verifiedBy->name,
                ] : null),
                'verified_at' => $this->verified_at?->toIso8601String(),
                'closed_at' => $this->closed_at?->toIso8601String(),
                'reopened_by' => $this->whenLoaded('reopenedBy', fn () => $this->reopenedBy ? [
                    'id' => $this->reopenedBy->id,
                    'name' => $this->reopenedBy->name,
                ] : null),
                'reopened_at' => $this->reopened_at?->toIso8601String(),
                'reopen_reason' => $this->reopen_reason,
            ],

            'attachments' => AttachmentResource::collection($this->whenLoaded('attachments')),
            'actions' => CaseActionResource::collection($this->whenLoaded('actions')),
            'status_histories' => CaseStatusHistoryResource::collection($this->whenLoaded('statusHistories')),

            'available_actions' => $user ? [
                'can_triage' => $isEditable
                    && $user->role->canTriage()
                    && in_array($this->status, [CaseStatus::New, CaseStatus::Assessed], true),
                'can_analyze_root_cause' => $isEditable
                    && $user->role->canManageActions()
                    && $this->status !== CaseStatus::New,
                'can_manage_actions' => $isEditable
                    && $user->role->canManageActions()
                    && $this->status !== CaseStatus::New,
                'can_verify' => $isEditable
                    && $user->role->canVerify()
                    && $this->status === CaseStatus::PendingVerification
                    && ! $isPicOnCase,
                'can_reopen' => $this->status === CaseStatus::Closed && $user->role->canVerify(),
                'is_verifier_blocked_as_pic' => $isPicOnCase,
            ] : null,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}

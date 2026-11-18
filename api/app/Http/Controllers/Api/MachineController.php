<?php

namespace App\Http\Controllers\Api;

use App\Enums\CaseStatus;
use App\Exceptions\DomainRuleException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreMachineRequest;
use App\Http\Requests\Admin\UpdateMachineRequest;
use App\Http\Resources\SafetyCaseSummaryResource;
use App\Models\Area;
use App\Models\CaseType;
use App\Models\Configuration;
use App\Models\Machine;
use App\Models\SafetyCase;
use App\Services\CaseWorkflowService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class MachineController extends Controller
{
    public function __construct(
        private readonly CaseWorkflowService $workflow,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $canManageMasterData = $user->role->canManageMasterData();

        if ($request->boolean('include_archived') && ! $canManageMasterData) {
            abort(403, 'Hanya Manajer/Admin yang dapat melihat mesin yang diarsipkan.');
        }

        $query = Machine::query()
            ->forOrganization($user->organization_id)
            ->with(Machine::SUMMARY_RELATIONS)
            ->orderBy('name');

        if (! $request->boolean('include_archived')) {
            $query->operational();
        }

        if ($request->filled('site_id')) {
            $query->where('site_id', (int) $request->query('site_id'));
        }

        if ($request->filled('area_id')) {
            $query->where('area_id', (int) $request->query('area_id'));
        }

        if ($request->filled('q')) {
            $keyword = '%'.mb_strtolower(trim((string) $request->query('q'))).'%';
            $query->where(function ($sub) use ($keyword): void {
                $sub->whereRaw('LOWER(name) LIKE ?', [$keyword])
                    ->orWhereRaw('LOWER(code) LIKE ?', [$keyword]);
            });
        }

        $machines = $query->get()
            ->map(fn (Machine $machine) => $machine->toSummaryArray($canManageMasterData))
            ->values();

        return response()->json(['data' => $machines]);
    }

    public function showByQrToken(Request $request, string $qrToken): JsonResponse
    {
        $machine = Machine::query()
            ->where('qr_token', $qrToken)
            ->with(Machine::SUMMARY_RELATIONS)
            ->first();

        if (! $machine) {
            return response()->json(['message' => 'Kode QR mesin tidak ditemukan.'], 404);
        }

        Gate::authorize('view', $machine);

        if (! $machine->isOperational()) {
            return response()->json(['message' => 'Mesin ini sudah diarsipkan dan tidak dapat dipilih.'], 422);
        }

        $caseTypes = CaseType::query()
            ->forOrganization($machine->organization_id)
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->get(['id', 'code', 'name', 'is_incident']);

        $formattedMachine = $machine->toSummaryArray();

        return response()->json([
            'data' => $formattedMachine,
            'machine' => $formattedMachine,
            'case_types' => $caseTypes,
            'emergency_reminder_text' => $this->workflow->getEmergencyReminderText($machine->organization_id),
            'form_config' => $this->workflow->buildReportFormConfig($machine->organization_id),
            'open_cases_warning' => $this->workflow->buildOpenCasesWarningPayload($machine),
        ]);
    }

    public function openCases(Request $request, Machine $machine): JsonResponse
    {
        Gate::authorize('view', $machine);

        $warning = $this->workflow->buildOpenCasesWarningPayload($machine);

        return response()->json([
            'machine_id' => $machine->id,
            ...$warning,
        ]);
    }

    public function cases(Request $request, Machine $machine): JsonResponse
    {
        Gate::authorize('view', $machine);

        $recurringThreshold = (int) Configuration::getValue($machine->organization_id, 'recurring_case_threshold', 3);
        $recurringWindowDays = (int) Configuration::getValue($machine->organization_id, 'recurring_window_days', 90);

        $recentCount = SafetyCase::query()
            ->forOrganization($machine->organization_id)
            ->where('machine_id', $machine->id)
            ->whereNotIn('status', [CaseStatus::Rejected->value, CaseStatus::Duplicate->value])
            ->where('reported_at', '>=', now()->subDays(max(1, $recurringWindowDays)))
            ->count();

        $cases = SafetyCase::query()
            ->forOrganization($machine->organization_id)
            ->where('machine_id', $machine->id)
            ->with(['caseType:id,code,name', 'machine:id,code,name'])
            ->latest('reported_at')
            ->paginate(min(100, max(1, (int) $request->integer('per_page', 15))));

        return response()->json([
            'machine' => $machine->loadMissing(['site:id,name,code', 'area:id,name,code'])->toSummaryArray(),
            'is_recurring' => $recentCount >= $recurringThreshold,
            'recurring_label' => $recentCount >= $recurringThreshold ? 'Berulang' : null,
            'cases_last_90_days' => $recentCount,
            'data' => SafetyCaseSummaryResource::collection($cases->items()),
            'meta' => [
                'current_page' => $cases->currentPage(),
                'last_page' => $cases->lastPage(),
                'per_page' => $cases->perPage(),
                'total' => $cases->total(),
            ],
        ]);
    }

    public function store(StoreMachineRequest $request): JsonResponse
    {
        $orgId = $request->user()->organization_id;
        $area = $this->findActiveArea((int) $request->validated('area_id'), $orgId);

        $machine = Machine::query()->create([
            'organization_id' => $orgId,
            'site_id' => $area->site_id,
            'area_id' => $area->id,
            'code' => $this->generateMachineCode($orgId),
            'name' => trim((string) $request->validated('name')),
            'description' => $request->validated('description'),
            'is_active' => true,
        ]);

        return response()->json([
            'message' => 'Mesin berhasil ditambahkan.',
            'data' => $machine->load(['site:id,name,code', 'area:id,name,code'])->toSummaryArray(),
        ], 201);
    }

    public function update(UpdateMachineRequest $request, Machine $machine): JsonResponse
    {
        Gate::authorize('view', $machine);

        $updates = [];
        if ($request->filled('area_id')) {
            $area = $this->findActiveArea((int) $request->validated('area_id'), $machine->organization_id);
            $updates['area_id'] = $area->id;
            $updates['site_id'] = $area->site_id;
        }

        if ($request->has('name')) {
            $updates['name'] = trim((string) $request->validated('name'));
        }

        if ($request->has('description')) {
            $updates['description'] = $request->validated('description');
        }

        if ($request->has('is_active')) {
            $active = (bool) $request->validated('is_active');
            $updates['is_active'] = $active;
            $updates['archived_at'] = $active ? null : now();
        }

        $machine->update($updates);

        return response()->json([
            'message' => 'Data mesin berhasil diperbarui.',
            'data' => $machine->fresh(['site:id,name,code', 'area:id,name,code'])->toSummaryArray(),
        ]);
    }

    public function archive(Request $request, Machine $machine): JsonResponse
    {
        Gate::authorize('view', $machine);

        $activate = ! $machine->is_active || $machine->archived_at !== null;

        $machine->update([
            'is_active' => $activate,
            'archived_at' => $activate ? null : now(),
        ]);

        return response()->json([
            'message' => $activate
                ? 'Mesin berhasil diaktifkan kembali.'
                : 'Mesin berhasil diarsipkan.',
            'data' => $machine->fresh(['site:id,name,code', 'area:id,name,code'])->toSummaryArray(),
        ]);
    }

    public function regenerateQr(Request $request, Machine $machine): JsonResponse
    {
        Gate::authorize('view', $machine);

        $machine->update([
            'qr_token' => Machine::generateUniqueQrToken(),
        ]);

        return response()->json([
            'message' => 'Token QR mesin berhasil diperbarui.',
            'data' => $machine->fresh(['site:id,name,code', 'area:id,name,code'])->toSummaryArray(),
        ]);
    }

    private function generateMachineCode(int $organizationId): string
    {
        do {
            $next = (int) Machine::query()->forOrganization($organizationId)->count() + 1;
            $code = 'MCH-'.str_pad((string) $next, 3, '0', STR_PAD_LEFT);
        } while (Machine::query()->forOrganization($organizationId)->where('code', $code)->exists());

        return $code;
    }

    private function findActiveArea(int $areaId, int $organizationId): Area
    {
        $area = Area::query()
            ->forOrganization($organizationId)
            ->where('is_active', true)
            ->whereNull('archived_at')
            ->find($areaId);

        if (! $area) {
            throw new DomainRuleException('Area produksi tidak ditemukan atau sudah diarsipkan.', 'INVALID_AREA', 422, [
                'area_id' => ['Area produksi harus aktif dan berada pada organisasi yang sama.'],
            ]);
        }

        return $area;
    }
}

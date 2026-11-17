<?php

namespace App\Services;

use App\Enums\ActionStatus;
use App\Enums\CaseStatus;
use App\Enums\RiskLevel;
use App\Models\CaseAction;
use App\Models\Category;
use App\Models\Configuration;
use App\Models\Machine;
use App\Models\SafetyCase;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class DashboardService
{
    /**
     * Build dashboard analytics for managers, supervisors, and HSE officers (B-21, C-01).
     *
     * @return array<string, mixed>
     */
    public function buildForOrganization(int $organizationId, ?int $siteId = null): array
    {
        $recurringThreshold = (int) Configuration::getValue($organizationId, 'recurring_case_threshold', 3);
        $recurringWindowDays = (int) Configuration::getValue($organizationId, 'recurring_window_days', 90);
        $windowStart = now()->subDays(max(1, $recurringWindowDays));
        $monthStart = now()->startOfMonth();

        $baseCaseQuery = SafetyCase::query()
            ->forOrganization($organizationId)
            ->when($siteId !== null, fn ($q) => $q->where('site_id', $siteId));

        $openCasesCount = (clone $baseCaseQuery)
            ->whereIn('status', CaseStatus::openValues())
            ->count();

        $pendingVerificationCount = (clone $baseCaseQuery)
            ->where('status', CaseStatus::PendingVerification->value)
            ->count();

        $highRiskOpenCount = (clone $baseCaseQuery)
            ->whereIn('status', CaseStatus::openValues())
            ->where('risk_level', RiskLevel::High->value)
            ->count();

        $closedThisMonthCount = (clone $baseCaseQuery)
            ->where('status', CaseStatus::Closed->value)
            ->where('closed_at', '>=', $monthStart)
            ->count();

        $totalCasesCount = (clone $baseCaseQuery)->count();

        $overdueActionsQuery = CaseAction::query()
            ->forOrganization($organizationId)
            ->where('status', ActionStatus::Open->value)
            ->where('due_at', '<', now())
            ->when($siteId !== null, fn ($q) => $q->whereHas('safetyCase', fn ($c) => $c->where('site_id', $siteId)));

        $overdueActionsCount = (clone $overdueActionsQuery)->count();

        $overdueActions = $overdueActionsQuery
            ->with([
                'pic:id,name,email,role,job_title',
                'safetyCase:id,case_number,status,risk_level,machine_id',
                'safetyCase.machine:id,code,name',
            ])
            ->orderBy('due_at')
            ->limit(15)
            ->get()
            ->map(fn (CaseAction $action): array => [
                'id' => $action->id,
                'title' => $action->title,
                'action_type' => $action->action_type->value,
                'action_type_label' => $action->action_type->label(),
                'due_at' => $action->due_at->toIso8601String(),
                'days_overdue' => max(1, (int) $action->due_at->diffInDays(now())),
                'is_overdue' => true,
                'overdue_label' => 'Terlambat',
                'pic' => $action->pic ? [
                    'id' => $action->pic->id,
                    'name' => $action->pic->name,
                    'job_title' => $action->pic->job_title,
                ] : null,
                'safety_case' => $action->safetyCase ? [
                    'id' => $action->safetyCase->id,
                    'case_number' => $action->safetyCase->case_number,
                    'risk_level' => $action->safetyCase->risk_level?->value,
                    'risk_level_label' => $action->safetyCase->risk_level?->label(),
                    'machine' => $action->safetyCase->machine ? [
                        'id' => $action->safetyCase->machine->id,
                        'code' => $action->safetyCase->machine->code,
                        'name' => $action->safetyCase->machine->name,
                    ] : null,
                ] : null,
            ])
            ->values();

        $casesPerMachine = $this->buildCasesPerMachine($organizationId, $siteId, $windowStart, $recurringThreshold);
        $casesPerCategory = $this->buildCasesPerCategory($organizationId, $siteId);
        $casesByRiskLevel = $this->buildCasesByRiskLevel($baseCaseQuery);
        $casesByStatus = $this->buildCasesByStatus($baseCaseQuery);

        return [
            'summary' => [
                'open_cases_count' => $openCasesCount,
                'overdue_actions_count' => $overdueActionsCount,
                'closed_this_month_count' => $closedThisMonthCount,
                'pending_verification_count' => $pendingVerificationCount,
                'high_risk_open_count' => $highRiskOpenCount,
                'total_cases_count' => $totalCasesCount,
                'recurring_machines_count' => $casesPerMachine->where('is_recurring', true)->count(),
            ],
            'cases_per_machine' => $casesPerMachine->values(),
            'cases_per_category' => $casesPerCategory->values(),
            'cases_by_risk_level' => $casesByRiskLevel,
            'cases_by_status' => $casesByStatus,
            'overdue_actions' => $overdueActions,
            'recurring_rule' => [
                'threshold' => $recurringThreshold,
                'window_days' => $recurringWindowDays,
            ],
        ];
    }

    private function buildCasesPerMachine(int $organizationId, ?int $siteId, CarbonInterface $windowStart, int $recurringThreshold): Collection
    {
        $machines = Machine::query()
            ->forOrganization($organizationId)
            ->active()
            ->when($siteId !== null, fn ($q) => $q->where('site_id', $siteId))
            ->with(['area:id,name'])
            ->get(['id', 'code', 'name', 'area_id']);

        $totalCounts = SafetyCase::query()
            ->forOrganization($organizationId)
            ->when($siteId !== null, fn ($q) => $q->where('site_id', $siteId))
            ->select('machine_id', DB::raw('COUNT(*) as total'))
            ->groupBy('machine_id')
            ->pluck('total', 'machine_id');

        $openCounts = SafetyCase::query()
            ->forOrganization($organizationId)
            ->when($siteId !== null, fn ($q) => $q->where('site_id', $siteId))
            ->whereIn('status', CaseStatus::openValues())
            ->select('machine_id', DB::raw('COUNT(*) as total'))
            ->groupBy('machine_id')
            ->pluck('total', 'machine_id');

        $recentCounts = SafetyCase::query()
            ->forOrganization($organizationId)
            ->when($siteId !== null, fn ($q) => $q->where('site_id', $siteId))
            ->whereNotIn('status', [CaseStatus::Rejected->value, CaseStatus::Duplicate->value])
            ->where('reported_at', '>=', $windowStart)
            ->select('machine_id', DB::raw('COUNT(*) as total'))
            ->groupBy('machine_id')
            ->pluck('total', 'machine_id');

        return $machines->map(function (Machine $machine) use ($totalCounts, $openCounts, $recentCounts, $recurringThreshold): array {
            $casesLast90Days = (int) ($recentCounts[$machine->id] ?? 0);
            $isRecurring = $casesLast90Days >= $recurringThreshold;

            return [
                'machine_id' => $machine->id,
                'machine_code' => $machine->code,
                'machine_name' => $machine->name,
                'area_name' => $machine->area?->name,
                'total_cases' => (int) ($totalCounts[$machine->id] ?? 0),
                'open_cases' => (int) ($openCounts[$machine->id] ?? 0),
                'cases_last_90_days' => $casesLast90Days,
                'is_recurring' => $isRecurring,
                'recurring_label' => $isRecurring ? 'Berulang' : null,
            ];
        })->sortByDesc('total_cases');
    }

    private function buildCasesPerCategory(int $organizationId, ?int $siteId): Collection
    {
        $categories = Category::query()
            ->forOrganization($organizationId)
            ->pluck('name', 'id');

        $rows = SafetyCase::query()
            ->forOrganization($organizationId)
            ->when($siteId !== null, fn ($q) => $q->where('site_id', $siteId))
            ->select('category_id', DB::raw('COUNT(*) as total'))
            ->groupBy('category_id')
            ->get();

        return $rows->map(fn ($row): array => [
            'category_id' => $row->category_id,
            'category_name' => $row->category_id !== null
                ? ($categories[$row->category_id] ?? 'Lainnya')
                : 'Belum dikategorikan',
            'total_cases' => (int) $row->total,
        ])->sortByDesc('total_cases');
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function buildCasesByRiskLevel(Builder $baseCaseQuery): array
    {
        $counts = (clone $baseCaseQuery)
            ->select('risk_level', DB::raw('COUNT(*) as total'))
            ->groupBy('risk_level')
            ->pluck('total', 'risk_level');

        $result = [];
        foreach (RiskLevel::cases() as $level) {
            $result[] = [
                'risk_level' => $level->value,
                'label' => $level->label(),
                'total_cases' => (int) ($counts[$level->value] ?? 0),
            ];
        }

        $unassessed = (clone $baseCaseQuery)->whereNull('risk_level')->count();
        if ($unassessed > 0) {
            $result[] = [
                'risk_level' => null,
                'label' => 'Belum dinilai',
                'total_cases' => $unassessed,
            ];
        }

        return $result;
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function buildCasesByStatus(Builder $baseCaseQuery): array
    {
        $counts = (clone $baseCaseQuery)
            ->select('status', DB::raw('COUNT(*) as total'))
            ->groupBy('status')
            ->pluck('total', 'status');

        $result = [];
        foreach (CaseStatus::cases() as $status) {
            $result[] = [
                'status' => $status->value,
                'label' => $status->label(),
                'total_cases' => (int) ($counts[$status->value] ?? 0),
            ];
        }

        return $result;
    }
}

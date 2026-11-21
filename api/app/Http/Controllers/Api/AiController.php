<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Ai\DashboardSummaryRequest;
use App\Http\Requests\Ai\SimilarAnalysisRequest;
use App\Http\Requests\Ai\TriageSuggestionRequest;
use App\Models\SafetyCase;
use App\Models\Site;
use App\Services\Ai\AiRecommendationService;
use App\Services\DashboardService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class AiController extends Controller
{
    public function __construct(
        private readonly AiRecommendationService $ai,
        private readonly DashboardService $dashboard,
    ) {}

    public function triageSuggestion(TriageSuggestionRequest $request): JsonResponse
    {
        $case = $this->resolveCase($request);
        $data = $this->ai->suggestTriage($request->user(), $case, $request->validated());

        return response()->json([
            'data' => $data,
            'meta' => $this->meta(),
        ]);
    }

    public function similarAnalysis(SimilarAnalysisRequest $request): JsonResponse
    {
        $case = $this->resolveCase($request);
        $limit = (int) $request->integer('limit', 5);

        return response()->json([
            'data' => $this->ai->analyzeSimilarCases($request->user(), $case, $request->validated(), $limit),
            'meta' => $this->meta(),
        ]);
    }

    public function caseSimilarAnalysis(SimilarAnalysisRequest $request, SafetyCase $case): JsonResponse
    {
        Gate::authorize('view', $case);

        return response()->json([
            'data' => $this->ai->analyzeSimilarCases(
                $request->user(),
                $case,
                $request->validated(),
                (int) $request->integer('limit', 5),
            ),
            'meta' => $this->meta(),
        ]);
    }

    public function actionSuggestions(Request $request, SafetyCase $case): JsonResponse
    {
        Gate::authorize('manageActions', $case);

        return response()->json([
            'data' => $this->ai->suggestActions($case),
            'meta' => $this->meta(),
        ]);
    }

    public function dashboardSummary(DashboardSummaryRequest $request): JsonResponse
    {
        $organizationId = $request->user()->organization_id;
        $siteId = $request->filled('site_id') ? (int) $request->input('site_id') : null;

        if ($siteId !== null && ! Site::query()->forOrganization($organizationId)->whereKey($siteId)->exists()) {
            abort(403, 'Anda tidak memiliki akses ke site organisasi lain.');
        }

        $statistics = $this->compactStatistics(
            $this->dashboard->buildForOrganization($organizationId, $siteId),
        );

        return response()->json([
            'data' => $this->ai->summarizeDashboard(
                $statistics,
                $siteId,
                $request->boolean('refresh'),
            ),
            'meta' => $this->meta(),
        ]);
    }

    /**
     * @return array{generated_by: string, requires_review: bool}
     */
    private function meta(): array
    {
        return [
            'generated_by' => 'nexusrouter_ai',
            'requires_review' => true,
        ];
    }

    private function resolveCase(Request $request): ?SafetyCase
    {
        if (! $request->filled('case_id')) {
            return null;
        }

        $case = SafetyCase::query()->findOrFail((int) $request->input('case_id'));
        Gate::authorize('view', $case);

        return $case;
    }

    /**
     * Keep only actual aggregates produced by DashboardService.
     *
     * @param  array<string, mixed>  $dashboard
     * @return array<string, mixed>
     */
    private function compactStatistics(array $dashboard): array
    {
        $summary = $dashboard['summary'] ?? [];
        $asOf = now();

        return [
            'period' => [
                'scope' => 'all_available',
                'label' => 'Seluruh data yang tersedia pada organisasi/site terpilih',
                'closed_this_month_from' => $asOf->copy()->startOfMonth()->toIso8601String(),
                'recurring_window_days' => $dashboard['recurring_rule']['window_days'] ?? null,
            ],
            'metric_definitions' => [
                'total_cases' => 'Jumlah seluruh kasus dalam scope organisasi/site.',
                'open_cases' => 'Kasus dengan status terbuka menurut aturan aplikasi.',
                'overdue_actions' => 'Tindakan terbuka dengan tenggat sebelum waktu berjalan.',
                'closed_this_month' => 'Kasus selesai sejak awal bulan berjalan.',
                'pending_verification' => 'Kasus yang menunggu verifikasi independen.',
                'high_risk_open' => 'Kasus terbuka dengan tingkat risiko tinggi.',
                'recurring_machines' => 'Mesin dengan jumlah kasus melebihi ambang pada jendela hari terkonfigurasi.',
            ],
            'total_cases' => $summary['total_cases_count'] ?? 0,
            'open_cases' => $summary['open_cases_count'] ?? 0,
            'overdue_actions' => $summary['overdue_actions_count'] ?? 0,
            'closed_this_month' => $summary['closed_this_month_count'] ?? 0,
            'pending_verification' => $summary['pending_verification_count'] ?? 0,
            'high_risk_open' => $summary['high_risk_open_count'] ?? 0,
            'recurring_machines' => $summary['recurring_machines_count'] ?? 0,
            'cases_by_status' => $dashboard['cases_by_status'] ?? [],
            'cases_by_risk_level' => $dashboard['cases_by_risk_level'] ?? [],
            'top_categories' => collect($dashboard['cases_per_category'] ?? [])
                ->take(6)
                ->values()
                ->all(),
            'recurring_machines_detail' => collect($dashboard['cases_per_machine'] ?? [])
                ->filter(fn (array $machine) => ! empty($machine['is_recurring']))
                ->take(5)
                ->values()
                ->all(),
            'recurring_rule' => $dashboard['recurring_rule'] ?? [],
        ];
    }
}

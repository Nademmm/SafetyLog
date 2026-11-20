<?php

namespace App\Http\Controllers\Api;

use App\Enums\CaseStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Attachments\StoreAttachmentRequest;
use App\Http\Requests\Cases\ReopenSafetyCaseRequest;
use App\Http\Requests\Cases\StoreCaseActionRequest;
use App\Http\Requests\Cases\StoreRootCauseRequest;
use App\Http\Requests\Cases\StoreSafetyCaseRequest;
use App\Http\Requests\Cases\TriageSafetyCaseRequest;
use App\Http\Requests\Cases\VerifySafetyCaseRequest;
use App\Http\Resources\AttachmentResource;
use App\Http\Resources\CaseActionResource;
use App\Http\Resources\CaseStatusHistoryResource;
use App\Http\Resources\SafetyCaseResource;
use App\Http\Resources\SafetyCaseSummaryResource;
use App\Models\SafetyCase;
use App\Services\CaseSearchService;
use App\Services\CaseWorkflowService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

class SafetyCaseController extends Controller
{
    public function __construct(
        private readonly CaseWorkflowService $workflow,
        private readonly CaseSearchService $search,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        Gate::authorize('viewAny', SafetyCase::class);

        $perPage = min(100, max(1, (int) $request->integer('per_page', 15)));

        return SafetyCaseResource::collection(
            $this->search->searchCases($request->user(), $request->query(), $perPage, onlyOwnReports: false),
        );
    }

    public function myCases(Request $request): AnonymousResourceCollection
    {
        $perPage = min(100, max(1, (int) $request->integer('per_page', 15)));

        return SafetyCaseResource::collection(
            $this->search->searchCases($request->user(), $request->query(), $perPage, onlyOwnReports: true),
        );
    }

    public function store(StoreSafetyCaseRequest $request): JsonResponse
    {
        Gate::authorize('create', SafetyCase::class);

        $result = $this->workflow->reportCase(
            reporter: $request->user(),
            data: $request->validated(),
            photos: $this->extractUploadedPhotos($request),
        );

        return response()->json([
            'message' => 'Laporan berhasil dikirim.',
            'data' => new SafetyCaseResource($result['case']),
            'emergency_reminder' => $result['emergency_reminder'],
            'open_cases_warning' => [
                'has_open_cases' => $result['open_cases_warning']->isNotEmpty(),
                'count' => $result['open_cases_warning']->count(),
                'cases' => SafetyCaseSummaryResource::collection($result['open_cases_warning']),
            ],
        ], 201);
    }

    public function show(Request $request, SafetyCase $case): JsonResponse
    {
        Gate::authorize('view', $case);

        $case->load($this->workflow->caseDetailRelations());

        return response()->json([
            'data' => new SafetyCaseResource($case),
        ]);
    }

    public function summary(Request $request, SafetyCase $case): JsonResponse
    {
        Gate::authorize('viewSummary', $case);

        $case->load(['caseType:id,code,name', 'machine:id,code,name']);

        return response()->json([
            'data' => new SafetyCaseSummaryResource($case),
        ]);
    }

    public function triage(TriageSafetyCaseRequest $request, SafetyCase $case): JsonResponse
    {
        Gate::authorize('triage', $case);

        $result = $this->workflow->triageCase($request->user(), $case, $request->validated());

        return response()->json([
            'message' => 'Triase kasus berhasil disimpan.',
            'data' => new SafetyCaseResource($result['case']),
            'suggested_deadlines' => $result['suggested_deadlines'],
        ]);
    }

    public function analyzeRootCause(StoreRootCauseRequest $request, SafetyCase $case): JsonResponse
    {
        Gate::authorize('analyzeRootCause', $case);

        $updated = $this->workflow->analyzeRootCause($request->user(), $case, $request->validated());

        return response()->json([
            'message' => 'Analisis akar penyebab berhasil disimpan.',
            'data' => new SafetyCaseResource($updated),
        ]);
    }

    public function storeAction(StoreCaseActionRequest $request, SafetyCase $case): JsonResponse
    {
        Gate::authorize('manageActions', $case);

        $action = $this->workflow->addAction($request->user(), $case, $request->validated());
        $case->refresh();

        return response()->json([
            'message' => 'Tindakan berhasil ditambahkan.',
            'data' => new CaseActionResource($action),
            'case_status' => $case->status->value,
            'case_status_label' => $case->status->label(),
        ], 201);
    }

    public function verify(VerifySafetyCaseRequest $request, SafetyCase $case): JsonResponse
    {
        Gate::authorize('verify', $case);

        $updated = $this->workflow->verifyCase($request->user(), $case, $request->validated());

        $message = $updated->status === CaseStatus::Closed
            ? 'Kasus berhasil diverifikasi dan ditutup.'
            : 'Verifikasi ditolak. Kasus dikembalikan ke Tindakan berjalan.';

        return response()->json([
            'message' => $message,
            'data' => new SafetyCaseResource($updated),
        ]);
    }

    public function reopen(ReopenSafetyCaseRequest $request, SafetyCase $case): JsonResponse
    {
        Gate::authorize('reopen', $case);

        $updated = $this->workflow->reopenCase($request->user(), $case, $request->validated());

        return response()->json([
            'message' => 'Kasus berhasil dibuka ulang dan dikembalikan ke Tindakan berjalan.',
            'data' => new SafetyCaseResource($updated),
        ]);
    }

    public function similar(Request $request, SafetyCase $case): JsonResponse
    {
        Gate::authorize('viewAny', SafetyCase::class);
        Gate::authorize('view', $case);

        $limit = min(10, max(1, (int) $request->integer('limit', 5)));
        $similar = $this->search->findSimilarCases($case, $limit);

        return response()->json([
            'case_id' => $case->id,
            'method' => 'text_similarity',
            'data' => $similar,
        ]);
    }

    public function histories(Request $request, SafetyCase $case): JsonResponse
    {
        Gate::authorize('view', $case);

        $histories = $case->statusHistories()->with('changedBy:id,name,email,role')->get();

        return response()->json([
            'data' => CaseStatusHistoryResource::collection($histories),
        ]);
    }

    public function storeAttachments(StoreAttachmentRequest $request, SafetyCase $case): JsonResponse
    {
        Gate::authorize('uploadAttachment', $case);

        $attachments = $this->workflow->attachPhotosToCase(
            actor: $request->user(),
            case: $case,
            photos: $this->extractUploadedPhotos($request),
        );

        return response()->json([
            'message' => 'Foto lampiran berhasil diunggah.',
            'data' => AttachmentResource::collection($attachments),
        ], 201);
    }
}

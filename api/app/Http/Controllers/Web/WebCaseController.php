<?php

namespace App\Http\Controllers\Web;

use App\Enums\ActionStatus;
use App\Enums\CaseStatus;
use App\Enums\RiskLevel;
use App\Http\Controllers\Api\AttachmentController;
use App\Http\Controllers\Controller;
use App\Models\Attachment;
use App\Models\CaseAction;
use App\Models\CaseType;
use App\Models\Category;
use App\Models\Configuration;
use App\Models\Machine;
use App\Models\RiskConfig;
use App\Models\SafetyCase;
use App\Models\User;
use App\Services\CaseSearchService;
use App\Services\CaseWorkflowService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\View\View;
use Symfony\Component\HttpFoundation\StreamedResponse;

class WebCaseController extends Controller
{
    public function __construct(
        private readonly CaseWorkflowService $workflow,
        private readonly CaseSearchService $search,
    ) {}

    public function create(Request $request): View
    {
        /** @var User $user */
        $user = $request->user();
        $orgId = (int) $user->organization_id;

        $machines = Machine::query()
            ->forOrganization($orgId)
            ->active()
            ->with(['site:id,name,code', 'area:id,name,code'])
            ->orderBy('name')
            ->get();

        $caseTypes = CaseType::query()
            ->forOrganization($orgId)
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->get();

        $selectedMachine = null;
        $qrError = null;
        $qrToken = trim((string) $request->query('qr', ''));

        if ($qrToken !== '') {
            $qrMachine = Machine::query()
                ->where('qr_token', $qrToken)
                ->with(['site:id,name,code', 'area:id,name,code'])
                ->first();

            if (! $qrMachine) {
                $qrError = 'Kode QR mesin tidak ditemukan.';
            } elseif ($qrMachine->organization_id !== $orgId) {
                abort(403, 'Anda tidak memiliki akses ke mesin organisasi lain.');
            } elseif (! $qrMachine->is_active || $qrMachine->archived_at !== null) {
                $qrError = 'Mesin dari QR ini sudah diarsipkan dan tidak dapat dipilih.';
            } else {
                $selectedMachine = $qrMachine;
            }
        }

        $openCasesWarning = $selectedMachine
            ? $this->workflow->getOpenCasesForMachine($selectedMachine)
            : collect();

        return view('cases.create', [
            'title' => 'Lapor Kasus Baru | SafetyLog',
            'user' => $request->session()->get('sl_user'),
            'machines' => $machines,
            'caseTypes' => $caseTypes,
            'selectedMachine' => $selectedMachine,
            'qrError' => $qrError,
            'openCasesWarning' => $openCasesWarning,
        ]);
    }

    public function myCases(Request $request): View
    {
        /** @var User $user */
        $user = $request->user();
        $cases = $this->search->searchCases($user, $request->query(), 15, onlyOwnReports: true);
        $cases->appends($request->query());

        return view('cases.my-cases', [
            'title' => 'Laporan Saya | SafetyLog',
            'user' => $request->session()->get('sl_user'),
            'cases' => $cases,
            'filters' => $request->query(),
            'statuses' => CaseStatus::cases(),
        ]);
    }

    public function index(Request $request): View
    {
        /** @var User $user */
        $user = $request->user();
        $orgId = (int) $user->organization_id;

        $cases = $this->search->searchCases($user, $request->query(), 15, onlyOwnReports: false);
        $cases->appends($request->query());

        return view('cases.index', [
            'title' => 'Antrean & Pencarian Kasus | SafetyLog',
            'user' => $request->session()->get('sl_user'),
            'cases' => $cases,
            'filters' => $request->query(),
            'statuses' => CaseStatus::cases(),
            'riskLevels' => RiskLevel::cases(),
            'machines' => Machine::query()->forOrganization($orgId)->active()->orderBy('name')->get(['id', 'code', 'name']),
            'categories' => Category::query()->forOrganization($orgId)->where('is_active', true)->orderBy('sort_order')->get(['id', 'name']),
        ]);
    }

    public function show(Request $request, SafetyCase $case): View
    {
        Gate::authorize('view', $case);

        /** @var User $user */
        $user = $request->user();
        $orgId = (int) $user->organization_id;

        $case->load($this->workflow->caseDetailRelations());

        $assignableUsers = $user->role->canManageActions()
            ? User::query()->forOrganization($orgId)->where('is_active', true)->orderBy('name')->get(['id', 'name', 'role', 'job_title'])
            : collect();

        $categories = Category::query()
            ->forOrganization($orgId)
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->get(['id', 'name']);

        $riskConfigs = RiskConfig::query()
            ->forOrganization($orgId)
            ->orderBy('min_score')
            ->get();

        $maxScale = max(1, (int) Configuration::getValue($orgId, 'risk_matrix_max_scale', 5));
        $rootCauseCategories = (array) Configuration::getValue(
            $orgId,
            'root_cause_categories',
            ['Manusia', 'Mesin', 'Metode', 'Material', 'Pengukuran', 'Lingkungan'],
        );

        $otherOrgCases = $user->role->canTriage()
            ? SafetyCase::query()->forOrganization($orgId)->whereKeyNot($case->id)->latest('reported_at')->limit(30)->get(['id', 'case_number', 'description'])
            : collect();

        $similarCases = $this->search->findSimilarCases($case, 5);

        $isPicOnCase = $case->assigned_pic_id === $user->id
            || $case->actions->contains('pic_user_id', $user->id);

        return view('cases.show', [
            'title' => "{$case->case_number} | Detail Kasus | SafetyLog",
            'user' => $request->session()->get('sl_user'),
            'case' => $case,
            'assignableUsers' => $assignableUsers,
            'categories' => $categories,
            'riskConfigs' => $riskConfigs,
            'maxScale' => $maxScale,
            'rootCauseCategories' => $rootCauseCategories,
            'otherOrgCases' => $otherOrgCases,
            'similarCases' => $similarCases,
            'isPicOnCase' => $isPicOnCase,
        ]);
    }

    public function myActions(Request $request): View
    {
        /** @var User $user */
        $user = $request->user();
        $statusFilter = (string) $request->query('status', ActionStatus::Open->value);

        $query = CaseAction::query()
            ->forOrganization($user->organization_id)
            ->where('pic_user_id', $user->id)
            ->with([
                'safetyCase:id,case_number,status,risk_level,is_locked,machine_id',
                'safetyCase.machine:id,code,name',
                'attachments',
            ])
            ->orderBy('due_at')
            ->orderBy('id');

        if ($statusFilter !== 'all') {
            $query->where('status', $statusFilter);
        }

        if ($request->boolean('overdue')) {
            $query->where('status', ActionStatus::Open->value)
                ->where('due_at', '<', now());
        }

        return view('actions.my-actions', [
            'title' => 'Tindakan Saya | SafetyLog',
            'user' => $request->session()->get('sl_user'),
            'actions' => $query->paginate(20)->withQueryString(),
            'statusFilter' => $statusFilter,
            'onlyOverdue' => $request->boolean('overdue'),
        ]);
    }

    public function attachment(Request $request, Attachment $attachment): StreamedResponse
    {
        return app(AttachmentController::class)->show($request, $attachment);
    }
}

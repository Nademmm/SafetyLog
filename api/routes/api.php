<?php

use App\Http\Controllers\Api\AiController;
use App\Http\Controllers\Api\AreaController;
use App\Http\Controllers\Api\AttachmentController;
use App\Http\Controllers\Api\AuditLogController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CaseActionController;
use App\Http\Controllers\Api\ConfigurationController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\MachineController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\ReferenceController;
use App\Http\Controllers\Api\SafetyCaseController;
use App\Http\Controllers\Api\UserManagementController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Route;

Route::get('/health', fn () => response()->json([
    'status' => 'ok',
    'service' => 'safetylog-api',
    'version' => '0.1.0',
]));

// Setup & Migration helper for hosting without terminal (protected by APP_SETUP_KEY)
Route::get('/system/setup', function (Request $request) {
    $expectedKey = env('APP_SETUP_KEY');
    if (empty($expectedKey) || $request->query('key') !== $expectedKey) {
        return response()->json(['error' => 'Akses ditolak.'], 403);
    }

    Artisan::call('migrate', ['--force' => true]);
    $migrate = Artisan::output();

    $seedOutput = null;
    if ($request->query('seed') === 'demo') {
        Artisan::call('db:seed', [
            '--class' => 'Database\\Seeders\\DemoSeeder',
            '--force' => true,
        ]);
        $seedOutput = Artisan::output();
    } elseif ($request->query('seed') === '1' || $request->query('seed') === 'true') {
        Artisan::call('db:seed', ['--force' => true]);
        $seedOutput = Artisan::output();
    }

    Artisan::call('storage:link');
    $storage = Artisan::output();

    return response()->json([
        'status' => 'success',
        'message' => 'Migrasi, storage link, dan inisialisasi data berhasil dijalankan.',
        'migrate' => $migrate,
        'seed' => $seedOutput,
        'storage' => $storage,
    ]);
});

Route::prefix('auth')->group(function (): void {
    Route::post('/login', [AuthController::class, 'login']);

    Route::middleware(['auth:sanctum', 'role'])->group(function (): void {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::post('/logout-all', [AuthController::class, 'logoutAll']);
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/change-password', [AuthController::class, 'changePassword'])
            ->middleware('throttle:10,1');
    });
});

Route::middleware(['auth:sanctum', 'role'])->group(function (): void {
    // Reference data & lookups for forms
    Route::get('/reference-data', [ReferenceController::class, 'index']);
    Route::get('/users/assignable', [ReferenceController::class, 'assignableUsers'])
        ->middleware('role:supervisor,hse,admin');

    // Machines & QR lookup (B-06, B-08, B-10, B-20)
    Route::get('/machines', [MachineController::class, 'index']);
    Route::get('/machines/qr/{qrToken}', [MachineController::class, 'showByQrToken']);
    Route::get('/machines/{machine}/open-cases', [MachineController::class, 'openCases']);
    Route::get('/machines/{machine}/cases', [MachineController::class, 'cases'])
        ->middleware('role:supervisor,hse,admin');

    // Cases: Capture, Triage Queue, Search, 5 Why/6M, Actions, Verify, Reopen, Similar (B-08..B-22)
    Route::get('/my-cases', [SafetyCaseController::class, 'myCases']);
    Route::get('/cases', [SafetyCaseController::class, 'index'])
        ->middleware('role:supervisor,hse,admin');
    Route::post('/cases', [SafetyCaseController::class, 'store']);
    Route::get('/cases/{case}', [SafetyCaseController::class, 'show']);
    Route::get('/cases/{case}/summary', [SafetyCaseController::class, 'summary']);
    Route::get('/cases/{case}/similar', [SafetyCaseController::class, 'similar'])
        ->middleware('role:supervisor,hse,admin');
    Route::get('/cases/{case}/histories', [SafetyCaseController::class, 'histories']);
    Route::post('/cases/{case}/attachments', [SafetyCaseController::class, 'storeAttachments']);
    Route::post('/cases/{case}/triage', [SafetyCaseController::class, 'triage'])
        ->middleware('role:supervisor,admin');
    Route::post('/cases/{case}/root-cause', [SafetyCaseController::class, 'analyzeRootCause']);
    Route::post('/cases/{case}/actions', [SafetyCaseController::class, 'storeAction'])
        ->middleware('role:supervisor,hse,admin');
    Route::post('/cases/{case}/verify', [SafetyCaseController::class, 'verify'])
        ->middleware('role:hse,admin');
    Route::post('/cases/{case}/reopen', [SafetyCaseController::class, 'reopen'])
        ->middleware('role:hse,admin');

    // Actions: My Actions, Edit, Complete, Reopen, Proof Photos (B-14, B-15)
    Route::get('/my-actions', [CaseActionController::class, 'myActions']);
    Route::patch('/actions/{action}', [CaseActionController::class, 'update'])
        ->middleware('role:supervisor,hse,admin');
    Route::post('/actions/{action}/complete', [CaseActionController::class, 'complete']);
    Route::post('/actions/{action}/reopen', [CaseActionController::class, 'reopen'])
        ->middleware('role:hse,admin');
    Route::post('/actions/{action}/attachments', [CaseActionController::class, 'storeAttachments']);

    // Authorized attachment streaming & deletion (B-08, B-09, B-15)
    Route::get('/attachments/{attachment}', [AttachmentController::class, 'show']);
    Route::delete('/attachments/{attachment}', [AttachmentController::class, 'destroy']);

    // AI assistant (AI-01, AI-02, AI-04, AI-06): recommendations only, never auto-applied
    Route::post('/ai/triage-suggestion', [AiController::class, 'triageSuggestion'])
        ->middleware('throttle:ai');
    Route::post('/ai/similar-analysis', [AiController::class, 'similarAnalysis'])
        ->middleware('throttle:ai');
    Route::post('/cases/{case}/similar-analysis', [AiController::class, 'caseSimilarAnalysis'])
        ->middleware('throttle:ai');
    Route::post('/cases/{case}/action-suggestions', [AiController::class, 'actionSuggestions'])
        ->middleware(['role:supervisor,hse,admin', 'throttle:ai']);
    Route::post('/ai/dashboard-summary', [AiController::class, 'dashboardSummary'])
        ->middleware(['role:supervisor,hse,admin', 'throttle:ai']);

    // Dashboard & Audit Logs (B-21, B-22, C-01)
    Route::get('/dashboard', [DashboardController::class, 'index'])
        ->middleware('role:supervisor,hse,admin');
    Route::get('/audit-logs', [AuditLogController::class, 'index'])
        ->middleware('role:supervisor,hse,admin');

    // In-app Notifications (B-18)
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::post('/notifications/read-all', [NotificationController::class, 'markAllRead']);
    Route::post('/notifications/{notification}/read', [NotificationController::class, 'markRead']);

    // Admin Master Data & Dynamic Configuration (B-06, Section 9)
    Route::middleware('role:admin')->group(function (): void {
        Route::get('/sites', [AreaController::class, 'sites']);
        Route::post('/sites', [AreaController::class, 'storeSite']);
        Route::patch('/sites/{site}', [AreaController::class, 'updateSite']);
        Route::post('/sites/{site}/archive', [AreaController::class, 'archiveSite']);
        Route::get('/areas', [AreaController::class, 'index']);
        Route::post('/areas', [AreaController::class, 'store']);
        Route::patch('/areas/{area}', [AreaController::class, 'update']);
        Route::post('/areas/{area}/archive', [AreaController::class, 'archive']);

        Route::post('/machines', [MachineController::class, 'store']);
        Route::patch('/machines/{machine}', [MachineController::class, 'update']);
        Route::post('/machines/{machine}/archive', [MachineController::class, 'archive']);
        Route::post('/machines/{machine}/regenerate-qr', [MachineController::class, 'regenerateQr']);

        Route::get('/users', [UserManagementController::class, 'index']);
        Route::post('/users', [UserManagementController::class, 'store']);
        Route::patch('/users/{user}', [UserManagementController::class, 'update']);

        Route::patch('/risk-configs/{riskConfig}', [ConfigurationController::class, 'updateRiskConfig']);
        Route::put('/configurations/{key}', [ConfigurationController::class, 'updateConfiguration']);
    });
});

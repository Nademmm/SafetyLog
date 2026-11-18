<?php

use App\Http\Controllers\Web\WebAdminController;
use App\Http\Controllers\Web\WebCaseController;
use App\Http\Controllers\Web\WebController;
use Illuminate\Support\Facades\Route;

Route::get('/', [WebController::class, 'login'])->name('web.home');

// Auth (B-05)
Route::get('/login', [WebController::class, 'login'])->name('web.login');
Route::post('/login', [WebController::class, 'loginPost'])->name('web.login.post');
Route::post('/logout', [WebController::class, 'logout'])->name('web.logout');

// Routes guarded by authenticated Sanctum session (B-05)
Route::middleware('web.auth')->group(function (): void {
    // Semua peran yang login
    Route::get('/dashboard', [WebController::class, 'dashboard'])->name('web.dashboard');
    Route::get('/cases/create', [WebCaseController::class, 'create'])->name('web.cases.create');
    Route::get('/my-cases', [WebCaseController::class, 'myCases'])->name('web.my-cases');
    Route::get('/my-actions', [WebCaseController::class, 'myActions'])->name('web.my-actions');
    Route::get('/notifications', [WebController::class, 'notifications'])->name('web.notifications');
    Route::get('/attachments/{attachment}', [WebCaseController::class, 'attachment'])->name('web.attachments.show');

    // Antrean triase, pencarian kasus, & audit log (Supervisor, K3/Verifikator, Manajer/Admin — Pelapor ditolak 403)
    Route::middleware('web.role:supervisor,hse,admin')->group(function (): void {
        Route::get('/cases', [WebCaseController::class, 'index'])->name('web.cases.index');
        Route::get('/audit-logs', [WebController::class, 'auditLogs'])->name('web.audit-logs');
    });

    // Detail kasus (otorisasi terperinci melalui SafetyCasePolicy::view)
    Route::get('/cases/{case}', [WebCaseController::class, 'show'])
        ->whereNumber('case')
        ->name('web.cases.show');

    // Khusus Manajer/Admin (peran lain ditolak HTTP 403)
    Route::middleware('web.role:admin')->group(function (): void {
        Route::get('/sites', [WebAdminController::class, 'sites'])->name('web.sites');
        Route::get('/areas', [WebAdminController::class, 'areas'])->name('web.areas');
        Route::get('/machines', [WebAdminController::class, 'machines'])->name('web.machines');
        Route::get('/users', [WebAdminController::class, 'users'])->name('web.users');
        Route::get('/configurations', [WebAdminController::class, 'configurations'])->name('web.configurations');
    });
});

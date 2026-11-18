<?php

use App\Http\Controllers\Web\WebController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

// ============================================================
// Web routes untuk B-05 (Login & 4 peran) dan B-06 (Area & Mesin)
// ============================================================

// Auth
Route::get('/login', [WebController::class, 'login'])->name('web.login');
Route::post('/login', [WebController::class, 'loginPost'])->name('web.login.post');
Route::post('/logout', [WebController::class, 'logout'])->name('web.logout');

// Dashboard (semua role yang login)
Route::get('/dashboard', [WebController::class, 'dashboard'])->name('web.dashboard');

// Area & Mesin (admin only)
Route::get('/areas', [WebController::class, 'areas'])->name('web.areas');
Route::get('/machines', [WebController::class, 'machines'])->name('web.machines');
Route::get('/sites', [WebController::class, 'sites'])->name('web.sites');


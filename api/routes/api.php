<?php

use App\Http\Controllers\Api\AiStreamController;
use App\Http\Controllers\Api\AlertController;
use App\Http\Controllers\Api\AuditLogController;
use App\Http\Controllers\Api\CameraController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\RoleController;
use App\Http\Controllers\Api\SettingController;
use App\Http\Controllers\Api\SystemHealthController;
use App\Http\Controllers\Api\StatController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// ─── AI streams (proxy Flask :5000 — avoids Vite /ai 404 issues) ─────────────
Route::prefix('ai')->group(function () {
    Route::get('/health', [AiStreamController::class, 'health']);
    Route::get('/video-feed', [AiStreamController::class, 'videoFeed']);
    Route::get('/video-feed-lite', [AiStreamController::class, 'videoFeedLite']);
    Route::get('/live-preview', [AiStreamController::class, 'livePreview']);
});

// ─── Dashboard (real-time aggregated stats) ──────────────────────────────────
Route::get('/dashboard', [DashboardController::class, 'index']);
Route::get('/landing-stats', [DashboardController::class, 'landingStats']);
Route::post('/demo-bookings', [DashboardController::class, 'storeDemoBooking']);
Route::post('/pricing-requests', [DashboardController::class, 'storePricingRequest']);

// ─── Cameras ─────────────────────────────────────────────────────────────────
Route::apiResource('cameras', CameraController::class);
Route::get('cameras/{camera}/stats', [CameraController::class, 'stats']);

// ─── Stats (raw time-series) ──────────────────────────────────────────────────
Route::apiResource('stats', StatController::class)->only(['index', 'store', 'show']);

// ─── Alerts ──────────────────────────────────────────────────────────────────
Route::apiResource('alerts', AlertController::class);

// ─── Users & Roles ───────────────────────────────────────────────────────────
Route::apiResource('users', UserController::class);
Route::apiResource('roles', RoleController::class);
Route::apiResource('audit-logs', AuditLogController::class)->only(['index', 'store']);

// ─── Settings & System Health ────────────────────────────────────────────────
Route::get('settings', [SettingController::class, 'index']);
Route::post('settings', [SettingController::class, 'store']);
Route::get('system/health', [SystemHealthController::class, 'index']);

// ─── Auth (Sanctum protected) ────────────────────────────────────────────────
Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

Route::post('/login', function (Request $request) {
    $credentials = $request->validate([
        'email' => 'required|email',
        'password' => 'required|string',
    ]);

    $user = \App\Models\User::where('email', $credentials['email'])->first();

    if (!$user || !\Illuminate\Support\Facades\Hash::check($credentials['password'], $user->password)) {
        return response()->json(['message' => 'Invalid credentials. Please try again.'], 401);
    }

    if (!$user->active) {
        return response()->json(['message' => 'This account has been deactivated.'], 403);
    }

    $user->update(['last_active_at' => now()]);

    return response()->json($user);
});


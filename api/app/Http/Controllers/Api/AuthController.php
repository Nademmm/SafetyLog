<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ChangePasswordRequest;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    private const MAX_LOGIN_ATTEMPTS = 5;

    private const MAX_IP_ATTEMPTS = 20;

    private const DECAY_SECONDS = 60;

    public function login(LoginRequest $request): JsonResponse
    {
        $email = Str::lower(trim((string) $request->validated('email')));
        $ip = (string) $request->ip();
        $throttleKey = Str::transliterate($email.'|'.$ip);
        $ipThrottleKey = 'login-ip|'.$ip;

        if (RateLimiter::tooManyAttempts($ipThrottleKey, self::MAX_IP_ATTEMPTS)) {
            $seconds = RateLimiter::availableIn($ipThrottleKey);

            return response()->json([
                'message' => "Terlalu banyak percobaan login dari alamat IP ini. Coba lagi dalam {$seconds} detik.",
                'retry_after' => $seconds,
            ], 429);
        }

        if (RateLimiter::tooManyAttempts($throttleKey, self::MAX_LOGIN_ATTEMPTS)) {
            $seconds = RateLimiter::availableIn($throttleKey);

            return response()->json([
                'message' => "Terlalu banyak percobaan login gagal. Silakan coba lagi dalam {$seconds} detik.",
                'retry_after' => $seconds,
            ], 429);
        }

        /** @var User|null $user */
        $user = User::query()
            ->with(['organization', 'site'])
            ->where('email', $email)
            ->first();

        if (! $user || ! Hash::check((string) $request->validated('password'), $user->password)) {
            RateLimiter::hit($throttleKey, self::DECAY_SECONDS);
            RateLimiter::hit($ipThrottleKey, self::DECAY_SECONDS);

            return response()->json([
                'message' => 'Email atau password salah.',
            ], 422);
        }

        if (! $user->is_active || ! $user->organization || ! $user->organization->is_active) {
            return response()->json([
                'message' => 'Akun atau organisasi Anda sedang tidak aktif.',
            ], 403);
        }

        RateLimiter::clear($throttleKey);

        $deviceName = (string) ($request->validated('device_name') ?: 'safetylog-web');
        $token = $user->createToken($deviceName)->plainTextToken;

        return response()->json([
            'message' => 'Login berhasil.',
            'token' => $token,
            'token_type' => 'Bearer',
            'user' => new UserResource($user),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $token = $request->user()?->currentAccessToken();
        if ($token && method_exists($token, 'delete')) {
            $token->delete();
        }

        return response()->json([
            'message' => 'Logout berhasil.',
        ]);
    }

    public function logoutAll(Request $request): JsonResponse
    {
        $request->user()?->tokens()->delete();

        return response()->json([
            'message' => 'Seluruh sesi perangkat berhasil dikeluarkan.',
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user()?->loadMissing(['organization', 'site']);

        return response()->json([
            'user' => new UserResource($user),
        ]);
    }

    public function changePassword(ChangePasswordRequest $request): JsonResponse
    {
        $user = $request->user();

        if (! Hash::check((string) $request->validated('current_password'), $user->password)) {
            return response()->json([
                'message' => 'Password saat ini tidak sesuai.',
                'errors' => [
                    'current_password' => ['Password saat ini tidak sesuai.'],
                ],
            ], 422);
        }

        $user->update([
            'password' => Hash::make((string) $request->validated('password')),
        ]);

        $currentTokenId = $user->currentAccessToken()?->id;
        $user->tokens()
            ->when($currentTokenId !== null, fn ($q) => $q->where('id', '!=', $currentTokenId))
            ->delete();

        return response()->json([
            'message' => 'Password berhasil diperbarui.',
        ]);
    }
}

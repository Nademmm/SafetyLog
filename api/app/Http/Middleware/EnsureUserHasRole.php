<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserHasRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (! $user) {
            return response()->json(['message' => 'Silakan login terlebih dahulu.'], 401);
        }

        if (! $user->is_active || ! $user->organization || ! $user->organization->is_active) {
            return response()->json(['message' => 'Akun atau organisasi Anda sedang tidak aktif.'], 403);
        }

        if ($roles !== [] && ! in_array($user->role->value, $roles, true)) {
            return response()->json([
                'message' => 'Anda tidak memiliki hak akses untuk tindakan ini.',
            ], 403);
        }

        return $next($request);
    }
}

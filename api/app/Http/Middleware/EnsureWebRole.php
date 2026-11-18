<?php

namespace App\Http\Middleware;

use App\Enums\UserRole;
use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Enforces role-based authorization on Blade web routes and returns HTTP 403 when denied.
 */
class EnsureWebRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (! $user instanceof User) {
            return redirect()->route('web.login');
        }

        if ($roles !== [] && ! in_array($user->role->value, $roles, true)) {
            $allowedLabels = array_map(
                fn (string $role) => UserRole::tryFrom($role)?->label() ?? $role,
                $roles,
            );

            return response()->view('errors.403', [
                'title' => 'Akses Ditolak (403) | SafetyLog',
                'user' => $request->session()->get('sl_user'),
                'requestedPath' => '/'.ltrim($request->path(), '/'),
                'allowedRoles' => $allowedLabels,
            ], 403);
        }

        return $next($request);
    }
}

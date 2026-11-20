<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\View;
use Laravel\Sanctum\PersonalAccessToken;
use Symfony\Component\HttpFoundation\Response;

/**
 * Authenticates Blade web requests against a live Sanctum token stored in session.
 */
class EnsureWebAuthenticated
{
    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->session()->get('sl_token');

        if (! is_string($token) || $token === '') {
            Auth::forgetGuards();

            return $this->redirectToLogin($request);
        }

        $accessToken = PersonalAccessToken::findToken($token);
        $user = $accessToken?->tokenable;
        $expirationMinutes = config('sanctum.expiration');
        $isExpired = $accessToken && (
            ($accessToken->expires_at !== null && $accessToken->expires_at->isPast())
            || (is_numeric($expirationMinutes) && $accessToken->created_at?->lte(now()->subMinutes((int) $expirationMinutes)))
        );

        if (! $accessToken || $isExpired || ! $user instanceof User) {
            Auth::forgetGuards();
            if ($accessToken && $isExpired) {
                $accessToken->delete();
            }
            $request->session()->forget(['sl_token', 'sl_user']);

            return $this->redirectToLogin($request);
        }

        $user->loadMissing(['organization', 'site']);

        if (! $user->is_active || ! $user->organization || ! $user->organization->is_active) {
            Auth::forgetGuards();
            $accessToken->delete();
            $request->session()->forget(['sl_token', 'sl_user']);
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return redirect()
                ->route('web.login')
                ->with('error', 'Akun atau organisasi Anda sedang tidak aktif.');
        }

        $sessionUser = [
            'id' => $user->id,
            'organization_id' => $user->organization_id,
            'organization_name' => $user->organization->name,
            'site_id' => $user->site_id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role->value,
            'role_label' => $user->role->label(),
            'permissions' => $user->role->permissions(),
        ];

        $request->session()->put('sl_user', $sessionUser);
        $request->setUserResolver(fn () => $user);
        Auth::setUser($user);
        View::share('currentUser', $sessionUser);
        View::share('currentUserModel', $user);

        return $next($request);
    }

    private function redirectToLogin(Request $request): Response
    {
        if ($request->isMethod('GET')) {
            $request->session()->put('sl_return_url', $request->getRequestUri());
        }

        return redirect()->route('web.login');
    }
}

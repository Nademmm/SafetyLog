<?php

namespace App\Http\Controllers\Web;

use App\Enums\ActionStatus;
use App\Enums\CaseStatus;
use App\Http\Controllers\Controller;
use App\Models\AppNotification;
use App\Models\CaseAction;
use App\Models\CaseStatusHistory;
use App\Models\SafetyCase;
use App\Models\User;
use App\Services\DashboardService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\View\View;
use Laravel\Sanctum\PersonalAccessToken;

class WebController extends Controller
{
    private const MAX_LOGIN_ATTEMPTS = 5;

    private const MAX_IP_ATTEMPTS = 20;

    private const DECAY_SECONDS = 60;

    public function __construct(
        private readonly DashboardService $dashboardService,
    ) {}

    public function login(Request $request): View|RedirectResponse
    {
        $token = $request->session()->get('sl_token');
        if (is_string($token) && $token !== '') {
            $accessToken = PersonalAccessToken::findToken($token);
            $tokenUser = $accessToken?->tokenable;

            if ($tokenUser instanceof User && $tokenUser->is_active && $tokenUser->organization?->is_active) {
                return redirect()->route('web.dashboard');
            }

            if ($accessToken) {
                $accessToken->delete();
            }
            $request->session()->forget(['sl_token', 'sl_user']);
        }

        $returnUrl = $request->query('return_url');
        if (is_string($returnUrl) && $this->isSafeReturnUrl($returnUrl)) {
            $request->session()->put('sl_return_url', $returnUrl);
        }

        return view('auth.login');
    }

    public function loginPost(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ], [
            'email.required' => 'Email wajib diisi.',
            'email.email' => 'Format email tidak valid.',
            'password.required' => 'Password wajib diisi.',
        ]);

        $email = Str::lower(trim((string) $validated['email']));
        $ip = (string) $request->ip();
        $throttleKey = Str::transliterate($email.'|'.$ip);
        $ipThrottleKey = 'web-login-ip|'.$ip;

        if (RateLimiter::tooManyAttempts($ipThrottleKey, self::MAX_IP_ATTEMPTS)) {
            $seconds = RateLimiter::availableIn($ipThrottleKey);

            return back()
                ->with('rate_limit', $seconds)
                ->withErrors(['email' => "Terlalu banyak percobaan login dari IP ini. Silakan coba lagi dalam {$seconds} detik."])
                ->withInput($request->only('email'));
        }

        if (RateLimiter::tooManyAttempts($throttleKey, self::MAX_LOGIN_ATTEMPTS)) {
            $seconds = RateLimiter::availableIn($throttleKey);

            return back()
                ->with('rate_limit', $seconds)
                ->withErrors(['email' => "Terlalu banyak percobaan login gagal. Silakan coba lagi dalam {$seconds} detik."])
                ->withInput($request->only('email'));
        }

        /** @var User|null $user */
        $user = User::query()
            ->with(['organization', 'site'])
            ->where('email', $email)
            ->first();

        if (! $user || ! Hash::check((string) $validated['password'], $user->password)) {
            RateLimiter::hit($throttleKey, self::DECAY_SECONDS);
            RateLimiter::hit($ipThrottleKey, self::DECAY_SECONDS);

            return back()
                ->withErrors(['email' => 'Email atau password salah.'])
                ->withInput($request->only('email'));
        }

        if (! $user->is_active || ($user->organization && ! $user->organization->is_active)) {
            return back()
                ->withErrors(['email' => 'Akun atau organisasi Anda sedang tidak aktif.'])
                ->withInput($request->only('email'));
        }

        RateLimiter::clear($throttleKey);

        $returnUrl = $request->session()->pull('sl_return_url');
        $request->session()->regenerate();

        $token = $user->createToken('web_session')->plainTextToken;

        $request->session()->put('sl_token', $token);
        $request->session()->put('sl_user', [
            'id' => $user->id,
            'organization_id' => $user->organization_id,
            'organization_name' => $user->organization?->name ?? 'SafetyLog',
            'site_id' => $user->site_id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role->value,
            'role_label' => $user->role->label(),
            'permissions' => $user->role->permissions(),
        ]);

        if (is_string($returnUrl) && $this->isSafeReturnUrl($returnUrl)) {
            return redirect($returnUrl);
        }

        return redirect()->route('web.dashboard');
    }

    public function dashboard(Request $request): View
    {
        /** @var User $user */
        $user = $request->user();
        $orgId = (int) $user->organization_id;

        $unreadNotifications = AppNotification::query()
            ->forOrganization($orgId)
            ->where('user_id', $user->id)
            ->whereNull('read_at')
            ->count();

        $myOpenActions = CaseAction::query()
            ->forOrganization($orgId)
            ->where('pic_user_id', $user->id)
            ->where('status', ActionStatus::Open->value)
            ->with(['safetyCase:id,case_number,machine_id', 'safetyCase.machine:id,name,code'])
            ->orderBy('due_at')
            ->limit(5)
            ->get();

        $myOpenActionsCount = CaseAction::query()
            ->forOrganization($orgId)
            ->where('pic_user_id', $user->id)
            ->where('status', ActionStatus::Open->value)
            ->count();

        $myOverdueActionsCount = CaseAction::query()
            ->forOrganization($orgId)
            ->where('pic_user_id', $user->id)
            ->where('status', ActionStatus::Open->value)
            ->where('due_at', '<', now())
            ->count();

        $myReportedOpenCount = SafetyCase::query()
            ->forOrganization($orgId)
            ->where('reporter_id', $user->id)
            ->whereIn('status', CaseStatus::openValues())
            ->count();

        $dashboardData = null;
        $newCasesQueueCount = 0;

        if ($user->role->canViewDashboard()) {
            $dashboardData = $this->dashboardService->buildForOrganization($orgId);
            $newCasesQueueCount = SafetyCase::query()
                ->forOrganization($orgId)
                ->where('status', CaseStatus::New->value)
                ->count();
        }

        return view('dashboard', [
            'title' => 'Dashboard | SafetyLog',
            'user' => $request->session()->get('sl_user'),
            'unreadNotifications' => $unreadNotifications,
            'myOpenActions' => $myOpenActions,
            'myOpenActionsCount' => $myOpenActionsCount,
            'myOverdueActionsCount' => $myOverdueActionsCount,
            'myReportedOpenCount' => $myReportedOpenCount,
            'newCasesQueueCount' => $newCasesQueueCount,
            'dashboardData' => $dashboardData,
        ]);
    }

    public function notifications(Request $request): View
    {
        /** @var User $user */
        $user = $request->user();

        $notifications = AppNotification::query()
            ->forOrganization($user->organization_id)
            ->where('user_id', $user->id)
            ->with(['safetyCase:id,case_number,status', 'caseAction:id,title,due_at,status'])
            ->latest('id')
            ->paginate(20);

        $unreadCount = AppNotification::query()
            ->forOrganization($user->organization_id)
            ->where('user_id', $user->id)
            ->whereNull('read_at')
            ->count();

        return view('notifications.index', [
            'title' => 'Notifikasi | SafetyLog',
            'user' => $request->session()->get('sl_user'),
            'notifications' => $notifications,
            'unreadCount' => $unreadCount,
        ]);
    }

    public function auditLogs(Request $request): View
    {
        /** @var User $user */
        $user = $request->user();

        $query = CaseStatusHistory::query()
            ->forOrganization($user->organization_id)
            ->with(['changedBy:id,name,email,role', 'safetyCase:id,case_number,status'])
            ->latest('created_at')
            ->latest('id');

        if ($request->filled('action_name')) {
            $query->where('action_name', (string) $request->query('action_name'));
        }

        if ($request->filled('safety_case_id')) {
            $query->where('safety_case_id', (int) $request->query('safety_case_id'));
        }

        return view('audit-logs.index', [
            'title' => 'Riwayat Perubahan (Audit Log) | SafetyLog',
            'user' => $request->session()->get('sl_user'),
            'histories' => $query->paginate(25)->withQueryString(),
            'selectedAction' => (string) $request->query('action_name', ''),
        ]);
    }

    public function logout(Request $request): RedirectResponse
    {
        $token = $request->session()->get('sl_token');
        if (is_string($token) && $token !== '') {
            $personalAccessToken = PersonalAccessToken::findToken($token);
            if ($personalAccessToken) {
                $personalAccessToken->delete();
            }
        }

        Auth::forgetGuards();
        $request->session()->forget(['sl_token', 'sl_user', 'sl_return_url']);
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('web.login');
    }

    private function isSafeReturnUrl(string $url): bool
    {
        return str_starts_with($url, '/')
            && ! str_starts_with($url, '//')
            && ! str_starts_with($url, '/login');
    }
}

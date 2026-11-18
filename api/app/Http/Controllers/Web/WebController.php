<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\Area;
use App\Models\Machine;
use App\Models\Site;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\PersonalAccessToken;

class WebController extends Controller
{
    /** Tampilkan halaman login. */
    public function login()
    {
        if (session('sl_token')) {
            return redirect()->route('web.dashboard');
        }
        return view('auth.login');
    }

    /** Proses login: buat token Sanctum, simpan di session. */
    public function loginPost(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $user = User::where('email', $request->email)->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            return back()->withErrors(['email' => 'Email atau password salah.'])->withInput();
        }

        if (! $user->is_active) {
            return back()->withErrors(['email' => 'Akun Anda tidak aktif.'])->withInput();
        }

        // Buat token Sanctum untuk akses API dari frontend
        $token = $user->createToken('web_session')->plainTextToken;

        session(['sl_token' => $token]);
        session(['sl_user' => [
            'id' => $user->id,
            'organization_id' => $user->organization_id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role instanceof \BackedEnum
                ? $user->role->value
                : (string) $user->role,
        ]]);

        return redirect()->route('web.dashboard');
    }

    /** Dashboard berdasarkan role. */
    public function dashboard(Request $request)
    {
        if ($redirect = $this->requireAuth($request)) {
            return $redirect;
        }

        $user = session('sl_user');

        return view('dashboard', [
            'title' => 'Dashboard — SafetyLog',
            'user' => $user,
        ]);
    }

    /** Kelola Area (admin only). */
    public function areas(Request $request)
    {
        if ($redirect = $this->requireAdmin($request)) {
            return $redirect;
        }

        $user = session('sl_user');
        $orgId = $user['organization_id'];

        $sites = Site::query()
            ->where('organization_id', $orgId)
            ->where('is_active', true)
            ->orderBy('name')
            ->get();

        $areas = Area::query()
            ->where('organization_id', $orgId)
            ->with(['site', 'machines' => function ($q) {
                $q->where('is_active', true)->whereNull('archived_at');
            }])
            ->withCount(['machines' => function ($q) {
                $q->where('is_active', true)->whereNull('archived_at');
            }])
            ->orderBy('name')
            ->get();

        return view('areas.index', [
            'title' => 'Kelola Area — SafetyLog',
            'user' => $user,
            'sites' => $sites,
            'areas' => $areas,
        ]);
    }

    /** Kelola Mesin (admin only). */
    public function sites(Request $request)
    {
        if ($redirect = $this->requireAdmin($request)) {
            return $redirect;
        }

        $user = session('sl_user');
        $orgId = $user['organization_id'];
        $sites = Site::query()
            ->where('organization_id', $orgId)
            ->orderBy('name')
            ->get();

        return view('sites.index', [
            'title' => 'Kelola Pabrik — SafetyLog',
            'user' => $user,
            'sites' => $sites,
        ]);
    }

    /** Kelola Mesin (admin only). */
    public function machines(Request $request)
    {
        if ($redirect = $this->requireAdmin($request)) {
            return $redirect;
        }

        $user = session('sl_user');
        $orgId = $user['organization_id'];

        $areas = Area::query()
            ->where('organization_id', $orgId)
            ->orderBy('name')
            ->get();

        $machines = Machine::query()
            ->where('organization_id', $orgId)
            ->with(['site', 'area'])
            ->orderBy('name')
            ->get();

        return view('machines.index', [
            'title' => 'Kelola Mesin — SafetyLog',
            'user' => $user,
            'areas' => $areas,
            'machines' => $machines,
        ]);
    }

    /** Logout: hapus token dan session. */
    public function logout(Request $request)
    {
        $token = session('sl_token');
        if ($token) {
            $personalAccessToken = PersonalAccessToken::findToken($token);
            if ($personalAccessToken) {
                $personalAccessToken->delete();
            }
        }

        session()->forget(['sl_token', 'sl_user']);

        return redirect()->route('web.login');
    }

    /** Helper: pastikan user sudah login. */
    protected function requireAuth(Request $request)
    {
        if (! session('sl_token')) {
            return redirect()->route('web.login');
        }
        return null;
    }

    /** Helper: pastikan role admin. */
    protected function requireAdmin(Request $request)
    {
        if (! session('sl_token')) {
            return redirect()->route('web.login');
        }

        $user = session('sl_user');
        if (! isset($user['role']) || $user['role'] !== 'admin') {
            abort(403, 'Hanya admin yang dapat mengakses halaman ini.');
        }
        return null;
    }
}

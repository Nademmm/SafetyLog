<?php

namespace App\Http\Controllers\Web;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\Area;
use App\Models\Configuration;
use App\Models\Machine;
use App\Models\RiskConfig;
use App\Models\Site;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\View\View;

class WebAdminController extends Controller
{
    public function sites(Request $request): View
    {
        /** @var User $user */
        $user = $request->user();
        $orgId = (int) $user->organization_id;
        $sites = Site::query()
            ->forOrganization($orgId)
            ->orderBy('name')
            ->get();

        return view('sites.index', [
            'title' => 'Kelola Pabrik | SafetyLog',
            'user' => $request->session()->get('sl_user'),
            'sites' => $sites,
        ]);
    }

    public function areas(Request $request): View
    {
        /** @var User $user */
        $user = $request->user();
        $orgId = (int) $user->organization_id;

        $sites = Site::query()
            ->forOrganization($orgId)
            ->where('is_active', true)
            ->orderBy('name')
            ->get();

        $areas = Area::query()
            ->forOrganization($orgId)
            ->with([
                'site',
                'machines' => fn ($q) => $q->where('is_active', true)->whereNull('archived_at'),
            ])
            ->withCount([
                'machines' => fn ($q) => $q->where('is_active', true)->whereNull('archived_at'),
            ])
            ->orderBy('name')
            ->get();

        return view('areas.index', [
            'title' => 'Kelola Area | SafetyLog',
            'user' => $request->session()->get('sl_user'),
            'sites' => $sites,
            'areas' => $areas,
        ]);
    }

    public function machines(Request $request): View
    {
        /** @var User $user */
        $user = $request->user();
        $orgId = (int) $user->organization_id;

        $areas = Area::query()
            ->forOrganization($orgId)
            ->orderBy('name')
            ->get();

        $machines = Machine::query()
            ->forOrganization($orgId)
            ->with(['site', 'area'])
            ->orderBy('name')
            ->get();

        return view('machines.index', [
            'title' => 'Kelola Mesin | SafetyLog',
            'user' => $request->session()->get('sl_user'),
            'areas' => $areas,
            'machines' => $machines,
        ]);
    }

    public function users(Request $request): View
    {
        /** @var User $user */
        $user = $request->user();
        $orgId = (int) $user->organization_id;

        $users = User::query()
            ->forOrganization($orgId)
            ->with('site:id,name,code')
            ->orderBy('name')
            ->get();

        $sites = Site::query()
            ->forOrganization($orgId)
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'code']);

        return view('users.index', [
            'title' => 'Kelola Pengguna | SafetyLog',
            'user' => $request->session()->get('sl_user'),
            'users' => $users,
            'sites' => $sites,
            'roles' => UserRole::cases(),
        ]);
    }

    public function configurations(Request $request): View
    {
        /** @var User $user */
        $user = $request->user();
        $orgId = (int) $user->organization_id;

        $riskConfigs = RiskConfig::query()
            ->forOrganization($orgId)
            ->orderBy('min_score')
            ->get();

        $configurations = Configuration::query()
            ->forOrganization($orgId)
            ->orderBy('key')
            ->get();

        return view('configurations.index', [
            'title' => 'Konfigurasi Risiko & Sistem | SafetyLog',
            'user' => $request->session()->get('sl_user'),
            'riskConfigs' => $riskConfigs,
            'configurations' => $configurations,
        ]);
    }
}

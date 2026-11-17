<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Site;
use App\Services\DashboardService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function __construct(
        private readonly DashboardService $dashboard,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $orgId = $request->user()->organization_id;
        $siteId = $request->filled('site_id') ? (int) $request->query('site_id') : null;

        if ($siteId !== null) {
            $siteExists = Site::query()
                ->forOrganization($orgId)
                ->whereKey($siteId)
                ->exists();

            if (! $siteExists) {
                abort(403, 'Anda tidak memiliki akses ke site organisasi lain.');
            }
        }

        return response()->json([
            'data' => $this->dashboard->buildForOrganization($orgId, $siteId),
        ]);
    }
}

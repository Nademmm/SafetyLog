<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\DomainRuleException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreAreaRequest;
use App\Http\Requests\Admin\StoreSiteRequest;
use App\Http\Requests\Admin\UpdateAreaRequest;
use App\Http\Requests\Admin\UpdateSiteRequest;
use App\Models\Area;
use App\Models\Site;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AreaController extends Controller
{
    public function sites(Request $request): JsonResponse
    {
        $sites = Site::query()
            ->forOrganization($request->user()->organization_id)
            ->orderBy('name')
            ->get(['id', 'name', 'code', 'address', 'is_active']);

        return response()->json(['data' => $sites]);
    }

    public function storeSite(StoreSiteRequest $request): JsonResponse
    {
        $orgId = $request->user()->organization_id;
        $site = Site::query()->create([
            'organization_id' => $orgId,
            'name' => trim((string) $request->validated('name')),
            'code' => $this->generateSiteCode($orgId),
            'address' => $request->validated('address'),
            'is_active' => true,
        ]);

        return response()->json([
            'message' => 'Pabrik berhasil ditambahkan.',
            'data' => $site,
        ], 201);
    }

    public function updateSite(UpdateSiteRequest $request, Site $site): JsonResponse
    {
        $this->ensureSameOrganization($request->user()->organization_id, $site->organization_id);

        $updates = [];
        if ($request->has('name')) {
            $updates['name'] = trim((string) $request->validated('name'));
        }
        if ($request->has('address')) {
            $updates['address'] = $request->validated('address');
        }
        if ($request->has('is_active')) {
            $active = (bool) $request->validated('is_active');
            $updates['is_active'] = $active;
        }

        $site->update($updates);

        return response()->json([
            'message' => 'Pabrik berhasil diperbarui.',
            'data' => $site->fresh(),
        ]);
    }

    public function archiveSite(Request $request, Site $site): JsonResponse
    {
        $this->ensureSameOrganization($request->user()->organization_id, $site->organization_id);
        $activate = ! $site->is_active;
        $site->update(['is_active' => $activate]);

        return response()->json([
            'message' => $activate ? 'Pabrik berhasil diaktifkan kembali.' : 'Pabrik berhasil diarsipkan.',
            'data' => $site->fresh(),
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        $query = Area::query()
            ->forOrganization($request->user()->organization_id)
            ->with(['site:id,name,code'])
            ->withCount(['machines' => fn ($q) => $q->where('is_active', true)->whereNull('archived_at')])
            ->orderBy('name');

        if (! $request->boolean('include_archived')) {
            $query->where('is_active', true)->whereNull('archived_at');
        }

        if ($request->filled('site_id')) {
            $query->where('site_id', (int) $request->query('site_id'));
        }

        return response()->json(['data' => $query->get()]);
    }

    public function store(StoreAreaRequest $request): JsonResponse
    {
        $orgId = $request->user()->organization_id;
        $site = $this->findActiveSite((int) $request->validated('site_id'), $orgId);

        $area = Area::query()->create([
            'organization_id' => $orgId,
            'site_id' => $site->id,
            'name' => trim((string) $request->validated('name')),
            'code' => $this->generateAreaCode($orgId),
            'is_active' => true,
        ]);

        return response()->json([
            'message' => 'Area produksi berhasil ditambahkan.',
            'data' => $area->load('site:id,name,code'),
        ], 201);
    }

    public function update(UpdateAreaRequest $request, Area $area): JsonResponse
    {
        $this->ensureSameOrganization($request->user()->organization_id, $area->organization_id);

        $updates = [];
        if ($request->filled('site_id')) {
            $site = $this->findActiveSite((int) $request->validated('site_id'), $area->organization_id);
            $updates['site_id'] = $site->id;
        }

        if ($request->has('name')) {
            $updates['name'] = trim((string) $request->validated('name'));
        }

        if ($request->has('is_active')) {
            $active = (bool) $request->validated('is_active');
            $updates['is_active'] = $active;
            $updates['archived_at'] = $active ? null : now();
        }

        $area->update($updates);

        return response()->json([
            'message' => 'Area produksi berhasil diperbarui.',
            'data' => $area->fresh('site:id,name,code'),
        ]);
    }

    public function archive(Request $request, Area $area): JsonResponse
    {
        $this->ensureSameOrganization($request->user()->organization_id, $area->organization_id);

        $activate = ! $area->is_active || $area->archived_at !== null;

        $area->update([
            'is_active' => $activate,
            'archived_at' => $activate ? null : now(),
        ]);

        return response()->json([
            'message' => $activate
                ? 'Area produksi berhasil diaktifkan kembali.'
                : 'Area produksi berhasil diarsipkan.',
            'data' => $area->fresh('site:id,name,code'),
        ]);
    }

    private function findActiveSite(int $siteId, int $organizationId): Site
    {
        $site = Site::query()
            ->forOrganization($organizationId)
            ->where('is_active', true)
            ->find($siteId);

        if (! $site) {
            throw new DomainRuleException('Site/pabrik tidak ditemukan pada organisasi Anda.', 'INVALID_SITE', 422, [
                'site_id' => ['Site/pabrik harus aktif dan berada pada organisasi yang sama.'],
            ]);
        }

        return $site;
    }

    private function ensureSameOrganization(int $userOrgId, int $resourceOrgId): void
    {
        if ($userOrgId !== $resourceOrgId) {
            abort(403, 'Anda tidak memiliki akses ke area organisasi lain.');
        }
    }

    private function generateSiteCode(int $organizationId): string
    {
        do {
            $next = (int) Site::query()->forOrganization($organizationId)->count() + 1;
            $code = 'SITE-'.str_pad((string) $next, 3, '0', STR_PAD_LEFT);
        } while (Site::query()->forOrganization($organizationId)->where('code', $code)->exists());

        return $code;
    }

    private function generateAreaCode(int $organizationId): string
    {
        do {
            $next = (int) Area::query()->forOrganization($organizationId)->count() + 1;
            $code = 'AREA-'.str_pad((string) $next, 3, '0', STR_PAD_LEFT);
        } while (Area::query()->forOrganization($organizationId)->where('code', $code)->exists());

        return $code;
    }
}

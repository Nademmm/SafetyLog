<?php

namespace Tests\Concerns;

use App\Enums\UserRole;
use App\Models\Area;
use App\Models\CaseType;
use App\Models\Category;
use App\Models\Machine;
use App\Models\Organization;
use App\Models\Site;
use App\Models\User;
use App\Services\OrganizationBootstrapService;

trait CreatesSafetyLogFixtures
{
    /**
     * @return array{
     *     organization: Organization,
     *     site: Site,
     *     area: Area,
     *     machine: Machine,
     *     reporter: User,
     *     supervisor: User,
     *     hse: User,
     *     admin: User,
     *     abnormalityType: CaseType,
     *     incidentType: CaseType,
     *     mechanicalCategory: Category,
     * }
     */
    protected function createOrganizationFixture(string $code = 'ORG1', string $siteCode = 'SBY1'): array
    {
        $bootstrap = app(OrganizationBootstrapService::class);
        $bootstrap->seedRoles();

        $organization = Organization::factory()->create([
            'name' => "Perusahaan {$code}",
            'code' => $code,
        ]);

        $bootstrap->seedDefaultsForOrganization($organization);

        $site = Site::factory()->create([
            'organization_id' => $organization->id,
            'name' => "Pabrik {$siteCode}",
            'code' => $siteCode,
        ]);

        $area = Area::factory()->create([
            'organization_id' => $organization->id,
            'site_id' => $site->id,
            'name' => 'Lini Pengemasan A',
        ]);

        $machine = Machine::factory()->create([
            'organization_id' => $organization->id,
            'site_id' => $site->id,
            'area_id' => $area->id,
            'code' => "MCH-{$code}-01",
            'name' => 'Mesin Konveyor Pengemasan 01',
        ]);

        $reporter = User::factory()->withRole(UserRole::Reporter)->create([
            'organization_id' => $organization->id,
            'site_id' => $site->id,
        ]);

        $supervisor = User::factory()->withRole(UserRole::Supervisor)->create([
            'organization_id' => $organization->id,
            'site_id' => $site->id,
        ]);

        $hse = User::factory()->withRole(UserRole::Hse)->create([
            'organization_id' => $organization->id,
            'site_id' => $site->id,
        ]);

        $admin = User::factory()->withRole(UserRole::Admin)->create([
            'organization_id' => $organization->id,
            'site_id' => $site->id,
        ]);

        $abnormalityType = CaseType::query()
            ->forOrganization($organization->id)
            ->where('code', 'machine_abnormality')
            ->firstOrFail();

        $incidentType = CaseType::query()
            ->forOrganization($organization->id)
            ->where('code', 'incident')
            ->firstOrFail();

        $mechanicalCategory = Category::query()
            ->forOrganization($organization->id)
            ->where('code', 'mechanical')
            ->firstOrFail();

        return compact(
            'organization',
            'site',
            'area',
            'machine',
            'reporter',
            'supervisor',
            'hse',
            'admin',
            'abnormalityType',
            'incidentType',
            'mechanicalCategory',
        );
    }
}

<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\RiskConfig;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\CreatesSafetyLogFixtures;
use Tests\TestCase;

class AdminMasterAndConfigTest extends TestCase
{
    use CreatesSafetyLogFixtures, RefreshDatabase;

    public function test_admin_can_manage_areas_machines_qr_users_and_configurations(): void
    {
        $fx = $this->createOrganizationFixture();

        // Non-admin blocked from admin master endpoints
        Sanctum::actingAs($fx['supervisor']);
        $this->postJson('/api/areas', [
            'site_id' => $fx['site']->id,
            'name' => 'Area Baru',
        ])->assertForbidden();

        // Admin creates area, machine, regenerates QR, archives machine
        Sanctum::actingAs($fx['admin']);
        $areaId = (int) $this->postJson('/api/areas', [
            'site_id' => $fx['site']->id,
            'name' => 'Lini Pengolahan Susu',
            'code' => 'milk-1',
        ])->assertCreated()
            ->assertJsonPath('data.code', 'MILK-1')
            ->json('data.id');

        $machineResp = $this->postJson('/api/machines', [
            'area_id' => $areaId,
            'code' => 'mch-hom-01',
            'name' => 'Mesin Homogenizer 01',
        ])->assertCreated();

        $machineId = (int) $machineResp->json('data.id');
        $oldQr = $machineResp->json('data.qr_token');
        $this->assertNotEmpty($oldQr);
        $this->assertSame('MCH-HOM-01', $machineResp->json('data.code'));

        $newQr = $this->postJson("/api/machines/{$machineId}/regenerate-qr")
            ->assertOk()
            ->json('data.qr_token');
        $this->assertNotSame($oldQr, $newQr);

        $this->postJson("/api/machines/{$machineId}/archive")
            ->assertOk()
            ->assertJsonPath('data.is_active', false);

        // Archived machine cannot be scanned via QR
        $this->getJson("/api/machines/qr/{$newQr}")->assertStatus(422);

        // Admin creates a new operator user and updates risk config dynamically
        $newUserId = (int) $this->postJson('/api/users', [
            'site_id' => $fx['site']->id,
            'name' => 'Siti Aminah',
            'email' => 'siti@safetylog.test',
            'password' => 'password123',
            'role' => UserRole::Reporter->value,
            'job_title' => 'Operator QC',
        ])->assertCreated()->json('data.id');

        $this->patchJson("/api/users/{$newUserId}", [
            'is_active' => false,
        ])->assertOk()
            ->assertJsonPath('data.is_active', false);

        $lowRisk = RiskConfig::query()
            ->forOrganization($fx['organization']->id)
            ->where('level', 'low')
            ->firstOrFail();

        $this->patchJson("/api/risk-configs/{$lowRisk->id}", [
            'first_response_hours' => 12,
        ])->assertOk()
            ->assertJsonPath('data.first_response_hours', 12);

        $this->putJson('/api/configurations/open_case_warning_days', [
            'value' => 14,
        ])->assertOk()
            ->assertJsonPath('data.value', 14);
    }
}

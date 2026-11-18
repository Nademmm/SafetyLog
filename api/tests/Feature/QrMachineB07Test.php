<?php

namespace Tests\Feature;

use App\Models\Machine;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\CreatesSafetyLogFixtures;
use Tests\TestCase;

class QrMachineB07Test extends TestCase
{
    use CreatesSafetyLogFixtures, RefreshDatabase;

    public function test_machine_qr_token_is_random_and_lookup_returns_complete_print_and_report_metadata(): void
    {
        $fx = $this->createOrganizationFixture('PNS', 'SBY1');

        $machine = Machine::query()->create([
            'organization_id' => $fx['organization']->id,
            'site_id' => $fx['site']->id,
            'area_id' => $fx['area']->id,
            'code' => 'MCH-QR-001',
            'name' => 'Mesin Carton Sealer 01',
            'description' => 'Mesin perekat karton lini A.',
            'is_active' => true,
        ]);

        // Token QR acak (bukan ID urut)
        $this->assertNotEmpty($machine->qr_token);
        $this->assertSame(24, strlen($machine->qr_token));
        $this->assertNotEquals((string) $machine->id, $machine->qr_token);

        Sanctum::actingAs($fx['reporter']);

        // Lookup menggunakan ID urut harus ditolak 404
        $this->getJson('/api/machines/qr/'.$machine->id)
            ->assertNotFound()
            ->assertJsonPath('message', 'Kode QR mesin tidak ditemukan.');

        // Lookup menggunakan qr_token acak berhasil & mengembalikan detail lengkap
        $response = $this->getJson('/api/machines/qr/'.$machine->qr_token)
            ->assertOk()
            ->assertJsonPath('machine.id', $machine->id)
            ->assertJsonPath('machine.code', 'MCH-QR-001')
            ->assertJsonPath('machine.name', 'Mesin Carton Sealer 01')
            ->assertJsonPath('machine.qr_token', $machine->qr_token)
            ->assertJsonPath('machine.qr_report_path', '/report?qr='.$machine->qr_token)
            ->assertJsonPath('machine.area.id', $fx['area']->id)
            ->assertJsonPath('machine.area.name', 'Lini Pengemasan A')
            ->assertJsonPath('machine.site.id', $fx['site']->id)
            ->assertJsonPath('data.id', $machine->id)
            ->assertJsonPath('data.qr_report_path', '/report?qr='.$machine->qr_token)
            ->assertJsonPath('open_cases_warning.has_open_cases', false);

        $this->assertNotEmpty($response->json('case_types'));
    }

    public function test_qr_lookup_enforces_authentication_organization_isolation_and_active_status(): void
    {
        $orgA = $this->createOrganizationFixture('ORGA', 'SBYA');
        $orgB = $this->createOrganizationFixture('ORGB', 'SBYB');

        // Belum login -> 401 Unauthenticated (frontend mengarahkan ke halaman Login B-05)
        $this->getJson('/api/machines/qr/'.$orgA['machine']->qr_token)
            ->assertUnauthorized();

        // User dari organisasi berbeda -> 403 Forbidden (isolasi organization_id)
        Sanctum::actingAs($orgB['reporter']);
        $this->getJson('/api/machines/qr/'.$orgA['machine']->qr_token)
            ->assertForbidden();

        // Mesin yang sudah diarsipkan -> 422 Unprocessable Entity
        Sanctum::actingAs($orgA['reporter']);
        $orgA['machine']->update([
            'is_active' => false,
            'archived_at' => now(),
        ]);

        $this->getJson('/api/machines/qr/'.$orgA['machine']->qr_token)
            ->assertStatus(422)
            ->assertJsonPath('message', 'Mesin ini sudah diarsipkan dan tidak dapat dipilih.');

        // Area yang sudah diarsipkan -> 422 Unprocessable Entity
        $orgA['machine']->update([
            'is_active' => true,
            'archived_at' => null,
        ]);
        $orgA['area']->update([
            'is_active' => false,
            'archived_at' => now(),
        ]);

        $this->getJson('/api/machines/qr/'.$orgA['machine']->qr_token)
            ->assertStatus(422)
            ->assertJsonPath('message', 'Mesin ini sudah diarsipkan dan tidak dapat dipilih.');
    }
}

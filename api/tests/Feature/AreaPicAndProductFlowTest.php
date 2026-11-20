<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\CreatesSafetyLogFixtures;
use Tests\TestCase;

class AreaPicAndProductFlowTest extends TestCase
{
    use CreatesSafetyLogFixtures, RefreshDatabase;

    public function test_admin_can_assign_area_pic_and_supervisor_sees_it_on_qr_and_case_detail(): void
    {
        $orgA = $this->createOrganizationFixture('ORGA', 'SBYA');
        $orgB = $this->createOrganizationFixture('ORGB', 'SBYB');

        $areaTechnician = User::factory()->withRole(UserRole::Reporter)->create([
            'organization_id' => $orgA['organization']->id,
            'site_id' => $orgA['site']->id,
            'name' => 'Teknisi Area A',
            'job_title' => 'Teknisi Lini Pengemasan',
        ]);

        // Cross-tenant PIC assignment must be rejected (422)
        Sanctum::actingAs($orgA['admin']);
        $this->patchJson("/api/areas/{$orgA['area']->id}", [
            'pic_user_id' => $orgB['supervisor']->id,
        ])->assertStatus(422)
            ->assertJsonPath('error_code', 'INVALID_PIC_USER');

        // Admin assigns Area PIC in same organization
        $this->patchJson("/api/areas/{$orgA['area']->id}", [
            'pic_user_id' => $areaTechnician->id,
        ])->assertOk()
            ->assertJsonPath('data.pic_user.id', $areaTechnician->id)
            ->assertJsonPath('data.pic_user.name', 'Teknisi Area A');

        // Reporter scans QR and submits a case
        Sanctum::actingAs($orgA['reporter']);
        $this->getJson('/api/machines/qr/'.$orgA['machine']->qr_token)
            ->assertOk()
            ->assertJsonPath('machine.area.pic_user.id', $areaTechnician->id)
            ->assertJsonPath('machine.area.pic_user.name', 'Teknisi Area A');

        $caseId = (int) $this->postJson('/api/cases', [
            'machine_id' => $orgA['machine']->id,
            'case_type_id' => $orgA['abnormalityType']->id,
            'description' => 'Sensor konveyor kotor sehingga karton menumpuk.',
        ])->assertCreated()->json('data.id');

        // Supervisor sees Area PIC on case detail during triage
        Sanctum::actingAs($orgA['supervisor']);
        $this->getJson("/api/cases/{$caseId}")
            ->assertOk()
            ->assertJsonPath('data.area.pic_user.id', $areaTechnician->id)
            ->assertJsonPath('data.area.pic_user.name', 'Teknisi Area A');

        // Area PIC also received in-app notification for the new report
        Sanctum::actingAs($areaTechnician);
        $this->getJson('/api/notifications?unread_only=1')
            ->assertOk()
            ->assertJsonPath('unread_count', 1);
    }

    public function test_supervisor_cannot_verify_or_close_case_and_closed_case_is_locked(): void
    {
        $fx = $this->createOrganizationFixture();

        Sanctum::actingAs($fx['reporter']);
        $caseId = (int) $this->postJson('/api/cases', [
            'machine_id' => $fx['machine']->id,
            'case_type_id' => $fx['abnormalityType']->id,
            'description' => 'Getaran berlebih pada motor penggerak.',
        ])->assertCreated()->json('data.id');

        // Supervisor triages (Baru -> Dinilai)
        Sanctum::actingAs($fx['supervisor']);
        $this->postJson("/api/cases/{$caseId}/triage", [
            'decision' => 'assess',
            'severity' => 2,
            'likelihood' => 2,
        ])->assertOk();

        // Supervisor adds corrective action & reporter (as PIC) completes it -> Menunggu verifikasi
        $actionId = (int) $this->postJson("/api/cases/{$caseId}/actions", [
            'action_type' => 'corrective',
            'title' => 'Kencangkan baut mounting motor',
            'pic_user_id' => $fx['reporter']->id,
        ])->assertCreated()->json('data.id');

        Sanctum::actingAs($fx['reporter']);
        $this->postJson("/api/actions/{$actionId}/complete", [
            'completion_note' => 'Baut mounting sudah dikencangkan dan dicek ulang.',
        ])->assertOk();

        // Supervisor is strictly forbidden from verifying/closing the case
        Sanctum::actingAs($fx['supervisor']);
        $this->postJson("/api/cases/{$caseId}/verify", [
            'decision' => 'approve',
            'learning_summary' => 'Supervisor tidak boleh verifikasi.',
        ])->assertForbidden();

        // K3/Verifikator approves -> Selesai & Terkunci
        Sanctum::actingAs($fx['hse']);
        $this->postJson("/api/cases/{$caseId}/verify", [
            'decision' => 'approve',
            'learning_summary' => 'Pengecekan kekencangan baut dimasukkan ke checklist mingguan.',
        ])->assertOk()
            ->assertJsonPath('data.status', 'closed')
            ->assertJsonPath('data.is_locked', true);

        // Locked case cannot be mutated directly
        Sanctum::actingAs($fx['supervisor']);
        $this->postJson("/api/cases/{$caseId}/actions", [
            'action_type' => 'corrective',
            'title' => 'Mutasi ilegal setelah ditutup',
            'pic_user_id' => $fx['reporter']->id,
        ])->assertStatus(422)
            ->assertJsonPath('error_code', 'CASE_LOCKED');
    }
}

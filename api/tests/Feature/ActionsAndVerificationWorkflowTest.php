<?php

namespace Tests\Feature;

use App\Enums\ActionType;
use App\Enums\CaseStatus;
use App\Models\CaseStatusHistory;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use LogicException;
use Tests\Concerns\CreatesSafetyLogFixtures;
use Tests\TestCase;

class ActionsAndVerificationWorkflowTest extends TestCase
{
    use CreatesSafetyLogFixtures, RefreshDatabase;

    public function test_full_closed_loop_enforces_pic_only_preventive_rule_verifier_not_pic_and_audit_immutability(): void
    {
        Storage::fake('local');
        $fx = $this->createOrganizationFixture();

        // 1. Capture: Reporter creates case
        Sanctum::actingAs($fx['reporter']);
        $caseId = (int) $this->postJson('/api/cases', [
            'machine_id' => $fx['machine']->id,
            'case_type_id' => $fx['abnormalityType']->id,
            'description' => 'Pelindung sabuk penggerak terlepas di mesin konveyor.',
            'is_machine_stopped' => true,
            'has_affected_people' => false,
        ])->assertCreated()->json('data.id');

        // 2. Triage: Supervisor rates 4x4 = 16 (High)
        Sanctum::actingAs($fx['supervisor']);
        $this->postJson("/api/cases/{$caseId}/triage", [
            'decision' => 'assess',
            'severity' => 4,
            'likelihood' => 4,
            'category_id' => $fx['mechanicalCategory']->id,
        ])->assertOk();

        // 3. Add Corrective action assigned to HSE user (to test Verifier != PIC rule) and one overdue action
        $correctiveAction = $this->postJson("/api/cases/{$caseId}/actions", [
            'action_type' => ActionType::Corrective->value,
            'title' => 'Pasang ulang baut pelindung konveyor',
            'pic_user_id' => $fx['hse']->id,
            'due_at' => now()->subDay()->toIso8601String(),
        ])->assertCreated();

        $correctiveAction->assertJsonPath('case_status', CaseStatus::InProgress->value);
        $correctiveId = (int) $correctiveAction->json('data.id');

        // Non-PIC (even Admin!) cannot complete HSE's action (Section 9 rule)
        Sanctum::actingAs($fx['admin']);
        $this->postJson("/api/actions/{$correctiveId}/complete", [
            'completion_note' => 'Saya bantu selesaikan.',
        ])->assertForbidden();

        // HSE views My Actions -> sees overdue label "Terlambat" (U7)
        Sanctum::actingAs($fx['hse']);
        $this->getJson('/api/my-actions?status=open')
            ->assertOk()
            ->assertJsonPath('data.0.id', $correctiveId)
            ->assertJsonPath('data.0.is_overdue', true)
            ->assertJsonPath('data.0.overdue_label', 'Terlambat');

        // HSE completes corrective action with proof photo -> case automatically becomes Menunggu verifikasi
        $proofPhoto = UploadedFile::fake()->image('bukti.png', 640, 480);
        $this->post("/api/actions/{$correctiveId}/complete", [
            'completion_note' => 'Baut M10 baru sudah dipasang dan dikencangkan.',
            'photos' => [$proofPhoto],
        ], ['Accept' => 'application/json'])
            ->assertOk()
            ->assertJsonPath('case_status', CaseStatus::PendingVerification->value);

        // 4. U5 Check: HSE was PIC on an action in this case, so HSE CANNOT verify it!
        $this->postJson("/api/cases/{$caseId}/verify", [
            'decision' => 'approve',
            'learning_summary' => 'Perlu pengecekan berkala.',
        ])->assertStatus(422)
            ->assertJsonPath('error_code', 'VERIFIER_CANNOT_BE_PIC');

        // 5. U4 Check: Admin (not a PIC on this case) tries to close High-risk case WITHOUT Preventive action -> REJECTED!
        Sanctum::actingAs($fx['admin']);
        $this->postJson("/api/cases/{$caseId}/verify", [
            'decision' => 'approve',
            'learning_summary' => 'Baut sudah dipasang ulang.',
        ])->assertStatus(422)
            ->assertJsonPath('error_code', 'PREVENTIVE_ACTION_REQUIRED');

        // 6. Supervisor adds Preventive action assigned to Supervisor (so Admin remains independent verifier)
        Sanctum::actingAs($fx['supervisor']);
        $preventiveId = (int) $this->postJson("/api/cases/{$caseId}/actions", [
            'action_type' => ActionType::Preventive->value,
            'title' => 'Tambahkan threadlocker dan jadwal inspeksi mingguan baut cover',
            'pic_user_id' => $fx['supervisor']->id,
        ])->assertCreated()
            ->assertJsonPath('case_status', CaseStatus::InProgress->value)
            ->json('data.id');

        $this->postJson("/api/actions/{$preventiveId}/complete", [
            'completion_note' => 'Threadlocker sudah diaplikasikan dan masuk checklist mingguan.',
        ])->assertOk()
            ->assertJsonPath('case_status', CaseStatus::PendingVerification->value);

        // 7. Admin verifies: first tests reject verification flow, then re-completes and approves
        Sanctum::actingAs($fx['admin']);
        $this->postJson("/api/cases/{$caseId}/verify", [
            'decision' => 'reject',
            'rejection_reason' => 'Lampirkan dokumentasi checklist pada papan area.',
            'reopen_action_ids' => [$preventiveId],
        ])->assertOk()
            ->assertJsonPath('data.status', CaseStatus::InProgress->value);

        // Supervisor completes reopened preventive action again
        Sanctum::actingAs($fx['supervisor']);
        $this->postJson("/api/actions/{$preventiveId}/complete", [
            'completion_note' => 'Checklist mingguan sudah ditempel di papan area pengemasan.',
        ])->assertOk()
            ->assertJsonPath('case_status', CaseStatus::PendingVerification->value);

        // Admin approves and closes case with mandatory learning summary
        Sanctum::actingAs($fx['admin']);
        $closed = $this->postJson("/api/cases/{$caseId}/verify", [
            'decision' => 'approve',
            'learning_summary' => 'Getaran konveyor melonggarkan baut cover; penggunaan threadlocker dan cek mingguan mencegah terulang.',
        ])->assertOk();

        $closed->assertJsonPath('data.status', CaseStatus::Closed->value)
            ->assertJsonPath('data.is_locked', true);

        // 8. Locked closed case rejects any further mutations
        Sanctum::actingAs($fx['supervisor']);
        $this->postJson("/api/cases/{$caseId}/actions", [
            'action_type' => ActionType::Corrective->value,
            'title' => 'Tindakan tambahan setelah tutup',
            'pic_user_id' => $fx['supervisor']->id,
        ])->assertStatus(422)
            ->assertJsonPath('error_code', 'CASE_LOCKED');

        // 9. Audit trail recorded all transitions (U9) and cannot be updated or deleted (B-22)
        $detail = $this->getJson("/api/cases/{$caseId}")->assertOk();
        $this->assertGreaterThanOrEqual(7, count($detail->json('data.status_histories')));

        $history = CaseStatusHistory::query()->where('safety_case_id', $caseId)->firstOrFail();
        $this->expectException(LogicException::class);
        $history->update(['reason' => 'Diubah']);
    }

    public function test_low_risk_case_can_be_closed_without_preventive_action(): void
    {
        $fx = $this->createOrganizationFixture();

        Sanctum::actingAs($fx['reporter']);
        $caseId = (int) $this->postJson('/api/cases', [
            'machine_id' => $fx['machine']->id,
            'case_type_id' => $fx['abnormalityType']->id,
            'description' => 'Label peringatan di panel sedikit pudar.',
        ])->assertCreated()->json('data.id');

        Sanctum::actingAs($fx['supervisor']);
        $this->postJson("/api/cases/{$caseId}/triage", [
            'decision' => 'assess',
            'severity' => 2,
            'likelihood' => 2, // score 4 -> Rendah
        ])->assertOk();

        $actionId = (int) $this->postJson("/api/cases/{$caseId}/actions", [
            'action_type' => ActionType::Corrective->value,
            'title' => 'Tempel stiker label baru',
            'pic_user_id' => $fx['supervisor']->id,
        ])->assertCreated()->json('data.id');

        $this->postJson("/api/actions/{$actionId}/complete", [
            'completion_note' => 'Stiker label baru sudah terpasang.',
        ])->assertOk();

        Sanctum::actingAs($fx['hse']);
        $this->postJson("/api/cases/{$caseId}/verify", [
            'decision' => 'approve',
            'learning_summary' => 'Gunakan stiker tahan lembap di area pencucian.',
        ])->assertOk()
            ->assertJsonPath('data.status', CaseStatus::Closed->value);
    }

    public function test_admin_cannot_add_or_edit_capa_actions(): void
    {
        $fx = $this->createOrganizationFixture();

        Sanctum::actingAs($fx['reporter']);
        $caseId = (int) $this->postJson('/api/cases', [
            'machine_id' => $fx['machine']->id,
            'case_type_id' => $fx['abnormalityType']->id,
            'description' => 'Sensor pengaman pintu mesin tidak merespons.',
        ])->assertCreated()->json('data.id');

        Sanctum::actingAs($fx['supervisor']);
        $this->postJson("/api/cases/{$caseId}/triage", [
            'decision' => 'assess',
            'severity' => 3,
            'likelihood' => 2,
        ])->assertOk();

        $actionId = (int) $this->postJson("/api/cases/{$caseId}/actions", [
            'action_type' => ActionType::Corrective->value,
            'title' => 'Periksa kabel sensor pintu',
            'pic_user_id' => $fx['reporter']->id,
        ])->assertCreated()->json('data.id');

        Sanctum::actingAs($fx['admin']);
        $this->getJson("/api/cases/{$caseId}")
            ->assertOk()
            ->assertJsonPath('data.available_actions.can_manage_actions', false);

        $this->postJson("/api/cases/{$caseId}/actions", [
            'action_type' => ActionType::Preventive->value,
            'title' => 'Tindakan dari admin',
            'pic_user_id' => $fx['reporter']->id,
        ])->assertForbidden();

        $this->patchJson("/api/actions/{$actionId}", [
            'title' => 'Edit dari admin',
        ])->assertForbidden();
    }
}

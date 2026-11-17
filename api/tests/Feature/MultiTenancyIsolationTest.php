<?php

namespace Tests\Feature;

use App\Enums\ActionType;
use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\CreatesSafetyLogFixtures;
use Tests\TestCase;

class MultiTenancyIsolationTest extends TestCase
{
    use CreatesSafetyLogFixtures, RefreshDatabase;

    public function test_organization_b_cannot_access_or_mutate_organization_a_resources(): void
    {
        Storage::fake('local');

        $orgA = $this->createOrganizationFixture('ORGA', 'SBYA');
        $orgB = $this->createOrganizationFixture('ORGB', 'SBYB');

        // Org A reports a case with photo, triages it, and creates an action
        Sanctum::actingAs($orgA['reporter']);
        $created = $this->post('/api/cases', [
            'machine_id' => $orgA['machine']->id,
            'case_type_id' => $orgA['abnormalityType']->id,
            'description' => 'Temuan rahasia pabrik A.',
            'photos' => [UploadedFile::fake()->image('secret.jpg')],
        ], ['Accept' => 'application/json'])->assertCreated();

        $caseAId = (int) $created->json('data.id');
        $attachmentAId = (int) $created->json('data.attachments.0.id');

        Sanctum::actingAs($orgA['supervisor']);
        $this->postJson("/api/cases/{$caseAId}/triage", [
            'decision' => 'assess',
            'severity' => 3,
            'likelihood' => 3,
        ])->assertOk();

        $actionAId = (int) $this->postJson("/api/cases/{$caseAId}/actions", [
            'action_type' => ActionType::Preventive->value,
            'title' => 'Perbaikan internal pabrik A',
            'pic_user_id' => $orgA['supervisor']->id,
        ])->assertCreated()->json('data.id');

        // Org B Admin tries to access Org A endpoints (U8b) -> ALL rejected with 403!
        Sanctum::actingAs($orgB['admin']);

        $this->getJson("/api/cases/{$caseAId}")->assertForbidden();
        $this->getJson("/api/cases/{$caseAId}/summary")->assertForbidden();
        $this->postJson("/api/cases/{$caseAId}/triage", [
            'decision' => 'assess',
            'severity' => 1,
            'likelihood' => 1,
        ])->assertForbidden();
        $this->postJson("/api/cases/{$caseAId}/actions", [
            'action_type' => ActionType::Corrective->value,
            'title' => 'Cross-tenant action',
            'pic_user_id' => $orgB['supervisor']->id,
        ])->assertForbidden();
        $this->postJson("/api/cases/{$caseAId}/verify", [
            'decision' => 'approve',
            'learning_summary' => 'Cross-tenant close',
        ])->assertForbidden();
        $this->postJson("/api/actions/{$actionAId}/complete", [
            'completion_note' => 'Cross-tenant complete',
        ])->assertForbidden();
        $this->getJson("/api/machines/{$orgA['machine']->id}/open-cases")->assertForbidden();
        $this->getJson('/api/machines/qr/'.$orgA['machine']->qr_token)->assertForbidden();
        $this->get("/api/attachments/{$attachmentAId}")->assertForbidden();

        // Org B list endpoints never expose Org A records
        $this->getJson('/api/cases')->assertOk()->assertJsonCount(0, 'data');
        $this->getJson('/api/machines')->assertOk()->assertJsonCount(1, 'data');

        // Org A Supervisor cannot assign Org B user as PIC on Org A case
        Sanctum::actingAs($orgA['supervisor']);
        $this->postJson("/api/cases/{$caseAId}/actions", [
            'action_type' => ActionType::Corrective->value,
            'title' => 'Assign cross-tenant PIC',
            'pic_user_id' => $orgB['supervisor']->id,
        ])->assertStatus(422)
            ->assertJsonPath('error_code', 'INVALID_PIC_USER');
    }

    public function test_reporter_cannot_view_another_reporters_case_in_same_organization(): void
    {
        $fx = $this->createOrganizationFixture();

        $otherReporter = User::factory()->withRole(UserRole::Reporter)->create([
            'organization_id' => $fx['organization']->id,
            'site_id' => $fx['site']->id,
        ]);

        Sanctum::actingAs($fx['reporter']);
        $caseId = (int) $this->postJson('/api/cases', [
            'machine_id' => $fx['machine']->id,
            'case_type_id' => $fx['abnormalityType']->id,
            'description' => 'Laporan milik pelapor 1.',
        ])->assertCreated()->json('data.id');

        Sanctum::actingAs($otherReporter);
        $this->getJson("/api/cases/{$caseId}")->assertForbidden();
        $this->getJson('/api/my-cases')->assertOk()->assertJsonCount(0, 'data');
    }
}

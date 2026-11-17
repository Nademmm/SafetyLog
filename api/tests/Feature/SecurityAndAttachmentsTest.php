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

class SecurityAndAttachmentsTest extends TestCase
{
    use CreatesSafetyLogFixtures, RefreshDatabase;

    public function test_api_responses_include_security_headers_and_block_suspended_org(): void
    {
        $fx = $this->createOrganizationFixture();
        Sanctum::actingAs($fx['reporter']);

        $this->getJson('/api/auth/me')
            ->assertOk()
            ->assertHeader('X-Content-Type-Options', 'nosniff')
            ->assertHeader('X-Frame-Options', 'DENY')
            ->assertHeader('Referrer-Policy', 'no-referrer');

        // Deactivate organization mid-session -> immediate 403 rejection
        $fx['organization']->update(['is_active' => false]);
        $fx['reporter']->refresh();

        $this->getJson('/api/auth/me')->assertForbidden();
    }

    public function test_reporter_assigned_as_action_pic_can_view_case_and_manage_attachments(): void
    {
        Storage::fake('local');
        $fx = $this->createOrganizationFixture();

        $technicianReporter = User::factory()->withRole(UserRole::Reporter)->create([
            'organization_id' => $fx['organization']->id,
            'site_id' => $fx['site']->id,
        ]);

        // Reporter 1 creates case
        Sanctum::actingAs($fx['reporter']);
        $caseId = (int) $this->postJson('/api/cases', [
            'machine_id' => $fx['machine']->id,
            'case_type_id' => $fx['abnormalityType']->id,
            'description' => 'Pipa vakum bergetar.',
        ])->assertCreated()->json('data.id');

        // Upload extra attachment separately (B-09)
        $uploadResp = $this->post("/api/cases/{$caseId}/attachments", [
            'photos' => [UploadedFile::fake()->image('pipa.webp', 500, 500)],
        ], ['Accept' => 'application/json'])->assertCreated();

        $attachmentId = (int) $uploadResp->json('data.0.id');

        // Before assignment, technicianReporter cannot view someone else's case
        Sanctum::actingAs($technicianReporter);
        $this->getJson("/api/cases/{$caseId}")->assertForbidden();

        // Supervisor triages and assigns action to technicianReporter
        Sanctum::actingAs($fx['supervisor']);
        $this->postJson("/api/cases/{$caseId}/triage", [
            'decision' => 'assess',
            'severity' => 2,
            'likelihood' => 2,
        ])->assertOk();

        $this->postJson("/api/cases/{$caseId}/actions", [
            'action_type' => ActionType::Corrective->value,
            'title' => 'Kencangkan klem pipa vakum',
            'pic_user_id' => $technicianReporter->id,
        ])->assertCreated();

        // Now technicianReporter CAN view the case and its attachments!
        Sanctum::actingAs($technicianReporter);
        $this->getJson("/api/cases/{$caseId}")->assertOk();
        $this->get("/api/attachments/{$attachmentId}")->assertOk();

        // technicianReporter cannot delete reporter 1's attachment, but reporter 1 can while unlocked
        $this->deleteJson("/api/attachments/{$attachmentId}")->assertForbidden();

        Sanctum::actingAs($fx['reporter']);
        $this->deleteJson("/api/attachments/{$attachmentId}")->assertOk();
        $this->assertDatabaseMissing('attachments', ['id' => $attachmentId]);
    }
}

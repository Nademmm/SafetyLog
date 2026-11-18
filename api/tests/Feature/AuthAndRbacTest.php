<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\CreatesSafetyLogFixtures;
use Tests\TestCase;

class AuthAndRbacTest extends TestCase
{
    use CreatesSafetyLogFixtures, RefreshDatabase;

    public function test_users_can_login_persist_session_via_token_and_logout(): void
    {
        $fx = $this->createOrganizationFixture();
        $fx['reporter']->update(['password' => Hash::make('rahasia123')]);

        $loginResponse = $this->postJson('/api/auth/login', [
            'email' => $fx['reporter']->email,
            'password' => 'rahasia123',
        ]);

        $loginResponse->assertOk()
            ->assertJsonPath('token_type', 'Bearer')
            ->assertJsonPath('user.role', 'reporter')
            ->assertJsonPath('user.role_label', 'Pelapor')
            ->assertJsonPath('user.permissions.view_all_cases', false);

        $token = $loginResponse->json('token');

        $this->withToken($token)
            ->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonPath('user.id', $fx['reporter']->id);

        $this->withToken($token)
            ->postJson('/api/auth/logout')
            ->assertOk();

        // Ensure token was actually deleted from database
        $this->assertDatabaseCount('personal_access_tokens', 0);
    }

    public function test_login_is_rate_limited_after_five_failed_attempts(): void
    {
        $fx = $this->createOrganizationFixture();

        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/auth/login', [
                'email' => $fx['reporter']->email,
                'password' => 'wrong-password',
            ])->assertStatus(422);
        }

        $this->postJson('/api/auth/login', [
            'email' => $fx['reporter']->email,
            'password' => 'wrong-password',
        ])->assertStatus(429);
    }

    public function test_inactive_user_cannot_login(): void
    {
        $fx = $this->createOrganizationFixture();
        $fx['reporter']->update([
            'password' => Hash::make('password123'),
            'is_active' => false,
        ]);

        $this->postJson('/api/auth/login', [
            'email' => $fx['reporter']->email,
            'password' => 'password123',
        ])->assertStatus(403);
    }

    public function test_role_based_access_control_rejects_unauthorized_endpoints(): void
    {
        $fx = $this->createOrganizationFixture();

        Sanctum::actingAs($fx['reporter']);

        // Create a case as reporter
        $created = $this->postJson('/api/cases', [
            'machine_id' => $fx['machine']->id,
            'case_type_id' => $fx['abnormalityType']->id,
            'description' => 'Getaran mesin tidak normal di roller.',
        ])->assertCreated();

        $caseId = $created->json('data.id');

        // Pelapor cannot access triage queue, triage, add action, verify, reopen, dashboard, audit logs, archived machines, or master data
        $this->getJson('/api/cases')->assertForbidden();
        $this->getJson('/api/users/assignable')->assertForbidden();
        $this->getJson('/api/dashboard')->assertForbidden();
        $this->getJson('/api/audit-logs')->assertForbidden();
        $this->getJson('/api/machines?include_archived=1')->assertForbidden();
        $this->postJson('/api/machines', [
            'site_id' => $fx['site']->id,
            'area_id' => $fx['area']->id,
            'code' => 'MCH-FORBID',
            'name' => 'Mesin Terlarang',
        ])->assertForbidden();
        $this->postJson("/api/machines/{$fx['machine']->id}/regenerate-qr")->assertForbidden();
        $this->getJson('/api/users')->assertForbidden();
        $this->postJson("/api/cases/{$caseId}/triage", [
            'decision' => 'assess',
            'severity' => 3,
            'likelihood' => 3,
        ])->assertForbidden();
        $this->postJson("/api/cases/{$caseId}/actions", [
            'action_type' => 'corrective',
            'title' => 'Cek bearing',
            'pic_user_id' => $fx['supervisor']->id,
        ])->assertForbidden();
        $this->postJson("/api/cases/{$caseId}/verify", [
            'decision' => 'approve',
            'learning_summary' => 'Sudah dicek.',
        ])->assertForbidden();
        $this->postJson("/api/cases/{$caseId}/reopen", [
            'reason' => 'Pelapor tidak boleh membuka ulang kasus.',
        ])->assertForbidden();

        // Pelapor CAN scan QR token directly and read permissions matrix
        $this->getJson("/api/machines/qr/{$fx['machine']->qr_token}")
            ->assertOk()
            ->assertJsonPath('data.qr_token', $fx['machine']->qr_token);

        $this->getJson('/api/machines')
            ->assertOk()
            ->assertJsonMissingPath('data.0.qr_token')
            ->assertJsonMissingPath('data.0.qr_report_path');

        $this->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonPath('user.permissions.scan_qr', true)
            ->assertJsonPath('user.permissions.print_machine_qr', false)
            ->assertJsonPath('user.permissions.view_all_cases', false)
            ->assertJsonPath('user.permissions.complete_assigned_actions', true);

        // K3/Verifikator cannot triage cases or manage master data
        Sanctum::actingAs($fx['hse']);
        $this->postJson("/api/cases/{$caseId}/triage", [
            'decision' => 'assess',
            'severity' => 3,
            'likelihood' => 3,
        ])->assertForbidden();
        $this->getJson('/api/machines?include_archived=1')->assertForbidden();
        $this->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonPath('user.permissions.verify_case', true)
            ->assertJsonPath('user.permissions.reopen_case', true)
            ->assertJsonPath('user.permissions.triage_case', false)
            ->assertJsonPath('user.permissions.print_machine_qr', false);

        // Supervisor can triage and view dashboard/audit, cannot verify, reopen, or manage master data
        Sanctum::actingAs($fx['supervisor']);
        $this->getJson('/api/dashboard')->assertOk();
        $this->getJson('/api/audit-logs')->assertOk();
        $this->postJson("/api/cases/{$caseId}/verify", [
            'decision' => 'approve',
            'learning_summary' => 'Sudah dicek.',
        ])->assertForbidden();
        $this->postJson("/api/cases/{$caseId}/reopen", [
            'reason' => 'Supervisor tidak boleh membuka ulang kasus.',
        ])->assertForbidden();
        $this->getJson('/api/machines?include_archived=1')->assertForbidden();

        // Admin sees machine QR print tokens and archived query
        Sanctum::actingAs($fx['admin']);
        $this->getJson('/api/machines?include_archived=1')
            ->assertOk()
            ->assertJsonPath('data.0.qr_token', $fx['machine']->qr_token);
        $this->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonPath('user.permissions.print_machine_qr', true)
            ->assertJsonPath('user.permissions.manage_master_data', true);
    }
}

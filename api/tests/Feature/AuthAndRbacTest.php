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

        // Pelapor cannot access triage queue, triage, add action, verify, or assignable users (U8a)
        $this->getJson('/api/cases')->assertForbidden();
        $this->getJson('/api/users/assignable')->assertForbidden();
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

        // K3/Verifikator cannot triage cases
        Sanctum::actingAs($fx['hse']);
        $this->postJson("/api/cases/{$caseId}/triage", [
            'decision' => 'assess',
            'severity' => 3,
            'likelihood' => 3,
        ])->assertForbidden();

        // Supervisor can triage, cannot verify
        Sanctum::actingAs($fx['supervisor']);
        $this->postJson("/api/cases/{$caseId}/verify", [
            'decision' => 'approve',
            'learning_summary' => 'Sudah dicek.',
        ])->assertForbidden();
    }
}

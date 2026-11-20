<?php

namespace Tests\Feature;

use App\Enums\ActionStatus;
use App\Enums\ActionType;
use App\Enums\CaseStatus;
use App\Enums\UserRole;
use App\Models\Machine;
use App\Models\RiskConfig;
use App\Models\SafetyCase;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\CreatesSafetyLogFixtures;
use Tests\TestCase;

class AuditSecurityAndOptimizationTest extends TestCase
{
    use CreatesSafetyLogFixtures, RefreshDatabase;

    public function test_multi_tenant_case_numbers_do_not_collide_when_organizations_share_site_code(): void
    {
        $orgA = $this->createOrganizationFixture('ORGA', 'SITE-001');
        $orgB = $this->createOrganizationFixture('ORGB', 'SITE-001');

        Sanctum::actingAs($orgA['reporter']);
        $caseA = $this->postJson('/api/cases', [
            'machine_id' => $orgA['machine']->id,
            'case_type_id' => $orgA['abnormalityType']->id,
            'description' => 'Gangguan mesin di organisasi A.',
        ])->assertCreated();

        Sanctum::actingAs($orgB['reporter']);
        $caseB = $this->postJson('/api/cases', [
            'machine_id' => $orgB['machine']->id,
            'case_type_id' => $orgB['abnormalityType']->id,
            'description' => 'Gangguan mesin di organisasi B.',
        ])->assertCreated();

        $this->assertSame($caseA->json('data.case_number'), $caseB->json('data.case_number'));
    }

    public function test_auto_code_generator_handles_gaps_without_infinite_loop_and_accepts_optional_code(): void
    {
        $fx = $this->createOrganizationFixture('CODE', 'SBY1');
        Sanctum::actingAs($fx['admin']);

        // Create gap: existing code matches count + 1 ("MCH-002")
        Machine::query()->create([
            'organization_id' => $fx['organization']->id,
            'site_id' => $fx['site']->id,
            'area_id' => $fx['area']->id,
            'code' => 'MCH-003',
            'name' => 'Mesin Gap 03',
            'is_active' => true,
        ]);

        // Auto-generated code skips MCH-003 cleanly instead of looping infinitely
        $autoResp = $this->postJson('/api/machines', [
            'area_id' => $fx['area']->id,
            'name' => 'Mesin Auto Baru',
        ])->assertCreated();

        $this->assertSame('MCH-004', $autoResp->json('data.code'));

        // Explicit custom code is respected and uppercased
        $customResp = $this->postJson('/api/machines', [
            'area_id' => $fx['area']->id,
            'code' => 'mch-pack-99',
            'name' => 'Mesin Custom Code',
        ])->assertCreated();

        $this->assertSame('MCH-PACK-99', $customResp->json('data.code'));
    }

    public function test_reporter_is_blocked_from_similar_cases_and_historical_case_summary_enumeration(): void
    {
        $fx = $this->createOrganizationFixture();

        $otherReporter = User::factory()->withRole(UserRole::Reporter)->create([
            'organization_id' => $fx['organization']->id,
            'site_id' => $fx['site']->id,
        ]);

        Sanctum::actingAs($otherReporter);
        $ownCaseId = (int) $this->postJson('/api/cases', [
            'machine_id' => $fx['machine']->id,
            'case_type_id' => $fx['abnormalityType']->id,
            'description' => 'Konveyor berdecit saat shift pagi.',
        ])->assertCreated()->json('data.id');

        // Historical closed case created by another reporter
        $closedCase = SafetyCase::query()->create([
            'organization_id' => $fx['organization']->id,
            'site_id' => $fx['site']->id,
            'area_id' => $fx['area']->id,
            'machine_id' => $fx['machine']->id,
            'reporter_id' => $fx['reporter']->id,
            'case_type_id' => $fx['abnormalityType']->id,
            'case_number' => 'SL-SBY1-2026-8888',
            'description' => 'Laporan sensitif masa lalu.',
            'status' => CaseStatus::Closed,
            'is_locked' => true,
            'reported_at' => now()->subDays(30),
        ]);

        // Reporter CANNOT call /similar (prevents cross-user case leak)
        $this->getJson("/api/cases/{$ownCaseId}/similar")->assertForbidden();

        // Reporter CANNOT enumerate closed/old case summaries of other users
        $this->getJson("/api/cases/{$closedCase->id}/summary")->assertForbidden();

        // Supervisor CAN call /similar and /summary
        Sanctum::actingAs($fx['supervisor']);
        $this->getJson("/api/cases/{$ownCaseId}/similar")->assertOk();
        $this->getJson("/api/cases/{$closedCase->id}/summary")->assertOk();
    }

    public function test_reporting_on_machine_in_archived_area_is_rejected(): void
    {
        $fx = $this->createOrganizationFixture();

        $fx['area']->update([
            'is_active' => false,
            'archived_at' => now(),
        ]);

        Sanctum::actingAs($fx['reporter']);
        $this->postJson('/api/cases', [
            'machine_id' => $fx['machine']->id,
            'case_type_id' => $fx['abnormalityType']->id,
            'description' => 'Mencoba melapor pada area yang sudah diarsipkan.',
        ])->assertStatus(422)
            ->assertJsonPath('error_code', 'MACHINE_UNAVAILABLE');
    }

    public function test_audit_logs_include_safety_case_and_reject_verification_reopens_actions(): void
    {
        $fx = $this->createOrganizationFixture();

        Sanctum::actingAs($fx['reporter']);
        $caseId = (int) $this->postJson('/api/cases', [
            'machine_id' => $fx['machine']->id,
            'case_type_id' => $fx['abnormalityType']->id,
            'description' => 'Kebocoran pelumas pada roller.',
        ])->assertCreated()->json('data.id');

        Sanctum::actingAs($fx['supervisor']);
        $this->postJson("/api/cases/{$caseId}/triage", [
            'decision' => 'assess',
            'severity' => 2,
            'likelihood' => 2,
        ])->assertOk();

        $actionId = (int) $this->postJson("/api/cases/{$caseId}/actions", [
            'action_type' => ActionType::Corrective->value,
            'title' => 'Ganti seal roller',
            'pic_user_id' => $fx['reporter']->id,
        ])->assertCreated()->json('data.id');

        Sanctum::actingAs($fx['reporter']);
        $this->postJson("/api/actions/{$actionId}/complete", [
            'completion_note' => 'Seal diganti sementara.',
        ])->assertOk();

        // K3 rejects verification WITHOUT specifying reopen_action_ids -> actions auto-reopened so case isn't deadlocked
        Sanctum::actingAs($fx['hse']);
        $rejected = $this->postJson("/api/cases/{$caseId}/verify", [
            'decision' => 'reject',
            'rejection_reason' => 'Kebocoran masih terlihat saat uji jalan.',
        ])->assertOk();

        $rejected->assertJsonPath('data.status', CaseStatus::InProgress->value)
            ->assertJsonPath('data.actions.0.status', ActionStatus::Open->value);

        // Audit logs include safety_case_id & safety_case object
        $logs = $this->getJson('/api/audit-logs?date_from=invalid-date')->assertOk();
        $this->assertNotNull($logs->json('data.0.safety_case_id'));
        $this->assertNotNull($logs->json('data.0.safety_case.case_number'));
    }

    public function test_risk_config_rejects_overlap_and_configuration_validates_keys(): void
    {
        $fx = $this->createOrganizationFixture();
        Sanctum::actingAs($fx['admin']);

        $lowRisk = RiskConfig::query()
            ->forOrganization($fx['organization']->id)
            ->where('level', 'low')
            ->firstOrFail();

        // min_score > max_score rejected
        $this->patchJson("/api/risk-configs/{$lowRisk->id}", [
            'min_score' => 20,
        ])->assertStatus(422)
            ->assertJsonPath('error_code', 'INVALID_RISK_RANGE');

        // Overlap with medium (7..14) rejected
        $this->patchJson("/api/risk-configs/{$lowRisk->id}", [
            'max_score' => 10,
        ])->assertStatus(422)
            ->assertJsonPath('error_code', 'OVERLAPPING_RISK_RANGE');

        // Unknown configuration key rejected
        $this->putJson('/api/configurations/unknown_injected_key', [
            'value' => 123,
        ])->assertStatus(422)
            ->assertJsonPath('error_code', 'INVALID_CONFIGURATION_KEY');
    }

    public function test_change_password_revokes_other_sessions_and_store_user_normalizes_case_email(): void
    {
        $fx = $this->createOrganizationFixture();

        // Create two real tokens for reporter
        $tokenA = $fx['reporter']->createToken('device-a')->plainTextToken;
        $tokenB = $fx['reporter']->createToken('device-b')->plainTextToken;

        $this->withHeader('Authorization', 'Bearer '.$tokenA)
            ->postJson('/api/auth/change-password', [
                'current_password' => 'password',
                'password' => 'new-secure-password-123',
                'password_confirmation' => 'new-secure-password-123',
            ])
            ->assertOk();

        // Device B token should be revoked immediately
        $this->assertSame(1, $fx['reporter']->tokens()->count());

        // Case-variant duplicate email returns clean 422 validation error instead of 500
        Sanctum::actingAs($fx['admin']);
        $this->postJson('/api/users', [
            'name' => 'Duplicate Case User',
            'email' => strtoupper($fx['reporter']->email),
            'password' => 'password123',
            'role' => UserRole::Reporter->value,
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }
}

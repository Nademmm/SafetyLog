<?php

namespace Tests\Feature;

use App\Enums\ActionType;
use App\Enums\CaseStatus;
use App\Models\SafetyCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\CreatesSafetyLogFixtures;
use Tests\TestCase;

class DashboardAndNotificationsTest extends TestCase
{
    use CreatesSafetyLogFixtures, RefreshDatabase;

    public function test_dashboard_analytics_reports_open_overdue_closed_and_recurring_machines(): void
    {
        $fx = $this->createOrganizationFixture();

        Sanctum::actingAs($fx['reporter']);
        for ($i = 1; $i <= 3; $i++) {
            $caseId = (int) $this->postJson('/api/cases', [
                'machine_id' => $fx['machine']->id,
                'case_type_id' => $fx['abnormalityType']->id,
                'description' => "Gangguan mesin berulang ke-{$i}.",
            ])->assertCreated()->json('data.id');

            if ($i === 1) {
                Sanctum::actingAs($fx['supervisor']);
                $this->postJson("/api/cases/{$caseId}/triage", [
                    'decision' => 'assess',
                    'severity' => 4,
                    'likelihood' => 4,
                    'category_id' => $fx['mechanicalCategory']->id,
                ])->assertOk();

                $this->postJson("/api/cases/{$caseId}/actions", [
                    'action_type' => ActionType::Corrective->value,
                    'title' => 'Periksa poros konveyor',
                    'pic_user_id' => $fx['supervisor']->id,
                    'due_at' => now()->subDays(2)->toIso8601String(),
                ])->assertCreated();

                Sanctum::actingAs($fx['reporter']);
            }
        }

        // Add 1 closed case this month
        SafetyCase::query()->create([
            'organization_id' => $fx['organization']->id,
            'site_id' => $fx['site']->id,
            'area_id' => $fx['area']->id,
            'machine_id' => $fx['machine']->id,
            'reporter_id' => $fx['reporter']->id,
            'case_type_id' => $fx['abnormalityType']->id,
            'category_id' => $fx['mechanicalCategory']->id,
            'case_number' => 'SL-SBY1-2026-9999',
            'description' => 'Kasus selesai bulan ini.',
            'status' => CaseStatus::Closed,
            'is_locked' => true,
            'reported_at' => now()->subDays(3),
            'closed_at' => now()->subDay(),
        ]);

        // Reporter cannot access dashboard
        $this->getJson('/api/dashboard')->assertForbidden();

        // Admin / Manager views dashboard
        Sanctum::actingAs($fx['admin']);
        $this->getJson('/api/dashboard')
            ->assertOk()
            ->assertJsonPath('data.summary.open_cases_count', 3)
            ->assertJsonPath('data.summary.overdue_actions_count', 1)
            ->assertJsonPath('data.summary.closed_this_month_count', 1)
            ->assertJsonPath('data.summary.high_risk_open_count', 1)
            ->assertJsonPath('data.summary.recurring_machines_count', 1)
            ->assertJsonPath('data.cases_per_machine.0.is_recurring', true)
            ->assertJsonPath('data.cases_per_machine.0.recurring_label', 'Berulang')
            ->assertJsonPath('data.overdue_actions.0.overdue_label', 'Terlambat');
    }

    public function test_in_app_notifications_are_created_isolated_and_markable_as_read(): void
    {
        $fx = $this->createOrganizationFixture();

        // Reporter creates a case -> notifies Supervisor
        Sanctum::actingAs($fx['reporter']);
        $caseId = (int) $this->postJson('/api/cases', [
            'machine_id' => $fx['machine']->id,
            'case_type_id' => $fx['abnormalityType']->id,
            'description' => 'Kebocoran selang hidrolik.',
        ])->assertCreated()->json('data.id');

        Sanctum::actingAs($fx['supervisor']);
        $notifResp = $this->getJson('/api/notifications')->assertOk();
        $this->assertGreaterThanOrEqual(1, $notifResp->json('unread_count'));

        $notifId = (int) $notifResp->json('data.0.id');

        // Another user cannot mark Supervisor's notification as read
        Sanctum::actingAs($fx['hse']);
        $this->postJson("/api/notifications/{$notifId}/read")->assertForbidden();

        // Supervisor marks notification read, then triage + assign action to HSE
        Sanctum::actingAs($fx['supervisor']);
        $this->postJson("/api/notifications/{$notifId}/read")->assertOk();
        $this->postJson('/api/notifications/read-all')->assertOk();
        $this->getJson('/api/notifications')->assertJsonPath('unread_count', 0);

        $this->postJson("/api/cases/{$caseId}/triage", [
            'decision' => 'assess',
            'severity' => 2,
            'likelihood' => 2,
        ])->assertOk();

        $actionId = (int) $this->postJson("/api/cases/{$caseId}/actions", [
            'action_type' => ActionType::Corrective->value,
            'title' => 'Ganti selang',
            'pic_user_id' => $fx['hse']->id,
        ])->assertCreated()->json('data.id');

        // HSE received action_assigned notification
        Sanctum::actingAs($fx['hse']);
        $this->getJson('/api/notifications?unread_only=1')
            ->assertOk()
            ->assertJsonPath('unread_count', 1)
            ->assertJsonPath('data.0.type', 'action_assigned');

        // Complete action -> notifies eligible HSE/verifiers? Wait: HSE is PIC so excluded from verify notification; create second HSE to verify!
        $this->postJson("/api/actions/{$actionId}/complete", [
            'completion_note' => 'Selang baru terpasang.',
        ])->assertOk();
    }
}

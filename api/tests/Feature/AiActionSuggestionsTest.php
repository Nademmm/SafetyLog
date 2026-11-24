<?php

namespace Tests\Feature;

use App\Enums\ActionType;
use App\Enums\CaseStatus;
use App\Models\CaseAction;
use App\Models\SafetyCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\CreatesSafetyLogFixtures;
use Tests\Concerns\FakesNexusRouter;
use Tests\TestCase;

class AiActionSuggestionsTest extends TestCase
{
    use CreatesSafetyLogFixtures, FakesNexusRouter, RefreshDatabase;

    public function test_action_types_are_validated_and_suggestions_are_not_saved(): void
    {
        $fx = $this->createOrganizationFixture();
        $caseId = $this->createCase($fx);

        $this->fakeNexusRouter([
            'suggestions' => [
                [
                    'action_type' => 'temporary',
                    'title' => 'Hentikan mesin dan pasang rambu',
                    'description' => 'Isolasi mesin sebelum pemeriksaan lanjutan.',
                    'rationale' => 'Mesin bergetar keras dan berisiko bagi operator.',
                    'priority' => 'high',
                    'suggested_pic_role' => 'Operator area',
                ],
                [
                    'action_type' => 'unknown_type',
                    'title' => 'Tindakan tidak valid',
                    'description' => 'Harus ditolak.',
                    'rationale' => 'Tipe di luar enum.',
                ],
                [
                    'action_type' => 'Tindakan Korektif',
                    'title' => 'Perbaiki baut pelindung',
                    'description' => 'Kencangkan ulang baut pelindung mesin.',
                    'rationale' => 'Mengatasi bagian yang kendor.',
                    'priority' => 'medium',
                ],
                [
                    'action_type' => 'preventif',
                    'title' => 'Jadwalkan pelumasan bearing',
                    'description' => 'Lumasi bearing setiap minggu sesuai standar.',
                    'rationale' => 'Mencegah kejadian berulang.',
                    'priority' => 'medium',
                ],
            ],
            'limitations' => ['Detail teknis perlu dikonfirmasi teknisi kompeten.'],
        ]);

        Sanctum::actingAs($fx['supervisor']);

        $this->postJson("/api/cases/{$caseId}/action-suggestions")
            ->assertOk()
            ->assertJsonCount(3, 'data.suggestions')
            ->assertJsonPath('data.suggestions.0.action_type', ActionType::Temporary->value)
            ->assertJsonPath('data.suggestions.1.action_type', ActionType::Corrective->value)
            ->assertJsonPath('data.suggestions.2.action_type', ActionType::Preventive->value)
            ->assertJsonPath('data.suggestions.2.action_type_label', 'Preventif')
            ->assertJsonPath('data.requires_review', true);

        $this->assertSame(0, CaseAction::count());
        $this->assertSame(CaseStatus::New, SafetyCase::query()->findOrFail($caseId)->status);
    }

    public function test_reporter_cannot_request_action_suggestions(): void
    {
        $fx = $this->createOrganizationFixture();
        $caseId = $this->createCase($fx);
        $this->fakeNexusRouter(['suggestions' => []]);

        Sanctum::actingAs($fx['reporter']);

        $this->postJson("/api/cases/{$caseId}/action-suggestions")->assertForbidden();
    }

    public function test_normal_action_workflow_still_applies_after_suggestions(): void
    {
        $fx = $this->createOrganizationFixture();
        $caseId = $this->createCase($fx);

        $this->fakeNexusRouter([
            'suggestions' => [[
                'action_type' => 'preventive',
                'title' => 'Lumasi bearing',
                'description' => 'Lumasi bearing converter.',
                'rationale' => 'Pencegahan berulang.',
                'priority' => 'medium',
            ]],
        ]);

        Sanctum::actingAs($fx['supervisor']);
        $this->postJson("/api/cases/{$caseId}/action-suggestions")->assertOk();
        $this->postJson("/api/cases/{$caseId}/triage", [
            'decision' => 'assess',
            'severity' => 2,
            'likelihood' => 2,
            'category_id' => $fx['mechanicalCategory']->id,
        ])->assertOk();

        $this->postJson("/api/cases/{$caseId}/actions", [
            'action_type' => ActionType::Preventive->value,
            'title' => 'Lumasi bearing konveyor',
            'description' => 'Dikerjakan sesuai draft yang telah ditinjau.',
            'pic_user_id' => $fx['reporter']->id,
        ])->assertCreated();

        $this->assertSame(CaseStatus::InProgress, SafetyCase::query()->findOrFail($caseId)->status);
        $this->assertSame(1, CaseAction::count());
    }

    /**
     * @param  array<string, mixed>  $fx
     */
    private function createCase(array $fx): int
    {
        Sanctum::actingAs($fx['reporter']);

        return (int) $this->postJson('/api/cases', [
            'machine_id' => $fx['machine']->id,
            'case_type_id' => $fx['abnormalityType']->id,
            'description' => 'Bearing konveyor utama bergetar keras dan berbunyi saat beban penuh.',
        ])->assertCreated()->json('data.id');
    }
}

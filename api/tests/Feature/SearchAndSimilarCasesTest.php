<?php

namespace Tests\Feature;

use App\Enums\CaseStatus;
use App\Models\Machine;
use App\Models\SafetyCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\CreatesSafetyLogFixtures;
use Tests\TestCase;

class SearchAndSimilarCasesTest extends TestCase
{
    use CreatesSafetyLogFixtures, RefreshDatabase;

    public function test_typo_tolerant_search_finds_konveyor_when_searching_konvayor_u6(): void
    {
        $fx = $this->createOrganizationFixture();

        $boilerMachine = Machine::factory()->create([
            'organization_id' => $fx['organization']->id,
            'site_id' => $fx['site']->id,
            'area_id' => $fx['area']->id,
            'code' => 'MCH-BOIL-99',
            'name' => 'Boiler Uap Utama',
        ]);

        Sanctum::actingAs($fx['reporter']);
        $konveyorCaseId = (int) $this->postJson('/api/cases', [
            'machine_id' => $fx['machine']->id,
            'case_type_id' => $fx['abnormalityType']->id,
            'description' => 'Sabuk konveyor pengemasan selip dan berbunyi keras.',
        ])->assertCreated()->json('data.id');

        $this->postJson('/api/cases', [
            'machine_id' => $boilerMachine->id,
            'case_type_id' => $fx['abnormalityType']->id,
            'description' => 'Lampu indikator panel boiler padam total.',
        ])->assertCreated();

        Sanctum::actingAs($fx['supervisor']);

        // U6: searching with typo "konvayor" must still find the "konveyor" case
        $this->getJson('/api/cases?q=konvayor')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $konveyorCaseId);

        // Multi-word typo query also finds it
        $this->getJson('/api/cases?q=sabuk%20konveyro')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $konveyorCaseId);
    }

    public function test_similar_cases_and_machine_history_with_recurring_flag(): void
    {
        $fx = $this->createOrganizationFixture();

        Sanctum::actingAs($fx['reporter']);

        $firstId = (int) $this->postJson('/api/cases', [
            'machine_id' => $fx['machine']->id,
            'case_type_id' => $fx['abnormalityType']->id,
            'description' => 'Getaran tinggi pada bearing konveyor utama saat beban karton penuh.',
        ])->assertCreated()->json('data.id');

        // Close first case with root cause & learning summary
        Sanctum::actingAs($fx['supervisor']);
        SafetyCase::query()->whereKey($firstId)->update([
            'status' => CaseStatus::Closed,
            'is_locked' => true,
            'category_id' => $fx['mechanicalCategory']->id,
            'root_cause_summary' => 'Bearing sisi kanan kering dan aus.',
            'learning_summary' => 'Pelumasan bearing mingguan mencegah selip konveyor.',
        ]);

        Sanctum::actingAs($fx['reporter']);
        $secondId = (int) $this->postJson('/api/cases', [
            'machine_id' => $fx['machine']->id,
            'case_type_id' => $fx['abnormalityType']->id,
            'description' => 'Bearing konveyor utama kembali bergetar saat beban penuh.',
        ])->assertCreated()->json('data.id');

        // 3rd case on same machine triggers C-01 "Berulang" (>= 3 cases in 90 days)
        $this->postJson('/api/cases', [
            'machine_id' => $fx['machine']->id,
            'case_type_id' => $fx['abnormalityType']->id,
            'description' => 'Rantai penggerak konveyor kendor lagi.',
        ])->assertCreated();

        Sanctum::actingAs($fx['supervisor']);

        $similar = $this->getJson("/api/cases/{$secondId}/similar")
            ->assertOk()
            ->assertJsonPath('method', 'text_similarity');

        $this->assertGreaterThanOrEqual(1, count($similar->json('data')));
        $this->assertSame($firstId, $similar->json('data.0.id'));

        $this->getJson("/api/machines/{$fx['machine']->id}/cases")
            ->assertOk()
            ->assertJsonPath('is_recurring', true)
            ->assertJsonPath('recurring_label', 'Berulang')
            ->assertJsonPath('cases_last_90_days', 3)
            ->assertJsonCount(3, 'data');
    }
}

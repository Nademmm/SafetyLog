<?php

namespace Tests\Feature;

use App\Enums\CaseStatus;
use App\Enums\UserRole;
use App\Models\SafetyCase;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\CreatesSafetyLogFixtures;
use Tests\Concerns\FakesNexusRouter;
use Tests\TestCase;

class AiSimilarCasesTest extends TestCase
{
    use CreatesSafetyLogFixtures, FakesNexusRouter, RefreshDatabase;

    public function test_database_candidates_are_analysed_and_duplicate_is_flagged(): void
    {
        $fx = $this->createOrganizationFixture();

        Sanctum::actingAs($fx['reporter']);
        $historicalId = (int) $this->postJson('/api/cases', [
            'machine_id' => $fx['machine']->id,
            'case_type_id' => $fx['abnormalityType']->id,
            'description' => 'Bearing konveyor utama bergetar keras dan berbunyi saat beban karton penuh.',
        ])->assertCreated()->json('data.id');

        SafetyCase::query()->whereKey($historicalId)->update([
            'status' => CaseStatus::Closed,
            'category_id' => $fx['mechanicalCategory']->id,
            'root_cause_summary' => 'Bearing kering dan aus.',
            'learning_summary' => 'Lumasi bearing setiap minggu.',
        ]);

        $this->fakeNexusRouter([
            'matches' => [[
                'case_id' => $historicalId,
                'similarity_reason' => 'Gejala getaran bearing konveyor sangat mirip.',
                'differences' => ['Dampak produksi belum dilaporkan pada kasus lama.'],
                'duplicate_assessment' => 'possible_duplicate',
            ]],
            'summary' => 'Satu kasus perlu ditinjau sebagai kemungkinan duplikat.',
        ]);

        Sanctum::actingAs($fx['supervisor']);

        $this->postJson('/api/ai/similar-analysis', [
            'description' => 'Bearing konveyor utama kembali bergetar keras saat beban karton penuh.',
            'machine_id' => $fx['machine']->id,
        ])
            ->assertOk()
            ->assertJsonPath('data.source', 'case_search_service')
            ->assertJsonPath('data.possible_duplicate', true)
            ->assertJsonPath('data.matches.0.id', $historicalId)
            ->assertJsonPath('data.matches.0.duplicate_assessment', 'possible_duplicate')
            ->assertJsonPath('data.matches.0.similarity_reason', 'Gejala getaran bearing konveyor sangat mirip.');

        Http::assertSent(function ($request) use ($historicalId): bool {
            $body = $request->data();
            $prompt = $body['messages'][1]['content'] ?? '';

            return str_contains($prompt, (string) $historicalId)
                && str_contains($prompt, 'Bearing konveyor utama');
        });
    }

    public function test_case_route_accepts_payload_without_separate_description(): void
    {
        $fx = $this->createOrganizationFixture();

        Sanctum::actingAs($fx['reporter']);
        $historicalId = (int) $this->postJson('/api/cases', [
            'machine_id' => $fx['machine']->id,
            'case_type_id' => $fx['abnormalityType']->id,
            'description' => 'Bearing konveyor utama bergetar keras saat beban karton penuh.',
        ])->assertCreated()->json('data.id');
        $targetId = (int) $this->postJson('/api/cases', [
            'machine_id' => $fx['machine']->id,
            'case_type_id' => $fx['abnormalityType']->id,
            'description' => 'Bearing konveyor utama kembali bergetar keras saat beban karton penuh.',
        ])->assertCreated()->json('data.id');

        SafetyCase::query()->whereKey($historicalId)->update([
            'status' => CaseStatus::Closed,
            'category_id' => $fx['mechanicalCategory']->id,
            'root_cause_summary' => 'Bearing kering dan aus.',
            'learning_summary' => 'Lumasi bearing setiap minggu.',
        ]);

        $this->fakeNexusRouter([
            'matches' => [[
                'case_id' => $historicalId,
                'similarity_reason' => 'Getaran bearing konveyor sangat mirip.',
                'duplicate_assessment' => 'needs_review',
            ]],
            'summary' => 'Satu kasus historis perlu ditinjau.',
        ]);

        Sanctum::actingAs($fx['supervisor']);

        $this->postJson("/api/cases/{$targetId}/similar-analysis", ['limit' => 5])
            ->assertOk()
            ->assertJsonPath('data.source', 'case_search_service')
            ->assertJsonPath('data.matches.0.id', $historicalId);

        Http::assertSent(function ($request): bool {
            $body = $request->data();

            return str_contains((string) ($body['messages'][1]['content'] ?? ''), 'kandidat');
        });
    }

    public function test_fabricated_case_id_is_never_returned(): void
    {
        $fx = $this->createOrganizationFixture();

        Sanctum::actingAs($fx['reporter']);
        $historicalId = (int) $this->postJson('/api/cases', [
            'machine_id' => $fx['machine']->id,
            'case_type_id' => $fx['abnormalityType']->id,
            'description' => 'Bearing konveyor bergetar keras dan berbunyi saat beban penuh.',
        ])->assertCreated()->json('data.id');

        $this->fakeNexusRouter([
            'matches' => [[
                'case_id' => 999999,
                'similarity_reason' => 'Kasus tidak nyata.',
                'duplicate_assessment' => 'possible_duplicate',
            ]],
            'summary' => 'Tidak ada kandidat valid.',
        ]);

        Sanctum::actingAs($fx['supervisor']);

        $this->postJson('/api/ai/similar-analysis', [
            'description' => 'Bearing konveyor bergetar keras saat beban penuh.',
        ])
            ->assertOk()
            ->assertJsonPath('data.possible_duplicate', false)
            ->assertJsonCount(0, 'data.matches');

        $this->assertNotSame(999999, $historicalId);
    }

    public function test_empty_candidates_do_not_call_ai(): void
    {
        $fx = $this->createOrganizationFixture();
        $this->fakeNexusRouter(['matches' => [], 'summary' => 'Tidak ada.']);

        Sanctum::actingAs($fx['supervisor']);

        $this->postJson('/api/ai/similar-analysis', [
            'description' => 'Kebocoran oli pada mesin pengemas utama lantai dua.',
        ])
            ->assertOk()
            ->assertJsonCount(0, 'data.matches')
            ->assertJsonPath('data.possible_duplicate', false)
            ->assertJsonPath('data.matches', []);

        Http::assertNothingSent();
    }

    public function test_reporter_does_not_receive_cases_they_cannot_view(): void
    {
        $fx = $this->createOrganizationFixture();

        Sanctum::actingAs($fx['reporter']);
        $this->postJson('/api/cases', [
            'machine_id' => $fx['machine']->id,
            'case_type_id' => $fx['abnormalityType']->id,
            'description' => 'Bearing konveyor bergetar keras dan berbunyi saat beban penuh.',
        ])->assertCreated();

        $otherReporter = User::factory()
            ->withRole(UserRole::Reporter)
            ->create(['organization_id' => $fx['organization']->id, 'site_id' => $fx['site']->id]);
        $this->fakeNexusRouter(['matches' => [], 'summary' => 'Tidak ada.']);

        Sanctum::actingAs($otherReporter);

        $this->postJson('/api/ai/similar-analysis', [
            'description' => 'Bearing konveyor bergetar keras dan berbunyi saat beban penuh.',
        ])
            ->assertOk()
            ->assertJsonCount(0, 'data.matches');

        Http::assertNothingSent();
    }

    public function test_other_organization_history_is_never_sent_to_ai(): void
    {
        $fx = $this->createOrganizationFixture();
        $other = $this->createOrganizationFixture('ORG2', 'SBY2');

        Sanctum::actingAs($other['reporter']);
        $this->postJson('/api/cases', [
            'machine_id' => $other['machine']->id,
            'case_type_id' => $other['abnormalityType']->id,
            'description' => 'Rahasia organisasi lain bearing konveyor bergetar keras.',
        ])->assertCreated();

        $this->fakeNexusRouter(['matches' => [], 'summary' => 'Tidak ada kandidat.']);

        Sanctum::actingAs($fx['supervisor']);

        $this->postJson('/api/ai/similar-analysis', [
            'description' => 'Bearing konveyor bergetar keras di organisasi pertama.',
        ])->assertOk()->assertJsonCount(0, 'data.matches');

        Http::assertNothingSent();
    }
}

<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\CreatesSafetyLogFixtures;
use Tests\Concerns\FakesNexusRouter;
use Tests\TestCase;

class AiDashboardSummaryTest extends TestCase
{
    use CreatesSafetyLogFixtures, FakesNexusRouter, RefreshDatabase;

    public function test_summary_uses_only_dashboard_aggregates(): void
    {
        $fx = $this->createOrganizationFixture();
        $this->createTwoCases($fx);

        $this->fakeNexusRouter([
            'headline' => 'Dua laporan tercatat pada organisasi ini.',
            'key_findings' => ['Seluruh kasus masih berstatus baru.'],
            'trend_observations' => ['Data historis belum cukup untuk menyimpulkan tren.'],
            'suggested_follow_ups' => ['Lakukan triase terhadap laporan baru.'],
            'data_limitations' => ['Periode pembanding tidak tersedia.'],
        ]);

        Sanctum::actingAs($fx['supervisor']);

        $response = $this->postJson('/api/ai/dashboard-summary')
            ->assertOk()
            ->assertJsonPath('data.headline', 'Dua laporan tercatat pada organisasi ini.')
            ->assertJsonPath('data.period.scope', 'all_available')
            ->assertJsonPath('data.statistics.total_cases', 2)
            ->assertJsonCount(1, 'data.data_limitations');

        $this->assertSame(2, collect($response->json('data.statistics.cases_by_status'))
            ->sum('total_cases'));

        Http::assertSent(function ($request): bool {
            $prompt = $request->data()['messages'][1]['content'] ?? '';

            return str_contains($prompt, '"total_cases":2')
                && str_contains($prompt, '"open_cases":2')
                && str_contains($prompt, '"scope":"all_available"')
                && str_contains($prompt, '"metric_definitions"');
        });
    }

    public function test_other_organization_cases_are_excluded(): void
    {
        $fx = $this->createOrganizationFixture();
        $other = $this->createOrganizationFixture('ORG2', 'SBY2');
        $this->createTwoCases($fx);

        Sanctum::actingAs($other['reporter']);
        $this->postJson('/api/cases', [
            'machine_id' => $other['machine']->id,
            'case_type_id' => $other['abnormalityType']->id,
            'description' => 'Rahasia organisasi kedua dengan deskripsi panjang.',
        ])->assertCreated();

        $this->fakeNexusRouter([
            'headline' => 'Ringkasan organisasi pertama.',
            'key_findings' => ['Dua kasus milik organisasi pertama.'],
        ]);

        Sanctum::actingAs($fx['supervisor']);

        $this->postJson('/api/ai/dashboard-summary')
            ->assertOk()
            ->assertJsonPath('data.statistics.total_cases', 2);

        Http::assertSent(function ($request): bool {
            $prompt = $request->data()['messages'][1]['content'] ?? '';

            return ! str_contains($prompt, 'Rahasia organisasi kedua');
        });
    }

    public function test_empty_dashboard_data_is_handled(): void
    {
        $fx = $this->createOrganizationFixture();
        $this->fakeNexusRouter([
            'headline' => 'Belum ada laporan.',
            'key_findings' => ['Tidak ada kasus yang dianalisis.'],
            'data_limitations' => ['Belum ada data untuk diringkas.'],
        ]);

        Sanctum::actingAs($fx['supervisor']);

        $this->postJson('/api/ai/dashboard-summary')
            ->assertOk()
            ->assertJsonPath('data.statistics.total_cases', 0)
            ->assertJsonPath('data.data_limitations.0', 'Belum ada data untuk diringkas.');
    }

    public function test_refresh_regenerates_summary_when_requested(): void
    {
        $fx = $this->createOrganizationFixture();
        $this->fakeNexusRouter([
            'headline' => 'Ringkasan.',
            'key_findings' => ['Belum ada kasus.'],
        ]);

        Sanctum::actingAs($fx['supervisor']);

        $this->postJson('/api/ai/dashboard-summary')->assertOk();
        $this->travel(1)->seconds();
        $this->postJson('/api/ai/dashboard-summary')->assertOk();
        Http::assertSentCount(1);

        $this->postJson('/api/ai/dashboard-summary', ['refresh' => true])->assertOk();
        Http::assertSentCount(2);
    }

    public function test_reporter_cannot_access_dashboard_summary(): void
    {
        $fx = $this->createOrganizationFixture();
        $this->fakeNexusRouter(['headline' => 'Ringkasan.', 'key_findings' => ['A.']]);

        Sanctum::actingAs($fx['reporter']);

        $this->postJson('/api/ai/dashboard-summary')->assertForbidden();
        Http::assertNothingSent();
    }

    /**
     * @param  array<string, mixed>  $fx
     */
    private function createTwoCases(array $fx): void
    {
        Sanctum::actingAs($fx['reporter']);

        foreach ([
            'Bearing konveyor bergetar keras saat beban penuh.',
            'Sabuk konveyor utama selip dan mengeluarkan suara keras.',
        ] as $description) {
            $this->postJson('/api/cases', [
                'machine_id' => $fx['machine']->id,
                'case_type_id' => $fx['abnormalityType']->id,
                'description' => $description,
            ])->assertCreated();
        }
    }
}

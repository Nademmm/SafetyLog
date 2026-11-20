<?php

namespace Tests\Feature;

use App\Enums\CaseStatus;
use App\Models\SafetyCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\CreatesSafetyLogFixtures;
use Tests\Concerns\FakesNexusRouter;
use Tests\TestCase;

class AiTriageSuggestionTest extends TestCase
{
    use CreatesSafetyLogFixtures, FakesNexusRouter, RefreshDatabase;

    public function test_triage_suggestion_uses_valid_category_and_application_scale_without_saving(): void
    {
        $fx = $this->createOrganizationFixture();
        $this->fakeNexusRouter([
            'category_id' => $fx['mechanicalCategory']->id,
            'severity' => 4,
            'likelihood' => 3,
            'reasoning' => ['Deskripsi menyebut getaran pada bearing konveyor.'],
            'additional_information' => ['Durasi getaran belum disebutkan.'],
        ]);

        Sanctum::actingAs($fx['supervisor']);

        $this->postJson('/api/ai/triage-suggestion', [
            'description' => 'Getaran keras pada bearing konveyor utama saat beban karton penuh.',
            'case_type_id' => $fx['abnormalityType']->id,
        ])
            ->assertOk()
            ->assertJsonPath('data.category_id', $fx['mechanicalCategory']->id)
            ->assertJsonPath('data.category_name', $fx['mechanicalCategory']->name)
            ->assertJsonPath('data.severity', 4)
            ->assertJsonPath('data.likelihood', 3)
            ->assertJsonPath('data.scale_max', 5)
            ->assertJsonPath('data.requires_review', true)
            ->assertJsonPath('meta.generated_by', 'nexusrouter_ai');

        $this->assertSame(0, SafetyCase::count());
    }

    public function test_invalid_category_is_rejected(): void
    {
        $fx = $this->createOrganizationFixture();
        $this->fakeNexusRouter([
            'category_id' => 999999,
            'severity' => 3,
            'likelihood' => 2,
            'reasoning' => ['Alasan.'],
        ]);

        Sanctum::actingAs($fx['supervisor']);

        $this->postJson('/api/ai/triage-suggestion', [
            'description' => 'Bearing konveyor utama bergetar keras saat beroperasi.',
        ])
            ->assertStatus(503)
            ->assertJsonPath('error_code', 'AI_UNAVAILABLE');
    }

    public function test_out_of_scale_severity_is_rejected(): void
    {
        $fx = $this->createOrganizationFixture();
        $this->fakeNexusRouter([
            'category_id' => $fx['mechanicalCategory']->id,
            'severity' => 9,
            'likelihood' => 2,
            'reasoning' => ['Alasan.'],
        ]);

        Sanctum::actingAs($fx['supervisor']);

        $this->postJson('/api/ai/triage-suggestion', [
            'description' => 'Bearing konveyor utama bergetar keras saat beroperasi.',
        ])->assertStatus(503);
    }

    public function test_incomplete_description_is_rejected_before_calling_ai(): void
    {
        $fx = $this->createOrganizationFixture();
        $this->fakeNexusRouter(['category_id' => 1]);

        Sanctum::actingAs($fx['supervisor']);

        $this->postJson('/api/ai/triage-suggestion', ['description' => 'abc'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('description');

        Http::assertNothingSent();
    }

    public function test_case_from_another_organization_cannot_be_used_as_context(): void
    {
        $fx = $this->createOrganizationFixture();
        $other = $this->createOrganizationFixture('ORG2', 'SBY2');
        $this->fakeNexusRouter(['category_id' => 1]);

        Sanctum::actingAs($other['reporter']);
        $caseId = (int) $this->postJson('/api/cases', [
            'machine_id' => $other['machine']->id,
            'case_type_id' => $other['abnormalityType']->id,
            'description' => 'Kasus rahasia organisasi lain dengan deskripsi panjang.',
        ])->assertCreated()->json('data.id');

        Sanctum::actingAs($fx['supervisor']);

        $this->postJson('/api/ai/triage-suggestion', [
            'case_id' => $caseId,
            'description' => 'Deskripsi pengganti yang tidak boleh dipakai.',
        ])->assertForbidden();

        Http::assertNothingSent();
    }

    public function test_suggestion_does_not_modify_existing_case(): void
    {
        $fx = $this->createOrganizationFixture();
        $this->fakeNexusRouter([
            'category_id' => $fx['mechanicalCategory']->id,
            'severity' => 5,
            'likelihood' => 5,
            'reasoning' => ['Risiko tinggi karena mesin berhenti.'],
        ]);

        Sanctum::actingAs($fx['reporter']);
        $caseId = (int) $this->postJson('/api/cases', [
            'machine_id' => $fx['machine']->id,
            'case_type_id' => $fx['abnormalityType']->id,
            'description' => 'Mesin berhenti total akibat sabuk putus.',
        ])->assertCreated()->json('data.id');

        Sanctum::actingAs($fx['supervisor']);

        $this->postJson('/api/ai/triage-suggestion', ['case_id' => $caseId])
            ->assertOk()
            ->assertJsonPath('data.severity', 5);

        $case = SafetyCase::query()->findOrFail($caseId);
        $this->assertNull($case->severity);
        $this->assertNull($case->risk_score);
        $this->assertSame(CaseStatus::New->value, $case->status->value);
    }
}

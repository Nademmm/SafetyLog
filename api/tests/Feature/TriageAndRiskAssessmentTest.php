<?php

namespace Tests\Feature;

use App\Enums\CaseStatus;
use App\Enums\RiskLevel;
use App\Models\Configuration;
use App\Models\RiskConfig;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\CreatesSafetyLogFixtures;
use Tests\TestCase;

class TriageAndRiskAssessmentTest extends TestCase
{
    use CreatesSafetyLogFixtures, RefreshDatabase;

    public function test_supervisor_can_assess_risk_scores_using_config_table(): void
    {
        $fx = $this->createOrganizationFixture();

        $createCase = function (string $desc) use ($fx): int {
            Sanctum::actingAs($fx['reporter']);

            return (int) $this->postJson('/api/cases', [
                'machine_id' => $fx['machine']->id,
                'case_type_id' => $fx['abnormalityType']->id,
                'description' => $desc,
            ])->assertCreated()->json('data.id');
        };

        $lowCaseId = $createCase('Kasus 2x3 rendah');
        $mediumCaseId = $createCase('Kasus 3x3 sedang');
        $highCaseId16 = $createCase('Kasus 4x4 tinggi');
        $highCaseId25 = $createCase('Kasus 5x5 tinggi maksimum');

        Sanctum::actingAs($fx['supervisor']);

        // 2 x 3 = 6 -> Rendah
        $this->postJson("/api/cases/{$lowCaseId}/triage", [
            'decision' => 'assess',
            'severity' => 2,
            'likelihood' => 3,
            'category_id' => $fx['mechanicalCategory']->id,
            'assigned_pic_id' => $fx['supervisor']->id,
        ])->assertOk()
            ->assertJsonPath('data.status', CaseStatus::Assessed->value)
            ->assertJsonPath('data.risk_assessment.risk_score', 6)
            ->assertJsonPath('data.risk_assessment.risk_level', RiskLevel::Low->value)
            ->assertJsonPath('data.risk_assessment.risk_level_label', 'Rendah');

        // 3 x 3 = 9 -> Sedang
        $this->postJson("/api/cases/{$mediumCaseId}/triage", [
            'decision' => 'assess',
            'severity' => 3,
            'likelihood' => 3,
        ])->assertOk()
            ->assertJsonPath('data.risk_assessment.risk_score', 9)
            ->assertJsonPath('data.risk_assessment.risk_level', RiskLevel::Medium->value);

        // 4 x 4 = 16 -> Tinggi (U3)
        $this->postJson("/api/cases/{$highCaseId16}/triage", [
            'decision' => 'assess',
            'severity' => 4,
            'likelihood' => 4,
        ])->assertOk()
            ->assertJsonPath('data.risk_assessment.risk_score', 16)
            ->assertJsonPath('data.risk_assessment.risk_level', RiskLevel::High->value)
            ->assertJsonPath('data.risk_assessment.risk_level_label', 'Tinggi');

        // 5 x 5 = 25 -> Tinggi
        $this->postJson("/api/cases/{$highCaseId25}/triage", [
            'decision' => 'assess',
            'severity' => 5,
            'likelihood' => 5,
        ])->assertOk()
            ->assertJsonPath('data.risk_assessment.risk_score', 25)
            ->assertJsonPath('data.risk_assessment.risk_level', RiskLevel::High->value);
    }

    public function test_risk_thresholds_and_matrix_scale_are_driven_by_database_config(): void
    {
        $fx = $this->createOrganizationFixture();

        // Switch organization to 3x3 risk matrix via DB config only (Panduan Section 11 example)
        Configuration::query()
            ->forOrganization($fx['organization']->id)
            ->where('key', 'risk_matrix_max_scale')
            ->update(['value' => 3]);

        RiskConfig::query()
            ->forOrganization($fx['organization']->id)
            ->where('level', RiskLevel::Low->value)
            ->update(['min_score' => 1, 'max_score' => 2]);

        RiskConfig::query()
            ->forOrganization($fx['organization']->id)
            ->where('level', RiskLevel::Medium->value)
            ->update(['min_score' => 3, 'max_score' => 5]);

        RiskConfig::query()
            ->forOrganization($fx['organization']->id)
            ->where('level', RiskLevel::High->value)
            ->update(['min_score' => 6, 'max_score' => 9]);

        Sanctum::actingAs($fx['reporter']);
        $caseId = $this->postJson('/api/cases', [
            'machine_id' => $fx['machine']->id,
            'case_type_id' => $fx['abnormalityType']->id,
            'description' => 'Uji matriks 3x3 dari tabel konfigurasi.',
        ])->assertCreated()->json('data.id');

        Sanctum::actingAs($fx['supervisor']);

        // Score 4 x 4 exceeds 3x3 max scale -> rejected
        $this->postJson("/api/cases/{$caseId}/triage", [
            'decision' => 'assess',
            'severity' => 4,
            'likelihood' => 4,
        ])->assertStatus(422)
            ->assertJsonPath('error_code', 'INVALID_RISK_SCALE');

        // 2 x 3 = 6 -> now Tinggi under 3x3 config!
        $this->postJson("/api/cases/{$caseId}/triage", [
            'decision' => 'assess',
            'severity' => 2,
            'likelihood' => 3,
        ])->assertOk()
            ->assertJsonPath('data.risk_assessment.risk_score', 6)
            ->assertJsonPath('data.risk_assessment.risk_level', RiskLevel::High->value);
    }

    public function test_supervisor_can_reject_or_mark_case_as_duplicate(): void
    {
        $fx = $this->createOrganizationFixture();

        Sanctum::actingAs($fx['reporter']);
        $originalId = $this->postJson('/api/cases', [
            'machine_id' => $fx['machine']->id,
            'case_type_id' => $fx['abnormalityType']->id,
            'description' => 'Laporan asli gangguan motor penggerak.',
        ])->assertCreated()->json('data.id');

        $duplicateId = $this->postJson('/api/cases', [
            'machine_id' => $fx['machine']->id,
            'case_type_id' => $fx['abnormalityType']->id,
            'description' => 'Laporan ganda gangguan motor penggerak.',
        ])->assertCreated()->json('data.id');

        $invalidId = $this->postJson('/api/cases', [
            'machine_id' => $fx['machine']->id,
            'case_type_id' => $fx['abnormalityType']->id,
            'description' => 'Laporan uji coba tidak valid.',
        ])->assertCreated()->json('data.id');

        Sanctum::actingAs($fx['supervisor']);

        // Missing rejection reason fails
        $this->postJson("/api/cases/{$invalidId}/triage", [
            'decision' => 'reject',
        ])->assertStatus(422);

        $this->postJson("/api/cases/{$invalidId}/triage", [
            'decision' => 'reject',
            'rejection_reason' => 'Operator salah tekan saat pelatihan.',
        ])->assertOk()
            ->assertJsonPath('data.status', CaseStatus::Rejected->value)
            ->assertJsonPath('data.is_locked', true);

        // Self-duplicate rejected
        $this->postJson("/api/cases/{$duplicateId}/triage", [
            'decision' => 'duplicate',
            'duplicate_of_case_id' => $duplicateId,
            'rejection_reason' => 'Sama.',
        ])->assertStatus(422);

        // Valid duplicate
        $this->postJson("/api/cases/{$duplicateId}/triage", [
            'decision' => 'duplicate',
            'duplicate_of_case_id' => $originalId,
            'rejection_reason' => 'Sama dengan laporan sebelumnya di shift pagi.',
        ])->assertOk()
            ->assertJsonPath('data.status', CaseStatus::Duplicate->value)
            ->assertJsonPath('data.risk_assessment.duplicate_of.id', $originalId);

        // Triage queue filter works
        $this->getJson('/api/cases?status=new')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $originalId);
    }
}

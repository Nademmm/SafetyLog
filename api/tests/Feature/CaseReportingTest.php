<?php

namespace Tests\Feature;

use App\Enums\CaseStatus;
use App\Models\SafetyCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\CreatesSafetyLogFixtures;
use Tests\TestCase;

class CaseReportingTest extends TestCase
{
    use CreatesSafetyLogFixtures, RefreshDatabase;

    public function test_reporter_can_scan_qr_and_submit_case_with_auto_number_and_photo(): void
    {
        Storage::fake('local');
        $fx = $this->createOrganizationFixture('PNS', 'SBY1');

        Sanctum::actingAs($fx['reporter']);

        $this->getJson('/api/machines/qr/'.$fx['machine']->qr_token)
            ->assertOk()
            ->assertJsonPath('machine.id', $fx['machine']->id)
            ->assertJsonPath('open_cases_warning.has_open_cases', false);

        $photo = UploadedFile::fake()->image('conveyor.jpg', 800, 600);

        $response = $this->post('/api/cases', [
            'machine_id' => $fx['machine']->id,
            'case_type_id' => $fx['abnormalityType']->id,
            'description' => 'Belt konveyor miring ke kanan dan mengeluarkan bunyi berdecit.',
            'is_machine_stopped' => 1,
            'has_affected_people' => 0,
            'photos' => [$photo],
        ], ['Accept' => 'application/json']);

        $year = now()->format('Y');

        $response->assertCreated()
            ->assertJsonPath('data.case_number', "SL-SBY1-{$year}-0001")
            ->assertJsonPath('data.status', CaseStatus::New->value)
            ->assertJsonPath('data.status_label', 'Baru')
            ->assertJsonPath('emergency_reminder', null)
            ->assertJsonCount(1, 'data.attachments');

        $attachmentId = $response->json('data.attachments.0.id');
        $this->get("/api/attachments/{$attachmentId}")->assertOk();

        // Second case increments sequence cleanly
        $second = $this->postJson('/api/cases', [
            'machine_id' => $fx['machine']->id,
            'case_type_id' => $fx['abnormalityType']->id,
            'description' => 'Sensor fotoelektrik kotor sehingga tidak membaca karton.',
        ])->assertCreated();

        $second->assertJsonPath('data.case_number', "SL-SBY1-{$year}-0002");
    }

    public function test_incident_with_affected_people_returns_emergency_reminder(): void
    {
        $fx = $this->createOrganizationFixture();
        Sanctum::actingAs($fx['reporter']);

        $response = $this->postJson('/api/cases', [
            'machine_id' => $fx['machine']->id,
            'case_type_id' => $fx['incidentType']->id,
            'description' => 'Tangan operator terjepit ringan di penutup pengaman yang longgar.',
            'is_machine_stopped' => true,
            'has_affected_people' => true,
        ]);

        $response->assertCreated();
        $this->assertNotNull($response->json('emergency_reminder'));
        $this->assertStringContainsString('prosedur darurat', $response->json('emergency_reminder'));
    }

    public function test_invalid_photo_upload_is_rejected(): void
    {
        Storage::fake('local');
        $fx = $this->createOrganizationFixture();
        Sanctum::actingAs($fx['reporter']);

        $pdf = UploadedFile::fake()->create('document.pdf', 200, 'application/pdf');

        $this->post('/api/cases', [
            'machine_id' => $fx['machine']->id,
            'case_type_id' => $fx['abnormalityType']->id,
            'description' => 'Laporan dengan file bukan gambar.',
            'photos' => [$pdf],
        ], ['Accept' => 'application/json'])->assertStatus(422);
    }

    public function test_open_case_warning_triggers_within_seven_days_but_allows_submission(): void
    {
        $fx = $this->createOrganizationFixture();
        Sanctum::actingAs($fx['reporter']);

        // Older than 7 days open case should NOT trigger warning
        SafetyCase::query()->create([
            'organization_id' => $fx['organization']->id,
            'site_id' => $fx['site']->id,
            'area_id' => $fx['area']->id,
            'machine_id' => $fx['machine']->id,
            'reporter_id' => $fx['reporter']->id,
            'case_type_id' => $fx['abnormalityType']->id,
            'case_number' => 'SL-OLD-2026-0001',
            'description' => 'Kasus lama lebih dari 7 hari.',
            'status' => CaseStatus::InProgress,
            'reported_at' => now()->subDays(10),
        ]);

        // Closed recent case should NOT trigger warning
        SafetyCase::query()->create([
            'organization_id' => $fx['organization']->id,
            'site_id' => $fx['site']->id,
            'area_id' => $fx['area']->id,
            'machine_id' => $fx['machine']->id,
            'reporter_id' => $fx['reporter']->id,
            'case_type_id' => $fx['abnormalityType']->id,
            'case_number' => 'SL-DONE-2026-0002',
            'description' => 'Kasus yang sudah ditutup.',
            'status' => CaseStatus::Closed,
            'is_locked' => true,
            'reported_at' => now()->subDays(2),
        ]);

        $this->getJson("/api/machines/{$fx['machine']->id}/open-cases")
            ->assertOk()
            ->assertJsonPath('has_open_cases', false);

        // Active open case within 7 days triggers warning (U2)
        $open = $this->postJson('/api/cases', [
            'machine_id' => $fx['machine']->id,
            'case_type_id' => $fx['abnormalityType']->id,
            'description' => 'Kebocoran oli di gearbox konveyor 01.',
        ])->assertCreated();

        $this->getJson("/api/machines/{$fx['machine']->id}/open-cases")
            ->assertOk()
            ->assertJsonPath('has_open_cases', true)
            ->assertJsonPath('count', 1)
            ->assertJsonPath('cases.0.id', $open->json('data.id'));

        // Reporter can still continue and submit a new case
        $this->postJson('/api/cases', [
            'machine_id' => $fx['machine']->id,
            'case_type_id' => $fx['abnormalityType']->id,
            'description' => 'Kebocoran oli makin parah di sisi bawah gearbox.',
        ])->assertCreated()
            ->assertJsonPath('open_cases_warning.has_open_cases', true);
    }

    public function test_non_reporter_roles_cannot_submit_new_case(): void
    {
        $fx = $this->createOrganizationFixture();

        foreach (['supervisor', 'hse', 'admin'] as $roleKey) {
            Sanctum::actingAs($fx[$roleKey]);

            $this->postJson('/api/cases', [
                'machine_id' => $fx['machine']->id,
                'case_type_id' => $fx['abnormalityType']->id,
                'description' => "Percobaan lapor oleh {$roleKey}.",
            ])->assertForbidden();
        }
    }
}

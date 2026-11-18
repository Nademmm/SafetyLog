<?php

namespace Tests\Feature;

use App\Enums\CaseStatus;
use App\Models\Area;
use App\Models\CaseStatusHistory;
use App\Models\Configuration;
use App\Models\Machine;
use App\Models\SafetyCase;
use App\Models\Site;
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

    public function test_minimal_three_required_fields_create_case_with_per_site_sequence(): void
    {
        $fx = $this->createOrganizationFixture('PNS', 'SBY1');

        $siteB = Site::factory()->create([
            'organization_id' => $fx['organization']->id,
            'name' => 'Pabrik Jakarta 2',
            'code' => 'jkt2',
            'is_active' => true,
        ]);
        $areaB = Area::factory()->create([
            'organization_id' => $fx['organization']->id,
            'site_id' => $siteB->id,
            'name' => 'Lini Mixing B',
            'is_active' => true,
        ]);
        $machineB = Machine::factory()->create([
            'organization_id' => $fx['organization']->id,
            'site_id' => $siteB->id,
            'area_id' => $areaB->id,
            'code' => 'MCH-JKT-01',
            'name' => 'Mesin Mixer Jakarta 01',
            'is_active' => true,
        ]);

        Sanctum::actingAs($fx['reporter']);
        $year = now()->format('Y');

        // Strictly 3 required fields only; quick questions and photo are omitted
        $respA = $this->postJson('/api/cases', [
            'machine_id' => $fx['machine']->id,
            'case_type_id' => $fx['abnormalityType']->id,
            'description' => 'Lampu indikator panel berkedip merah.',
        ])->assertCreated();

        $respA->assertJsonPath('case_number', "SL-SBY1-{$year}-0001")
            ->assertJsonPath('data.case_number', "SL-SBY1-{$year}-0001")
            ->assertJsonPath('data.is_machine_stopped', false)
            ->assertJsonPath('data.has_affected_people', false)
            ->assertJsonPath('emergency_reminder', null)
            ->assertJsonCount(0, 'data.attachments');

        // Different site starts its own 0001 sequence with uppercased site code
        $respB = $this->postJson('/api/cases', [
            'machine_id' => $machineB->id,
            'case_type_id' => $fx['abnormalityType']->id,
            'description' => 'Suara bearing mixer tidak normal saat beban penuh.',
        ])->assertCreated();

        $respB->assertJsonPath('case_number', "SL-JKT2-{$year}-0001")
            ->assertJsonPath('data.case_number', "SL-JKT2-{$year}-0001");
    }

    public function test_report_form_endpoint_provides_single_call_context_and_filters_archived_hierarchy(): void
    {
        $orgA = $this->createOrganizationFixture('PNS', 'SBY1');
        $orgB = $this->createOrganizationFixture('OTHR', 'BDG1');

        $archivedArea = Area::factory()->create([
            'organization_id' => $orgA['organization']->id,
            'site_id' => $orgA['site']->id,
            'name' => 'Area Nonaktif',
            'is_active' => false,
            'archived_at' => now(),
        ]);
        $machineInArchivedArea = Machine::factory()->create([
            'organization_id' => $orgA['organization']->id,
            'site_id' => $orgA['site']->id,
            'area_id' => $archivedArea->id,
            'code' => 'MCH-OLD-99',
            'name' => 'Mesin Lama Area Arsip',
            'is_active' => true,
        ]);

        // Custom emergency reminder configured in database (Rule #8 + data-driven config)
        Configuration::query()->updateOrCreate(
            ['organization_id' => $orgA['organization']->id, 'key' => 'emergency_reminder_text'],
            ['value' => 'Hubungi nomor darurat pabrik ekstensi 112 segera!'],
        );

        Sanctum::actingAs($orgA['reporter']);

        // Default report-form excludes machines under archived area
        $formResp = $this->getJson('/api/report-form?qr='.$orgA['machine']->qr_token)
            ->assertOk()
            ->assertJsonCount(1, 'machines')
            ->assertJsonPath('machines.0.id', $orgA['machine']->id)
            ->assertJsonPath('selected_machine.id', $orgA['machine']->id)
            ->assertJsonPath('form_config.target_completion_seconds', 60)
            ->assertJsonPath('form_config.emergency_reminder_text', 'Hubungi nomor darurat pabrik ekstensi 112 segera!')
            ->assertJsonPath('open_cases_warning.has_open_cases', false);

        $this->assertEquals(
            ['machine_id', 'case_type_id', 'description'],
            $formResp->json('form_config.required_fields'),
        );

        // Machine under archived area is excluded from /api/machines & rejected on report-form/cases
        $this->getJson('/api/machines')
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $this->getJson('/api/report-form?machine_id='.$machineInArchivedArea->id)
            ->assertStatus(422)
            ->assertJsonPath('error_code', 'MACHINE_UNAVAILABLE');

        $this->postJson('/api/cases', [
            'machine_id' => $machineInArchivedArea->id,
            'case_type_id' => $orgA['abnormalityType']->id,
            'description' => 'Mencoba melapor ke mesin di area yang sudah diarsipkan.',
        ])->assertStatus(422)
            ->assertJsonPath('error_code', 'MACHINE_UNAVAILABLE');

        // Cross-org QR/machine lookup or submission must return 403
        $this->getJson('/api/report-form?qr='.$orgB['machine']->qr_token)
            ->assertForbidden();
        $this->postJson('/api/cases', [
            'machine_id' => $orgB['machine']->id,
            'case_type_id' => $orgA['abnormalityType']->id,
            'description' => 'Mencoba melapor lintas organisasi.',
        ])->assertForbidden();
    }

    public function test_multipart_boolean_strings_qr_token_submit_whitespace_rejection_and_incident_reminder_matrix(): void
    {
        Storage::fake('local');
        $fx = $this->createOrganizationFixture('PNS', 'SBY1');

        Configuration::query()->updateOrCreate(
            ['organization_id' => $fx['organization']->id, 'key' => 'emergency_reminder_text'],
            ['value' => 'Ikuti prosedur darurat PT PNS! SafetyLog bukan pengganti prosedur resmi.'],
        );

        Sanctum::actingAs($fx['reporter']);

        // Whitespace-only description cannot bypass min:5 validation
        $this->postJson('/api/cases', [
            'machine_id' => $fx['machine']->id,
            'case_type_id' => $fx['abnormalityType']->id,
            'description' => '     ',
        ])->assertStatus(422)
            ->assertJsonValidationErrors('description');

        // FormData submission with qr_token, string booleans ("true"/"false"), duration metric, and single photo
        $photo = UploadedFile::fake()->image('incident.png', 640, 480);
        $incidentWithPeople = $this->post('/api/cases', [
            'qr_token' => $fx['machine']->qr_token,
            'case_type_id' => $fx['incidentType']->id,
            'description' => 'Operator terpeleset tumpahan oli saat membersihkan mesin.',
            'is_machine_stopped' => 'true',
            'has_affected_people' => 'true',
            'report_duration_seconds' => 42,
            'photo' => $photo,
        ], ['Accept' => 'application/json'])->assertCreated();

        $incidentWithPeople
            ->assertJsonPath('data.is_machine_stopped', true)
            ->assertJsonPath('data.has_affected_people', true)
            ->assertJsonPath('emergency_reminder', 'Ikuti prosedur darurat PT PNS! SafetyLog bukan pengganti prosedur resmi.')
            ->assertJsonCount(1, 'data.attachments');

        $history = CaseStatusHistory::query()
            ->where('safety_case_id', $incidentWithPeople->json('data.id'))
            ->firstOrFail();

        $this->assertSame('qr', $history->metadata['reported_via'] ?? null);
        $this->assertSame(42, $history->metadata['report_duration_seconds'] ?? null);

        // Incident WITHOUT affected people must NOT show emergency reminder
        $this->postJson('/api/cases', [
            'machine_id' => $fx['machine']->id,
            'case_type_id' => $fx['incidentType']->id,
            'description' => 'Kaca pelindung retak tanpa ada pekerja terdampak.',
            'is_machine_stopped' => 'false',
            'has_affected_people' => 'false',
        ])->assertCreated()
            ->assertJsonPath('data.has_affected_people', false)
            ->assertJsonPath('emergency_reminder', null);

        // Non-incident WITH affected people must NOT trigger incident-only emergency reminder
        $this->postJson('/api/cases', [
            'machine_id' => $fx['machine']->id,
            'case_type_id' => $fx['abnormalityType']->id,
            'description' => 'Bising konveyor melebihi batas nyaman telinga operator.',
            'has_affected_people' => true,
        ])->assertCreated()
            ->assertJsonPath('data.has_affected_people', true)
            ->assertJsonPath('emergency_reminder', null);

        // Mismatched machine_id and qr_token is rejected
        $otherMachine = Machine::factory()->create([
            'organization_id' => $fx['organization']->id,
            'site_id' => $fx['site']->id,
            'area_id' => $fx['area']->id,
        ]);

        $this->postJson('/api/cases', [
            'machine_id' => $otherMachine->id,
            'qr_token' => $fx['machine']->qr_token,
            'case_type_id' => $fx['abnormalityType']->id,
            'description' => 'Uji ketidakcocokan ID mesin dan token QR.',
        ])->assertStatus(422)
            ->assertJsonPath('error_code', 'MACHINE_QR_MISMATCH');

        // Pelapor cannot see closed case summary reported by another user, nor qr_token in dropdown list
        Sanctum::actingAs($fx['supervisor']);
        $otherReporterCase = $this->postJson('/api/cases', [
            'machine_id' => $fx['machine']->id,
            'case_type_id' => $fx['abnormalityType']->id,
            'description' => 'Kasus milik supervisor yang langsung ditolak saat triase.',
        ])->assertCreated();

        $otherCaseId = $otherReporterCase->json('data.id');

        $this->postJson("/api/cases/{$otherCaseId}/triage", [
            'decision' => 'reject',
            'rejection_reason' => 'Laporan duplikat internal uji.',
        ])->assertOk();

        Sanctum::actingAs($fx['reporter']);
        $this->getJson("/api/cases/{$otherCaseId}/summary")->assertForbidden();
        $this->getJson('/api/report-form')
            ->assertOk()
            ->assertJsonMissingPath('machines.0.qr_token')
            ->assertJsonMissingPath('machines.0.qr_report_path');
    }
}

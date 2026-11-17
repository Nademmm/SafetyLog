<?php

namespace Tests\Feature;

use App\Enums\CaseStatus;
use App\Models\Machine;
use App\Models\SafetyCase;
use App\Models\User;
use Database\Seeders\DemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DemoSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_demo_seeder_populates_ten_machines_thirty_cases_and_recurring_demo_data(): void
    {
        $this->seed(DemoSeeder::class);

        $this->assertSame(10, Machine::query()->count());
        $this->assertSame(30, SafetyCase::query()->count());

        // Every key workflow status exists in realistic demo data
        foreach ([CaseStatus::New, CaseStatus::Assessed, CaseStatus::Analyzed, CaseStatus::InProgress, CaseStatus::PendingVerification, CaseStatus::Closed, CaseStatus::Rejected, CaseStatus::Duplicate] as $status) {
            $this->assertTrue(
                SafetyCase::query()->where('status', $status->value)->exists(),
                "Expected demo cases to contain status {$status->value}",
            );
        }

        $admin = User::query()->where('email', 'admin@safetylog.test')->firstOrFail();
        Sanctum::actingAs($admin);

        // Verify dashboard & typo-tolerant search work cleanly on demo dataset
        $this->getJson('/api/dashboard')
            ->assertOk()
            ->assertJsonPath('data.summary.total_cases_count', 30)
            ->assertJsonPath('data.summary.recurring_machines_count', 1);

        $search = $this->getJson('/api/cases?q=konvayor')->assertOk();
        $this->assertGreaterThanOrEqual(3, count($search->json('data')));
    }
}

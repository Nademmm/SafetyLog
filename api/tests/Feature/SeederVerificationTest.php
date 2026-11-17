<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Area;
use App\Models\CaseType;
use App\Models\Category;
use App\Models\Configuration;
use App\Models\Machine;
use App\Models\Organization;
use App\Models\RiskConfig;
use App\Models\Role;
use App\Models\Site;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SeederVerificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_database_seeder_populates_baseline_b03_records_idempotently(): void
    {
        $this->seed(DatabaseSeeder::class);
        $this->seed(DatabaseSeeder::class);

        $this->assertSame(1, Organization::query()->count());
        $this->assertSame(1, Site::query()->count());
        $this->assertSame(3, Area::query()->count());
        $this->assertSame(3, Machine::query()->count());
        $this->assertSame(4, User::query()->count());
        $this->assertSame(count(UserRole::cases()), Role::query()->count());
        $this->assertSame(5, CaseType::query()->count());
        $this->assertSame(8, Category::query()->count());
        $this->assertSame(3, RiskConfig::query()->count());
        $this->assertSame(6, Configuration::query()->count());

        foreach (UserRole::cases() as $role) {
            $this->assertDatabaseHas('users', ['role' => $role->value]);
        }

        // Verify seeded login credentials work out of the box
        $this->postJson('/api/auth/login', [
            'email' => 'supervisor@safetylog.test',
            'password' => 'password123',
        ])->assertOk()
            ->assertJsonPath('user.role', 'supervisor');
    }
}

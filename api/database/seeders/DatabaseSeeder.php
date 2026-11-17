<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\Area;
use App\Models\Machine;
use App\Models\Organization;
use App\Models\Site;
use App\Models\User;
use App\Services\OrganizationBootstrapService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $bootstrap = app(OrganizationBootstrapService::class);
        $bootstrap->seedRoles();

        $organization = Organization::query()->firstOrCreate(
            ['code' => 'PNS'],
            [
                'name' => 'PT Pangan Nusantara Sejahtera',
                'subscription_plan' => 'essential',
                'is_active' => true,
            ],
        );

        $bootstrap->seedDefaultsForOrganization($organization);

        $site = Site::query()->firstOrCreate(
            ['organization_id' => $organization->id, 'code' => 'SBY1'],
            [
                'name' => 'Pabrik Sidoarjo 1',
                'address' => 'Kawasan Industri Rungkut Berbek, Sidoarjo, Jawa Timur',
                'is_active' => true,
            ],
        );

        $packagingArea = Area::query()->firstOrCreate(
            ['organization_id' => $organization->id, 'site_id' => $site->id, 'code' => 'PACK-A'],
            ['name' => 'Lini Pengemasan A', 'is_active' => true],
        );

        $fillingArea = Area::query()->firstOrCreate(
            ['organization_id' => $organization->id, 'site_id' => $site->id, 'code' => 'FILL-1'],
            ['name' => 'Lini Filling & Mixing', 'is_active' => true],
        );

        $utilityArea = Area::query()->firstOrCreate(
            ['organization_id' => $organization->id, 'site_id' => $site->id, 'code' => 'UTIL-1'],
            ['name' => 'Utilitas & Boiler', 'is_active' => true],
        );

        $machines = [
            [
                'area_id' => $packagingArea->id,
                'code' => 'MCH-CONV-01',
                'name' => 'Mesin Konveyor Pengemasan 01',
                'qr_token' => 'qr-pns-sby1-conv-01-demo',
                'description' => 'Konveyor utama pengemasan karton otomatis lini A.',
            ],
            [
                'area_id' => $fillingArea->id,
                'code' => 'MCH-FILL-01',
                'name' => 'Mesin Rotary Filler 01',
                'qr_token' => 'qr-pns-sby1-fill-01-demo',
                'description' => 'Mesin pengisian botol berkecepatan tinggi.',
            ],
            [
                'area_id' => $utilityArea->id,
                'code' => 'MCH-COMP-01',
                'name' => 'Kompresor Udara Sentral 01',
                'qr_token' => 'qr-pns-sby1-comp-01-demo',
                'description' => 'Kompresor pneumatik penyuplai tekanan lini produksi.',
            ],
        ];

        foreach ($machines as $machine) {
            Machine::query()->firstOrCreate(
                ['organization_id' => $organization->id, 'code' => $machine['code']],
                [
                    'site_id' => $site->id,
                    'area_id' => $machine['area_id'],
                    'name' => $machine['name'],
                    'qr_token' => $machine['qr_token'],
                    'description' => $machine['description'],
                    'is_active' => true,
                ],
            );
        }

        $users = [
            [
                'email' => 'pelapor@safetylog.test',
                'name' => 'Budi Santoso',
                'role' => UserRole::Reporter,
                'job_title' => 'Operator Lini Pengemasan',
            ],
            [
                'email' => 'supervisor@safetylog.test',
                'name' => 'Rina Wijaya',
                'role' => UserRole::Supervisor,
                'job_title' => 'Supervisor Produksi',
            ],
            [
                'email' => 'k3@safetylog.test',
                'name' => 'Andi Pratama',
                'role' => UserRole::Hse,
                'job_title' => 'Petugas K3 / HSE',
            ],
            [
                'email' => 'admin@safetylog.test',
                'name' => 'Dewi Lestari',
                'role' => UserRole::Admin,
                'job_title' => 'Manajer Operasional',
            ],
        ];

        foreach ($users as $userData) {
            User::query()->updateOrCreate(
                ['email' => $userData['email']],
                [
                    'organization_id' => $organization->id,
                    'site_id' => $site->id,
                    'name' => $userData['name'],
                    'password' => Hash::make('password123'),
                    'role' => $userData['role'],
                    'job_title' => $userData['job_title'],
                    'is_active' => true,
                    'email_verified_at' => now(),
                ],
            );
        }
    }
}

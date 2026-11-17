<?php

namespace App\Services;

use App\Enums\RiskLevel;
use App\Enums\UserRole;
use App\Models\CaseType;
use App\Models\Category;
use App\Models\Configuration;
use App\Models\Organization;
use App\Models\RiskConfig;
use App\Models\Role;

/**
 * Seeds default master data, risk matrix thresholds, and configurations for an organization.
 */
class OrganizationBootstrapService
{
    public function seedRoles(): void
    {
        $descriptions = [
            UserRole::Reporter->value => 'Operator atau pekerja lapangan yang melaporkan temuan K3 dan masalah mesin.',
            UserRole::Supervisor->value => 'Menilai risiko, melakukan triase, menunjuk PIC, dan memantau tindakan.',
            UserRole::Hse->value => 'Petugas K3 yang memverifikasi penyelesaian, menutup, dan membuka ulang kasus.',
            UserRole::Admin->value => 'Manajer atau admin pabrik dengan akses pengelolaan master data dan konfigurasi.',
        ];

        foreach (UserRole::cases() as $role) {
            Role::query()->updateOrCreate(
                ['slug' => $role->value],
                [
                    'name' => $role->label(),
                    'description' => $descriptions[$role->value],
                ],
            );
        }
    }

    public function seedDefaultsForOrganization(Organization $organization): void
    {
        $this->seedCaseTypes($organization);
        $this->seedCategories($organization);
        $this->seedRiskConfigs($organization);
        $this->seedConfigurations($organization);
    }

    private function seedCaseTypes(Organization $organization): void
    {
        $types = [
            ['code' => 'machine_abnormality', 'name' => 'Abnormalitas mesin', 'is_incident' => false, 'sort_order' => 1],
            ['code' => 'breakdown', 'name' => 'Kerusakan', 'is_incident' => false, 'sort_order' => 2],
            ['code' => 'unsafe_condition', 'name' => 'Kondisi tidak aman', 'is_incident' => false, 'sort_order' => 3],
            ['code' => 'near_miss', 'name' => 'Nyaris celaka (near miss)', 'is_incident' => false, 'sort_order' => 4],
            ['code' => 'incident', 'name' => 'Insiden', 'is_incident' => true, 'sort_order' => 5],
        ];

        foreach ($types as $type) {
            CaseType::query()->updateOrCreate(
                ['organization_id' => $organization->id, 'code' => $type['code']],
                [
                    'name' => $type['name'],
                    'is_incident' => $type['is_incident'],
                    'sort_order' => $type['sort_order'],
                    'is_active' => true,
                ],
            );
        }
    }

    private function seedCategories(Organization $organization): void
    {
        $categories = [
            ['code' => 'mechanical', 'name' => 'Mekanik', 'sort_order' => 1],
            ['code' => 'electrical', 'name' => 'Kelistrikan', 'sort_order' => 2],
            ['code' => 'instrumentation', 'name' => 'Instrumen/kontrol', 'sort_order' => 3],
            ['code' => 'pneumatic_hydraulic', 'name' => 'Pneumatik/hidrolik', 'sort_order' => 4],
            ['code' => 'sanitation', 'name' => 'Kebersihan dan sanitasi', 'sort_order' => 5],
            ['code' => 'occupational_safety', 'name' => 'Keselamatan kerja', 'sort_order' => 6],
            ['code' => 'environment', 'name' => 'Lingkungan', 'sort_order' => 7],
            ['code' => 'other', 'name' => 'Lainnya', 'sort_order' => 8],
        ];

        foreach ($categories as $category) {
            Category::query()->updateOrCreate(
                ['organization_id' => $organization->id, 'code' => $category['code']],
                [
                    'name' => $category['name'],
                    'sort_order' => $category['sort_order'],
                    'is_active' => true,
                ],
            );
        }
    }

    private function seedRiskConfigs(Organization $organization): void
    {
        $configs = [
            [
                'level' => RiskLevel::Low->value,
                'label' => RiskLevel::Low->label(),
                'min_score' => 1,
                'max_score' => 6,
                'first_response_hours' => 24,
                'temporary_action_hours' => 30 * 24,
                'permanent_action_hours' => 60 * 24,
                'requires_preventive_action' => false,
                'color_hex' => '#16A34A',
            ],
            [
                'level' => RiskLevel::Medium->value,
                'label' => RiskLevel::Medium->label(),
                'min_score' => 7,
                'max_score' => 14,
                'first_response_hours' => 4,
                'temporary_action_hours' => 7 * 24,
                'permanent_action_hours' => 30 * 24,
                'requires_preventive_action' => true,
                'color_hex' => '#D97706',
            ],
            [
                'level' => RiskLevel::High->value,
                'label' => RiskLevel::High->label(),
                'min_score' => 15,
                'max_score' => 25,
                'first_response_hours' => 1,
                'temporary_action_hours' => 24,
                'permanent_action_hours' => 14 * 24,
                'requires_preventive_action' => true,
                'color_hex' => '#DC2626',
            ],
        ];

        foreach ($configs as $config) {
            RiskConfig::query()->updateOrCreate(
                ['organization_id' => $organization->id, 'level' => $config['level']],
                $config,
            );
        }
    }

    private function seedConfigurations(Organization $organization): void
    {
        $items = [
            [
                'key' => 'risk_matrix_max_scale',
                'value' => 5,
                'description' => 'Skala maksimum matriks risiko (mis. 5 untuk 5x5, 3 untuk 3x3).',
            ],
            [
                'key' => 'open_case_warning_days',
                'value' => 7,
                'description' => 'Rentang hari untuk peringatan kasus belum selesai pada mesin yang sama.',
            ],
            [
                'key' => 'root_cause_categories',
                'value' => ['Manusia', 'Mesin', 'Metode', 'Material', 'Pengukuran', 'Lingkungan'],
                'description' => 'Daftar kategori akar penyebab (6M).',
            ],
            [
                'key' => 'emergency_reminder_text',
                'value' => 'Ikuti prosedur darurat perusahaan terlebih dahulu. SafetyLog bukan pengganti prosedur resmi K3.',
                'description' => 'Pesan pengingat untuk laporan insiden dengan orang terdampak.',
            ],
            [
                'key' => 'recurring_case_threshold',
                'value' => 3,
                'description' => 'Jumlah kasus minimum dalam jendela hari untuk menandai mesin Berulang.',
            ],
            [
                'key' => 'recurring_window_days',
                'value' => 90,
                'description' => 'Rentang hari penghitungan kasus berulang per mesin.',
            ],
        ];

        foreach ($items as $item) {
            Configuration::query()->updateOrCreate(
                ['organization_id' => $organization->id, 'key' => $item['key']],
                [
                    'value' => $item['value'],
                    'description' => $item['description'],
                ],
            );
        }
    }
}

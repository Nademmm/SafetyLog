<?php

namespace App\Enums;

enum UserRole: string
{
    case Reporter = 'reporter';
    case Supervisor = 'supervisor';
    case Hse = 'hse';
    case Admin = 'admin';

    public function label(): string
    {
        return match ($this) {
            self::Reporter => 'Pelapor',
            self::Supervisor => 'Supervisor',
            self::Hse => 'K3/Verifikator',
            self::Admin => 'Manajer/Admin',
        };
    }

    public function canViewAllCases(): bool
    {
        return in_array($this, [self::Supervisor, self::Hse, self::Admin], true);
    }

    public function canTriage(): bool
    {
        return in_array($this, [self::Supervisor, self::Admin], true);
    }

    public function canManageActions(): bool
    {
        return in_array($this, [self::Supervisor, self::Admin], true);
    }

    public function canVerify(): bool
    {
        return in_array($this, [self::Hse, self::Admin], true);
    }

    public function canViewDashboard(): bool
    {
        return in_array($this, [self::Supervisor, self::Hse, self::Admin], true);
    }

    public function canManageMasterData(): bool
    {
        return $this === self::Admin;
    }

    /**
     * @return array<string, bool>
     */
    public function permissions(): array
    {
        return [
            'report_case' => $this === self::Reporter,
            'view_own_cases' => true,
            'view_all_cases' => $this->canViewAllCases(),
            'triage_case' => $this->canTriage(),
            'manage_actions' => $this->canManageActions(),
            'verify_case' => $this->canVerify(),
            'view_dashboard' => $this->canViewDashboard(),
            'manage_master_data' => $this->canManageMasterData(),
        ];
    }
}

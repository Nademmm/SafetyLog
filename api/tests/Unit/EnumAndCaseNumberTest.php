<?php

namespace Tests\Unit;

use App\Enums\ActionType;
use App\Enums\CaseStatus;
use App\Enums\RiskLevel;
use PHPUnit\Framework\TestCase;

class EnumAndCaseNumberTest extends TestCase
{
    public function test_enums_resolve_both_english_slugs_and_indonesian_labels(): void
    {
        $this->assertSame(CaseStatus::New, CaseStatus::fromInput('new'));
        $this->assertSame(CaseStatus::New, CaseStatus::fromInput('Baru'));
        $this->assertSame(CaseStatus::InProgress, CaseStatus::fromInput('Tindakan berjalan'));
        $this->assertNull(CaseStatus::fromInput('unknown'));

        $this->assertSame(ActionType::Preventive, ActionType::fromInput('preventive'));
        $this->assertSame(ActionType::Preventive, ActionType::fromInput('Preventif'));
        $this->assertSame(ActionType::Temporary, ActionType::fromInput('Sementara'));

        $this->assertSame(RiskLevel::High, RiskLevel::fromInput('high'));
        $this->assertSame(RiskLevel::High, RiskLevel::fromInput('Tinggi'));
    }
}

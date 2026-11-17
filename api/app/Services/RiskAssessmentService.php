<?php

namespace App\Services;

use App\Enums\ActionType;
use App\Enums\RiskLevel;
use App\Exceptions\DomainRuleException;
use App\Models\Configuration;
use App\Models\RiskConfig;
use App\Models\SafetyCase;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;

class RiskAssessmentService
{
    public function maxScaleForOrganization(int $organizationId): int
    {
        $configured = Configuration::getValue($organizationId, 'risk_matrix_max_scale', 5);

        return max(1, (int) $configured);
    }

    public function resolveConfigByScore(int $organizationId, int $score): RiskConfig
    {
        $config = RiskConfig::query()
            ->forOrganization($organizationId)
            ->where('min_score', '<=', $score)
            ->where('max_score', '>=', $score)
            ->first();

        if (! $config) {
            throw new DomainRuleException(
                "Konfigurasi ambang risiko untuk skor {$score} belum tersedia.",
                'RISK_CONFIG_NOT_FOUND',
            );
        }

        return $config;
    }

    public function requiresPreventiveAction(SafetyCase $case): bool
    {
        if (! $case->risk_level instanceof RiskLevel) {
            return false;
        }

        $config = RiskConfig::query()
            ->forOrganization($case->organization_id)
            ->where('level', $case->risk_level->value)
            ->first();

        if ($config !== null) {
            return (bool) $config->requires_preventive_action;
        }

        return in_array($case->risk_level, [RiskLevel::Medium, RiskLevel::High], true);
    }

    /**
     * @return array{first_response_due_at: string, temporary_action_due_at: string, permanent_action_due_at: string}
     */
    public function suggestedDeadlines(RiskConfig $config, ?CarbonInterface $referenceTime = null): array
    {
        $base = CarbonImmutable::instance($referenceTime ?? now());

        return [
            'first_response_due_at' => $base->addHours($config->first_response_hours)->toIso8601String(),
            'temporary_action_due_at' => $base->addHours($config->temporary_action_hours)->toIso8601String(),
            'permanent_action_due_at' => $base->addHours($config->permanent_action_hours)->toIso8601String(),
        ];
    }

    public function suggestActionDueAt(SafetyCase $case, ActionType $actionType): CarbonImmutable
    {
        $base = CarbonImmutable::now();

        if (! $case->risk_level instanceof RiskLevel) {
            return $base->addDays(7);
        }

        $config = RiskConfig::query()
            ->forOrganization($case->organization_id)
            ->where('level', $case->risk_level->value)
            ->first();

        if (! $config) {
            return $base->addDays(7);
        }

        $hours = $actionType === ActionType::Temporary
            ? $config->temporary_action_hours
            : $config->permanent_action_hours;

        return $base->addHours($hours);
    }
}

<?php

namespace App\Enums;

enum ActionType: string
{
    case Temporary = 'temporary';
    case Corrective = 'corrective';
    case Preventive = 'preventive';

    public function label(): string
    {
        return match ($this) {
            self::Temporary => 'Sementara',
            self::Corrective => 'Korektif',
            self::Preventive => 'Preventif',
        };
    }

    public static function fromInput(?string $value): ?self
    {
        if ($value === null || trim($value) === '') {
            return null;
        }

        $normalized = mb_strtolower(trim($value));

        foreach (self::cases() as $case) {
            if ($case->value === $normalized || mb_strtolower($case->label()) === $normalized) {
                return $case;
            }
        }

        return null;
    }
}

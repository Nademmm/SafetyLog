<?php

namespace App\Enums;

enum ActionStatus: string
{
    case Open = 'open';
    case Completed = 'completed';

    public function label(): string
    {
        return match ($this) {
            self::Open => 'Terbuka',
            self::Completed => 'Selesai',
        };
    }
}

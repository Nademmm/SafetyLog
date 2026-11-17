<?php

namespace App\Enums;

enum CaseStatus: string
{
    case New = 'new';
    case Assessed = 'assessed';
    case Analyzed = 'analyzed';
    case InProgress = 'in_progress';
    case PendingVerification = 'pending_verification';
    case Closed = 'closed';
    case Rejected = 'rejected';
    case Duplicate = 'duplicate';
    case Reopened = 'reopened';

    public function label(): string
    {
        return match ($this) {
            self::New => 'Baru',
            self::Assessed => 'Dinilai',
            self::Analyzed => 'Dianalisis',
            self::InProgress => 'Tindakan berjalan',
            self::PendingVerification => 'Menunggu verifikasi',
            self::Closed => 'Selesai',
            self::Rejected => 'Ditolak',
            self::Duplicate => 'Duplikat',
            self::Reopened => 'Dibuka ulang',
        };
    }

    public function isTerminal(): bool
    {
        return in_array($this, [self::Closed, self::Rejected, self::Duplicate], true);
    }

    public function isOpen(): bool
    {
        return ! $this->isTerminal();
    }

    /**
     * @return list<string>
     */
    public static function openValues(): array
    {
        return array_values(array_map(
            fn (self $status) => $status->value,
            array_filter(self::cases(), fn (self $status) => $status->isOpen()),
        ));
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

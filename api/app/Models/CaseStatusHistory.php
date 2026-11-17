<?php

namespace App\Models;

use App\Enums\CaseStatus;
use App\Models\Concerns\BelongsToOrganization;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use LogicException;

/**
 * Append-only audit trail for every safety case state transition (B-22).
 */
class CaseStatusHistory extends Model
{
    use BelongsToOrganization;

    public $timestamps = false;

    protected $fillable = [
        'organization_id',
        'safety_case_id',
        'changed_by',
        'from_status',
        'to_status',
        'action_name',
        'reason',
        'metadata',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'from_status' => CaseStatus::class,
            'to_status' => CaseStatus::class,
            'metadata' => 'array',
            'created_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (self $history): void {
            if ($history->created_at === null) {
                $history->created_at = now();
            }
        });

        static::updating(function (): void {
            throw new LogicException('Riwayat perubahan bersifat permanen dan tidak dapat diubah.');
        });

        static::deleting(function (): void {
            throw new LogicException('Riwayat perubahan bersifat permanen dan tidak dapat dihapus.');
        });
    }

    public function safetyCase(): BelongsTo
    {
        return $this->belongsTo(SafetyCase::class);
    }

    public function changedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'changed_by');
    }
}

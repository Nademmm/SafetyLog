<?php

namespace App\Models;

use App\Models\Concerns\BelongsToOrganization;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Machine extends Model
{
    use BelongsToOrganization, HasFactory;

    /**
     * @var list<string>
     */
    public const SUMMARY_RELATIONS = [
        'site:id,organization_id,name,code,is_active',
        'area:id,site_id,name,code,pic_user_id,is_active,archived_at',
        'area.picUser:id,name,email,role,job_title,is_active',
    ];

    protected $fillable = [
        'organization_id',
        'site_id',
        'area_id',
        'code',
        'name',
        'qr_token',
        'description',
        'is_active',
        'archived_at',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'archived_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (Machine $machine): void {
            if (empty($machine->qr_token)) {
                $machine->qr_token = static::generateUniqueQrToken();
            }
        });
    }

    public static function generateUniqueQrToken(): string
    {
        do {
            $token = Str::random(24);
        } while (static::query()->withoutGlobalScopes()->where('qr_token', $token)->exists());

        return $token;
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where($this->qualifyColumn('is_active'), true)
            ->whereNull($this->qualifyColumn('archived_at'));
    }

    public function scopeOperational(Builder $query): Builder
    {
        return $this->scopeActive($query)
            ->whereHas('site', fn (Builder $siteQuery) => $siteQuery->where('is_active', true))
            ->whereHas('area', fn (Builder $areaQuery) => $areaQuery->where('is_active', true)->whereNull('archived_at'));
    }

    public function isOperational(): bool
    {
        return $this->is_active
            && $this->archived_at === null
            && (bool) $this->site?->is_active
            && (bool) $this->area?->is_active
            && $this->area?->archived_at === null;
    }

    /**
     * Format machine details consistently across master data, QR lookup, and report form endpoints.
     *
     * @return array<string, mixed>
     */
    public function toSummaryArray(bool $includeQrDetails = true): array
    {
        $summary = [
            'id' => $this->id,
            'code' => $this->code,
            'name' => $this->name,
            'description' => $this->description,
            'is_active' => $this->is_active,
            'archived_at' => $this->archived_at?->toIso8601String(),
            'site' => $this->site ? [
                'id' => $this->site->id,
                'name' => $this->site->name,
                'code' => $this->site->code,
            ] : null,
            'area' => $this->area ? [
                'id' => $this->area->id,
                'name' => $this->area->name,
                'code' => $this->area->code,
                'pic_user' => $this->area->relationLoaded('picUser') && $this->area->picUser ? [
                    'id' => $this->area->picUser->id,
                    'name' => $this->area->picUser->name,
                    'email' => $this->area->picUser->email,
                    'role' => $this->area->picUser->role instanceof \BackedEnum
                        ? $this->area->picUser->role->value
                        : (string) $this->area->picUser->role,
                    'job_title' => $this->area->picUser->job_title,
                ] : null,
            ] : null,
        ];

        if ($includeQrDetails) {
            $summary['qr_token'] = $this->qr_token;
            $summary['qr_report_path'] = "/report?qr={$this->qr_token}";
        }

        return $summary;
    }

    public function site(): BelongsTo
    {
        return $this->belongsTo(Site::class);
    }

    public function area(): BelongsTo
    {
        return $this->belongsTo(Area::class);
    }

    public function safetyCases(): HasMany
    {
        return $this->hasMany(SafetyCase::class);
    }
}

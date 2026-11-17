<?php

namespace App\Models;

use App\Enums\CaseStatus;
use App\Enums\RiskLevel;
use App\Models\Concerns\BelongsToOrganization;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class SafetyCase extends Model
{
    use BelongsToOrganization, HasFactory;

    protected $fillable = [
        'organization_id',
        'site_id',
        'area_id',
        'machine_id',
        'reporter_id',
        'case_type_id',
        'category_id',
        'case_number',
        'description',
        'is_machine_stopped',
        'has_affected_people',
        'status',
        'severity',
        'likelihood',
        'risk_score',
        'risk_level',
        'assigned_pic_id',
        'triaged_by',
        'triaged_at',
        'rejection_reason',
        'duplicate_of_case_id',
        'root_cause_category',
        'five_whys',
        'root_cause_summary',
        'analyzed_by',
        'analyzed_at',
        'learning_summary',
        'verified_by',
        'verified_at',
        'closed_at',
        'is_locked',
        'reopened_by',
        'reopened_at',
        'reopen_reason',
        'reported_at',
    ];

    protected function casts(): array
    {
        return [
            'is_machine_stopped' => 'boolean',
            'has_affected_people' => 'boolean',
            'status' => CaseStatus::class,
            'severity' => 'integer',
            'likelihood' => 'integer',
            'risk_score' => 'integer',
            'risk_level' => RiskLevel::class,
            'five_whys' => 'array',
            'is_locked' => 'boolean',
            'triaged_at' => 'datetime',
            'analyzed_at' => 'datetime',
            'verified_at' => 'datetime',
            'closed_at' => 'datetime',
            'reopened_at' => 'datetime',
            'reported_at' => 'datetime',
        ];
    }

    public function site(): BelongsTo
    {
        return $this->belongsTo(Site::class);
    }

    public function area(): BelongsTo
    {
        return $this->belongsTo(Area::class);
    }

    public function machine(): BelongsTo
    {
        return $this->belongsTo(Machine::class);
    }

    public function reporter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reporter_id');
    }

    public function caseType(): BelongsTo
    {
        return $this->belongsTo(CaseType::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function assignedPic(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_pic_id');
    }

    public function triagedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'triaged_by');
    }

    public function analyzedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'analyzed_by');
    }

    public function verifiedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by');
    }

    public function reopenedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reopened_by');
    }

    public function duplicateOf(): BelongsTo
    {
        return $this->belongsTo(self::class, 'duplicate_of_case_id');
    }

    public function actions(): HasMany
    {
        return $this->hasMany(CaseAction::class)->orderBy('due_at');
    }

    public function attachments(): MorphMany
    {
        return $this->morphMany(Attachment::class, 'attachable');
    }

    public function statusHistories(): HasMany
    {
        return $this->hasMany(CaseStatusHistory::class)->orderBy('created_at')->orderBy('id');
    }
}

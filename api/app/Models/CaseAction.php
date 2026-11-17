<?php

namespace App\Models;

use App\Enums\ActionStatus;
use App\Enums\ActionType;
use App\Models\Concerns\BelongsToOrganization;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class CaseAction extends Model
{
    use BelongsToOrganization, HasFactory;

    protected $fillable = [
        'organization_id',
        'safety_case_id',
        'action_type',
        'title',
        'description',
        'pic_user_id',
        'created_by',
        'due_at',
        'status',
        'completion_note',
        'completed_at',
        'completed_by',
    ];

    protected function casts(): array
    {
        return [
            'action_type' => ActionType::class,
            'status' => ActionStatus::class,
            'due_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }

    public function safetyCase(): BelongsTo
    {
        return $this->belongsTo(SafetyCase::class);
    }

    public function pic(): BelongsTo
    {
        return $this->belongsTo(User::class, 'pic_user_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function completer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'completed_by');
    }

    public function attachments(): MorphMany
    {
        return $this->morphMany(Attachment::class, 'attachable');
    }

    public function isOverdue(): bool
    {
        return $this->status === ActionStatus::Open && $this->due_at->isPast();
    }
}

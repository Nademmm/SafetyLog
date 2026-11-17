<?php

namespace App\Models;

use App\Enums\RiskLevel;
use App\Models\Concerns\BelongsToOrganization;
use Illuminate\Database\Eloquent\Model;

class RiskConfig extends Model
{
    use BelongsToOrganization;

    protected $fillable = [
        'organization_id',
        'level',
        'label',
        'min_score',
        'max_score',
        'first_response_hours',
        'temporary_action_hours',
        'permanent_action_hours',
        'requires_preventive_action',
        'color_hex',
    ];

    protected function casts(): array
    {
        return [
            'level' => RiskLevel::class,
            'min_score' => 'integer',
            'max_score' => 'integer',
            'first_response_hours' => 'integer',
            'temporary_action_hours' => 'integer',
            'permanent_action_hours' => 'integer',
            'requires_preventive_action' => 'boolean',
        ];
    }
}

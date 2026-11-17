<?php

namespace App\Models;

use App\Models\Concerns\BelongsToOrganization;
use Illuminate\Database\Eloquent\Model;

class Configuration extends Model
{
    use BelongsToOrganization;

    protected $fillable = [
        'organization_id',
        'key',
        'value',
        'description',
    ];

    protected function casts(): array
    {
        return [
            'value' => 'array',
        ];
    }

    public static function getValue(int $organizationId, string $key, mixed $default = null): mixed
    {
        $config = static::query()
            ->forOrganization($organizationId)
            ->where('key', $key)
            ->first();

        return $config?->value ?? $default;
    }
}

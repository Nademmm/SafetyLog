<?php

namespace Database\Factories;

use App\Models\Area;
use App\Models\Site;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Area>
 */
class AreaFactory extends Factory
{
    public function definition(): array
    {
        return [
            'organization_id' => fn (array $attrs) => Site::query()->findOrFail($attrs['site_id'])->organization_id,
            'site_id' => Site::factory(),
            'name' => 'Area '.fake()->word(),
            'code' => 'AREA-'.strtoupper(Str::random(4)),
            'is_active' => true,
        ];
    }
}

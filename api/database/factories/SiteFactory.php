<?php

namespace Database\Factories;

use App\Models\Organization;
use App\Models\Site;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Site>
 */
class SiteFactory extends Factory
{
    public function definition(): array
    {
        return [
            'organization_id' => Organization::factory(),
            'name' => 'Pabrik '.fake()->city(),
            'code' => strtoupper(Str::random(4)),
            'address' => fake()->address(),
            'is_active' => true,
        ];
    }
}

<?php

namespace Database\Factories;

use App\Models\Area;
use App\Models\Machine;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Machine>
 */
class MachineFactory extends Factory
{
    public function definition(): array
    {
        return [
            'organization_id' => fn (array $attrs) => Area::query()->findOrFail($attrs['area_id'])->organization_id,
            'site_id' => fn (array $attrs) => Area::query()->findOrFail($attrs['area_id'])->site_id,
            'area_id' => Area::factory(),
            'code' => 'MCH-'.strtoupper(Str::random(6)),
            'name' => 'Mesin '.fake()->words(2, true),
            'qr_token' => Str::random(24),
            'description' => fake()->sentence(),
            'is_active' => true,
        ];
    }
}

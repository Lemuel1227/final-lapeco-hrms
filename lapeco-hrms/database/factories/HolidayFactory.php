<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use App\Models\Holiday;

/**
 * @extends Factory<\App\Models\Holiday>
 */
class HolidayFactory extends Factory
{
    protected $model = Holiday::class;

    public function definition(): array
    {
        return [
            'title' => $this->faker->sentence(3),
            'date' => $this->faker->date(),
            'type' => $this->faker->randomElement(['REGULAR', 'SPECIAL']),
            'is_recurring' => $this->faker->boolean(30),
            'description' => $this->faker->optional()->sentence(),
        ];
    }
}



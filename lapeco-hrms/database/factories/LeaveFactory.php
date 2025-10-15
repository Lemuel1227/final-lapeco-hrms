<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use App\Models\Leave;
use App\Models\User;

/**
 * @extends Factory<\App\Models\Leave>
 */
class LeaveFactory extends Factory
{
    protected $model = Leave::class;

    public function definition(): array
    {
        $dateFrom = $this->faker->dateTimeBetween('-2 months', '+2 months');
        $days = $this->faker->numberBetween(1, 5);
        $dateTo = (clone $dateFrom)->modify("+{$days} day");
        return [
            'user_id' => User::inRandomOrder()->value('id') ?? User::factory(),
            'type' => $this->faker->randomElement(['Vacation Leave', 'Sick Leave', 'Emergency Leave']),
            'date_from' => $dateFrom->format('Y-m-d'),
            'date_to' => $dateTo->format('Y-m-d'),
            'days' => $days,
            'status' => $this->faker->randomElement(['Pending', 'Approved', 'Declined', 'Canceled']),
            'reason' => $this->faker->optional()->sentence(),
        ];
    }
}



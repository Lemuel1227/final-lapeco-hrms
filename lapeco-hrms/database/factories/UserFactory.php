<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\User>
 */
class UserFactory extends Factory
{
    /**
     * The current password being used by the factory.
     */
    protected static ?string $password;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $genders = ['Male', 'Female'];
        $roleOptions = ['SUPER_ADMIN', 'TEAM_LEADER', 'REGULAR_EMPLOYEE'];

        $firstName = $this->faker->firstName();
        $middleName = $this->faker->optional(0.4)->firstName();
        $lastName = $this->faker->lastName();
        $usernameBase = Str::slug($firstName . '.' . $lastName);

        return [
            'first_name' => $firstName,
            'middle_name' => $middleName,
            'last_name' => $lastName,
            'username' => $usernameBase . $this->faker->unique()->numerify('#####'),
            'email' => fake()->unique()->safeEmail(),
            'email_verified_at' => now(),
            'password' => static::$password ??= Hash::make('password'),
            'remember_token' => Str::random(10),
            'role' => fake()->randomElement($roleOptions),
            'position_id' => null,
            'joining_date' => $this->faker->dateTimeBetween('-10 years', 'now')->format('Y-m-d'),
            'birthday' => $this->faker->dateTimeBetween('-60 years', '-18 years')->format('Y-m-d'),
            'gender' => fake()->randomElement($genders),
            'address' => fake()->address(),
            'contact_number' => fake()->phoneNumber(),
            'image_url' => null,
            'sss_no' => fake()->numerify('##-#######-#'),
            'tin_no' => fake()->numerify('###-###-###'),
            'pag_ibig_no' => fake()->numerify('####-####-####'),
            'philhealth_no' => fake()->numerify('####-#####-##-#'),
            'resume_file' => null,
            'theme_preference' => fake()->randomElement(['light', 'dark']),
        ];
    }

    /**
     * Indicate that the model's email address should be unverified.
     */
    public function unverified(): static
    {
        return $this->state(fn (array $attributes) => [
            'email_verified_at' => null,
        ]);
    }
}


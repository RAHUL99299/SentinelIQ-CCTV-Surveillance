<?php

namespace Database\Factories;

use App\Models\Stat;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Stat>
 */
class StatFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'camera_id' => \App\Models\Camera::factory(),
            'crowd_count' => $this->faker->numberBetween(0, 50),
            'created_at' => $this->faker->dateTimeBetween('-1 week', 'now'),
            'updated_at' => now(),
        ];
    }
}

<?php

namespace Database\Factories;

use App\Models\Camera;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Camera>
 */
class CameraFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => $this->faker->words(2, true) . ' Camera',
            'url' => 'rtsp://' . $this->faker->ipv4() . '/stream',
            'location' => $this->faker->city(),
            'status' => $this->faker->randomElement(['active', 'active', 'inactive', 'offline']),
        ];
    }
}

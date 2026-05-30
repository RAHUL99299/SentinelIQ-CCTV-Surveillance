<?php

namespace Database\Seeders;

use App\Models\Alert;
use App\Models\Camera;
use App\Models\Stat;
use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $users = [
            [
                'name' => 'Alex Rivers',
                'email' => 'alex.rivers@sentineliq.com',
                'role' => 'Super Admin',
            ],
            [
                'name' => 'Sarah Connor',
                'email' => 'sarah.connor@sentineliq.com',
                'role' => 'Security Manager',
            ],
            [
                'name' => 'John Doe',
                'email' => 'john.doe@sentineliq.com',
                'role' => 'CCTV Operator',
            ],
            [
                'name' => 'Emma Watson',
                'email' => 'emma.watson@sentineliq.com',
                'role' => 'HR Officer',
            ],
            [
                'name' => 'Guest User',
                'email' => 'guest@sentineliq.com',
                'role' => 'Viewer',
            ],
        ];

        foreach ($users as $u) {
            $parts = explode(' ', $u['name']);
            $firstName = strtolower($parts[0]);
            $password = $firstName . '@123';
            User::updateOrCreate(
                ['email' => $u['email']],
                [
                    'name' => $u['name'],
                    'role' => $u['role'],
                    'password' => bcrypt($password),
                ]
            );
        }

        Alert::query()->delete();
        Stat::query()->delete();
        Camera::query()->delete();

        $cameras = [
            [
                'name' => 'Idyllwild — Live',
                'location' => 'Idyllwild, California, USA',
                'zone' => 'Crowd Management',
                'embed_url' => 'https://www.earthcam.com/usa/california/idyllwild/?cam=idyllwild',
                'url' => 'https://www.earthcam.com/usa/california/idyllwild/?cam=idyllwild',
                'stream_type' => 'earthcam',
                'status' => 'active',
                'ptz' => false,
                'crowd_count' => 0,
                'assigned_person' => 'Alex Rivers',
            ],
            [
                'name' => 'Downtown Mystic — Live',
                'location' => 'Mystic, Connecticut, USA',
                'zone' => 'Crime Prevention',
                'embed_url' => 'https://www.earthcam.com/usa/connecticut/mystic/?cam=mystic_ct',
                'url' => 'https://www.earthcam.com/usa/connecticut/mystic/?cam=mystic_ct',
                'stream_type' => 'earthcam',
                'status' => 'active',
                'ptz' => false,
                'crowd_count' => 0,
                'assigned_person' => 'Sarah Connor',
            ],
            [
                'name' => "Anglin's Square — Live",
                'location' => 'Lauderdale-by-the-Sea, Florida, USA',
                'zone' => 'Crowd Management',
                'embed_url' => 'https://www.earthcam.com/usa/florida/lauderdalebythesea/town/?cam=lbts_town',
                'url' => 'https://www.earthcam.com/usa/florida/lauderdalebythesea/town/?cam=lbts_town',
                'stream_type' => 'earthcam',
                'status' => 'active',
                'ptz' => false,
                'crowd_count' => 0,
                'assigned_person' => 'John Doe',
            ],
            [
                'name' => 'Hyden Main Street — Live',
                'location' => 'Hyden, Kentucky, USA',
                'zone' => 'Crime Prevention',
                'embed_url' => 'https://www.earthcam.com/usa/kentucky/hyden/?cam=hyden',
                'url' => 'https://www.earthcam.com/usa/kentucky/hyden/?cam=hyden',
                'stream_type' => 'earthcam',
                'status' => 'active',
                'ptz' => true,
                'crowd_count' => 0,
                'assigned_person' => 'Emma Watson',
            ],
        ];

        $alertTemplates = [
            ['type' => 'Crowd Surge', 'sev' => 'critical', 'conf' => rand(88, 97)],
            ['type' => 'Fight Detected', 'sev' => 'high', 'conf' => rand(82, 94)],
            ['type' => 'Loitering', 'sev' => 'medium', 'conf' => rand(70, 88)],
            ['type' => 'Perimeter Breach', 'sev' => 'critical', 'conf' => rand(90, 99)],
        ];

        foreach ($cameras as $camData) {
            $camera = Camera::create($camData);

            for ($i = 60; $i >= 0; $i--) {
                Stat::create([
                    'camera_id' => $camera->id,
                    'crowd_count' => 0,
                    'created_at' => now()->subMinutes($i),
                    'updated_at' => now()->subMinutes($i),
                ]);
            }

            // Crime-prevention cameras get a sample open alert template
            $isCrimeCam = $camData['zone'] === 'Crime Prevention';
            $tpl = $isCrimeCam
                ? ['type' => 'Loitering', 'sev' => 'medium', 'conf' => rand(72, 88)]
                : $alertTemplates[array_rand($alertTemplates)];

            Alert::create([
                'camera_id' => $camera->id,
                'title' => $tpl['type'] . ' at ' . $camera->name,
                'type' => $tpl['type'],
                'severity' => $tpl['sev'],
                'status' => $isCrimeCam ? 'open' : 'resolved',
                'confidence' => $tpl['conf'],
                'description' => 'Live AI monitoring active on EarthCam feed. Alerts auto-raise when thresholds are exceeded.',
                'created_at' => now()->subMinutes(rand(5, 30)),
                'updated_at' => now()->subMinutes(rand(0, 5)),
            ]);
        }
    }
}

<?php

namespace App\Services;

use App\Models\Alert;
use App\Models\Camera;

class AlertAutomationService
{
    /**
     * Create or resolve alerts from live detection counts.
     */
    public function evaluate(Camera $camera, int $people, int $vehicles): void
    {
        $t = config('sentinel.alert_thresholds');

        $rules = [
            [
                'type'     => 'Crowd Surge',
                'severity' => 'critical',
                'active'   => $people > 30,
                'title'    => "Critical crowd surge at {$camera->name} (>30 people)",
                'desc'     => "AI detected {$people} people on live feed (threshold: 30). Siren protocol automatically engaged.",
                'confidence' => min(99, 70 + (int) floor($people / 1.5)),
            ],
            [
                'type'     => 'Crowd Density',
                'severity' => 'high',
                'active'   => $people >= 10 && $people <= 30,
                'title'    => "High crowd density at {$camera->name}",
                'desc'     => "AI detected {$people} people on live feed (threshold: 10). Monitoring escalated.",
                'confidence' => min(95, 60 + (int) floor($people / 2)),
            ],
            [
                'type'     => 'Crowd Alert',
                'severity' => 'medium',
                'active'   => $people >= 5 && $people < 10,
                'title'    => "Medium crowd alert at {$camera->name}",
                'desc'     => "AI detected {$people} people on live feed (threshold: 5).",
                'confidence' => min(92, 55 + $people * 3),
            ],
            [
                'type'     => 'Vehicle Congestion',
                'severity' => 'medium',
                'active'   => $vehicles > 25 && !str_contains(strtolower($camera->name), 'anglin'),
                'title'    => "Vehicle congestion at {$camera->name}",
                'desc'     => "AI detected {$vehicles} vehicles in traffic zone (threshold: 25). Possible congestion or worksite hazard.",
                'confidence' => min(92, 55 + $vehicles * 2),
            ],
        ];

        foreach ($rules as $rule) {
            if ($rule['active']) {
                $this->openOrTouch($camera, $rule);
            } else {
                $this->autoResolve($camera, $rule['type']);
            }
        }
    }

    private function openOrTouch(Camera $camera, array $rule): void
    {
        $existing = Alert::where('camera_id', $camera->id)
            ->where('type', $rule['type'])
            ->whereIn('status', ['open', 'acknowledged'])
            ->first();

        if ($existing) {
            $existing->update([
                'confidence'  => $rule['confidence'],
                'description' => $rule['desc'],
            ]);

            return;
        }

        Alert::create([
            'camera_id'   => $camera->id,
            'title'       => $rule['title'],
            'type'        => $rule['type'],
            'severity'    => $rule['severity'],
            'status'      => 'open',
            'confidence'  => $rule['confidence'],
            'description' => $rule['desc'],
        ]);
    }

    private function autoResolve(Camera $camera, string $type): void
    {
        Alert::where('camera_id', $camera->id)
            ->where('type', $type)
            ->where('status', 'open')
            ->update(['status' => 'resolved']);
    }
}

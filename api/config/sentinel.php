<?php

return [
    'ai_service_url' => env('SENTINEL_AI_URL', 'http://127.0.0.1:5000'),

    /** Seconds before re-running AI detection for a camera (dashboard rotation). */
    'crowd_sync_ttl' => (int) env('SENTINEL_CROWD_SYNC_TTL', 25),

    'alert_thresholds' => [
        'critical_people' => (int) env('SENTINEL_ALERT_CRITICAL_PEOPLE', 80),
        'high_people'     => (int) env('SENTINEL_ALERT_HIGH_PEOPLE', 50),
        'medium_vehicles' => (int) env('SENTINEL_ALERT_MEDIUM_VEHICLES', 10),
    ],
];

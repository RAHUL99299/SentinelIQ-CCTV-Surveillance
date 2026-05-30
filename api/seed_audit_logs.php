<?php
$events = [];
for ($i = 0; $i < 25; $i++) {
    $events[] = [
        'created_at' => now()->subMinutes($i * 5),
        'updated_at' => now()->subMinutes($i * 5),
        'actor' => ['alex@sentineliq.io','maria@sentineliq.io','karim@sentineliq.io','system'][$i % 4],
        'action' => ['Logged in','Acknowledged INC-2046','Created camera cam-44','Escalated alert','Updated user role','Viewed feed cam-12','Exported report','Changed settings'][$i % 8],
        'ip_address' => '10.0.' . (10 + ($i % 200)) . '.' . (($i * 7) % 255),
        'module' => ['Authentication','Alerts','Cameras','Alerts','Users','Live Feeds','Reports','Settings'][$i % 8],
    ];
}
App\Models\AuditLog::insert($events);
echo "Seeded audit logs!";

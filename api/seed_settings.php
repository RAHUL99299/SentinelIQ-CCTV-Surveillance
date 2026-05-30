<?php

use Illuminate\Support\Facades\Artisan;
use App\Models\Setting;

Artisan::call('migrate');

$defaultSettings = [
    'notification_channels' => [
        'inApp' => true,
        'email' => true,
        'sms' => false,
        'whatsapp' => false,
        'push' => true,
    ],
    'notification_escalation' => [
        [ 'id' => 'lvl-1', 'name' => 'Level 1: CCTV Operator', 'delay' => 'Immediate' ],
        [ 'id' => 'lvl-2', 'name' => 'Level 2: Security Manager', 'delay' => '5m unresolved' ],
        [ 'id' => 'lvl-3', 'name' => 'Level 3: Admin + External Agency', 'delay' => '15m unresolved' ],
    ],
    'notification_quiet_hours' => [
        'sms_start' => '23:00',
        'sms_end' => '07:00',
        'push_start' => '22:00',
        'push_end' => '08:00',
    ],
    'system_general' => [
        'company_name' => 'Acme Corp Security',
        'timezone' => 'UTC (Coordinated Universal Time)',
    ],
    'system_storage' => [
        'video_retention_days' => 30,
        'storage_path' => '/mnt/nfs/surveillance',
    ],
    'system_ai_models' => [
        'yolo' => true,
        'lpr' => true,
        'behavioral' => false,
    ],
    'system_smtp' => [
        'host' => 'smtp.sendgrid.net',
        'port' => 587,
        'user' => 'apikey',
    ],
];

foreach ($defaultSettings as $key => $value) {
    Setting::updateOrCreate(['key' => $key], ['value' => $value]);
}

echo "Migrated and seeded settings!";

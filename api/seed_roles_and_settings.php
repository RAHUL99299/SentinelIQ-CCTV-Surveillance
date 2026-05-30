<?php

use App\Models\Role;
use App\Models\Setting;

// ─── Seed all 5 roles with full permission matrices ───────────────────────────

$modules = ['Dashboard', 'Cameras', 'Incidents', 'Live Feeds', 'Analytics', 'Users', 'Settings'];
$actions = ['View', 'Create', 'Edit', 'Delete', 'Export'];

// Super Admin — all true
$superPerms = [];
foreach ($modules as $m) {
    foreach ($actions as $a) {
        $superPerms[$m][$a] = true;
    }
}

// Security Manager — can view/manage cameras, incidents, live feeds, analytics, dashboard, alerts
$secMgrPerms = [];
foreach ($modules as $m) {
    foreach ($actions as $a) {
        $secMgrPerms[$m][$a] = false;
    }
}
foreach (['Dashboard', 'Live Feeds', 'Cameras', 'Incidents', 'Analytics'] as $m) {
    $secMgrPerms[$m]['View']   = true;
    $secMgrPerms[$m]['Create'] = true;
    $secMgrPerms[$m]['Edit']   = true;
    $secMgrPerms[$m]['Delete'] = false;
    $secMgrPerms[$m]['Export'] = true;
}

// CCTV Operator — view live feeds, incidents, dashboard only
$cctvPerms = [];
foreach ($modules as $m) {
    foreach ($actions as $a) {
        $cctvPerms[$m][$a] = false;
    }
}
foreach (['Dashboard', 'Live Feeds', 'Incidents'] as $m) {
    $cctvPerms[$m]['View'] = true;
}

// HR Officer — work monitoring (Analytics) + dashboard
$hrPerms = [];
foreach ($modules as $m) {
    foreach ($actions as $a) {
        $hrPerms[$m][$a] = false;
    }
}
$hrPerms['Dashboard']['View'] = true;
$hrPerms['Analytics']['View'] = true;
$hrPerms['Analytics']['Export'] = true;

// Viewer — dashboard + live feeds read only
$viewerPerms = [];
foreach ($modules as $m) {
    foreach ($actions as $a) {
        $viewerPerms[$m][$a] = false;
    }
}
$viewerPerms['Dashboard']['View']   = true;
$viewerPerms['Live Feeds']['View']  = true;

$roles = [
    ['name' => 'Super Admin',       'color' => 'bg-primary text-primary-foreground',                           'desc' => 'Full system access',                    'permissions' => $superPerms],
    ['name' => 'Security Manager',  'color' => 'bg-[oklch(0.7_0.18_155)] text-[oklch(0.1_0.05_155)]',         'desc' => 'Manage incidents, cameras & analytics',  'permissions' => $secMgrPerms],
    ['name' => 'CCTV Operator',     'color' => 'bg-[oklch(0.78_0.17_75)] text-[oklch(0.1_0.05_75)]',          'desc' => 'View live feeds & basic incidents',       'permissions' => $cctvPerms],
    ['name' => 'HR Officer',        'color' => 'bg-[oklch(0.65_0.15_300)] text-[oklch(0.1_0.05_300)]',        'desc' => 'Work monitoring & analytics',             'permissions' => $hrPerms],
    ['name' => 'Viewer',            'color' => 'bg-white/10 text-white',                                       'desc' => 'Read-only dashboard & live feed access',  'permissions' => $viewerPerms],
];

foreach ($roles as $r) {
    Role::updateOrCreate(['name' => $r['name']], $r);
}

echo "Seeded " . count($roles) . " roles.\n";

// ─── Seed notification_rules default if missing ───────────────────────────────

Setting::updateOrCreate(
    ['key' => 'notification_rules'],
    ['value' => []]
);

echo "Ensured notification_rules setting exists.\n";

// ─── Ensure all other default settings exist ─────────────────────────────────

$defaults = [
    'notification_channels'   => ['inApp' => true, 'email' => true, 'sms' => false, 'whatsapp' => false, 'push' => true],
    'notification_escalation' => [
        ['id' => 'lvl-1', 'name' => 'Level 1: CCTV Operator',           'delay' => 'Immediate'],
        ['id' => 'lvl-2', 'name' => 'Level 2: Security Manager',        'delay' => '5m unresolved'],
        ['id' => 'lvl-3', 'name' => 'Level 3: Admin + External Agency', 'delay' => '15m unresolved'],
    ],
    'notification_quiet_hours' => ['sms_start' => '23:00', 'sms_end' => '07:00', 'push_start' => '22:00', 'push_end' => '08:00'],
    'system_general'   => ['company_name' => 'Acme Corp Security', 'timezone' => 'UTC (Coordinated Universal Time)'],
    'system_storage'   => ['video_retention_days' => 30, 'storage_path' => '/mnt/nfs/surveillance'],
    'system_ai_models' => ['yolo' => true, 'lpr' => true, 'behavioral' => false],
    'system_smtp'      => ['host' => 'smtp.sendgrid.net', 'port' => 587, 'user' => 'apikey'],
];

foreach ($defaults as $key => $value) {
    Setting::updateOrCreate(['key' => $key], ['value' => $value]);
}

echo "All settings seeded.\n";

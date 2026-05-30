<?php
$modules = ['Dashboard', 'Cameras', 'Incidents', 'Live Feeds', 'Analytics', 'Users', 'Settings'];
$actions = ['View', 'Create', 'Edit', 'Delete', 'Export'];
$p = [];
foreach ($modules as $m) {
    $p[$m] = [];
    foreach ($actions as $a) {
        $p[$m][$a] = $m !== 'Settings' && ($a === 'View' || $a === 'Create' || ($a === 'Edit' && $m === 'Incidents'));
    }
}
$p_super = [];
foreach ($modules as $m) {
    $p_super[$m] = [];
    foreach ($actions as $a) {
        $p_super[$m][$a] = true;
    }
}
App\Models\Role::create(['name' => 'Super Admin', 'color' => 'bg-primary text-primary-foreground', 'desc' => 'Full system access', 'permissions' => $p_super]);
App\Models\Role::create(['name' => 'Security Manager', 'color' => 'bg-[oklch(0.7_0.18_155)] text-[oklch(0.1_0.05_155)]', 'desc' => 'Can manage incidents & cameras', 'permissions' => $p]);
App\Models\Role::create(['name' => 'CCTV Operator', 'color' => 'bg-[oklch(0.78_0.17_75)] text-[oklch(0.1_0.05_75)]', 'desc' => 'View only feeds & basic alerts', 'permissions' => $p]);
echo "Seeded!";

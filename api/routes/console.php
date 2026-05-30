<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('sentinel:sync-camera {id}', function ($id) {
    $camera = \App\Models\Camera::find($id);
    if ($camera) {
        $this->info("Syncing camera: {$camera->name} (ID: {$camera->id})...");
        app(\App\Services\CrowdDetectionService::class)->syncCamera($camera);
        $this->info("Sync complete!");
    } else {
        $this->error("Camera with ID {$id} not found.");
    }
})->purpose('Sync crowd count for a specific camera in the background');

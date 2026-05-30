<?php

namespace App\Providers;

use App\Services\AlertAutomationService;
use App\Services\CrowdDetectionService;
use Illuminate\Support\ServiceProvider;

class SentinelServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(AlertAutomationService::class);
        $this->app->singleton(CrowdDetectionService::class);
    }
}

<?php

namespace App\Services;

use App\Models\Camera;
use App\Models\Stat;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class CrowdDetectionService
{
    public function __construct(
        private readonly AlertAutomationService $alerts,
    ) {}

    /**
     * Refresh crowd counts for active cameras (one stale camera per call).
     * Called from the dashboard poll so the UI stays fast.
     */
    public function syncStaleCameras(): void
    {
        $ttl = config('sentinel.crowd_sync_ttl', 25);
        $cameras = Camera::where('status', 'active')->orderBy('id')->get();

        if ($cameras->isEmpty()) {
            return;
        }

        $cursor = (int) Cache::get('sentinel_crowd_sync_cursor', 0);
        $attempts = 0;
        $maxAttempts = min(2, $cameras->count());

        while ($attempts < $maxAttempts) {
            $index = ($cursor + $attempts) % $cameras->count();
            $camera = $cameras[$index];
            $cacheKey = "sentinel_crowd_{$camera->id}";

            if (! Cache::has($cacheKey)) {
                // Immediately set the cache lock to prevent concurrent sync loops
                Cache::put($cacheKey, true, $ttl);
                Cache::put('sentinel_crowd_sync_cursor', ($index + 1) % $cameras->count());

                // Run the sync-camera command in the background
                $artisan = base_path('artisan');
                if (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
                    // Windows background command execution
                    $cmd = "start /B php \"" . $artisan . "\" sentinel:sync-camera " . $camera->id . " > NUL 2>&1";
                    pclose(popen($cmd, 'r'));
                } else {
                    // Unix/Linux background command execution
                    $cmd = "php \"" . $artisan . "\" sentinel:sync-camera " . $camera->id . " > /dev/null 2>&1 &";
                    exec($cmd);
                }
                return;
            }

            $attempts++;
        }

        Cache::put('sentinel_crowd_sync_cursor', ($cursor + 1) % $cameras->count());
    }

    public function syncCamera(Camera $camera): void
    {
        $source = $this->detectionSource($camera);
        if (! $source) {
            return;
        }

        $timeout = $camera->stream_type === 'earthcam' ? 28 : 12;
        $counts = $this->fetchCounts($source, $timeout);
        if ($counts === null) {
            return;
        }

        $people = (int) ($counts['people_count'] ?? 0);
        $vehicles = (int) ($counts['vehicle_count'] ?? 0);

        $camera->update(['crowd_count' => $people]);

        $lastStat = Stat::where('camera_id', $camera->id)->latest()->first();
        if ($lastStat && $lastStat->created_at->gt(now()->subMinute())) {
            $lastStat->update(['crowd_count' => $people]);
        } else {
            Stat::create([
                'camera_id'   => $camera->id,
                'crowd_count' => $people,
            ]);
        }

        $this->alerts->evaluate($camera, $people, $vehicles);
    }

    /** EarthCam page URL for live HLS; otherwise embed / file URL. */
    public function detectionSource(Camera $camera): ?string
    {
        if ($camera->stream_type === 'earthcam' && $camera->url) {
            return $camera->url;
        }

        return $camera->embed_url ?: $camera->url;
    }

    /**
     * @return array{people_count: int, vehicle_count: int}|null
     */
    public function fetchCounts(string $source, int $timeout = 12): ?array
    {
        $base = rtrim(config('sentinel.ai_service_url'), '/');

        try {
            $response = Http::timeout($timeout)->get("{$base}/api/detect", [
                'source' => $source,
                'mode'   => 'counts',
            ]);

            if (! $response->successful()) {
                return null;
            }

            $data = $response->json();
            if (($data['status'] ?? '') !== 'success') {
                return null;
            }

            return [
                'people_count'  => (int) ($data['people_count'] ?? 0),
                'vehicle_count' => (int) ($data['vehicle_count'] ?? 0),
            ];
        } catch (\Throwable $e) {
            Log::debug('Crowd detection unavailable: '.$e->getMessage());

            return null;
        }
    }
}

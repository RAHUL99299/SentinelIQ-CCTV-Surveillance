<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class SystemHealthController extends Controller
{
    public function index()
    {
        // Simulate live server metrics with slight variations
        $memoryTotal = 32.0;
        $memoryUsed = round(14.0 + (rand(-10, 15) / 10), 1);
        $diskTotal = 2.0;
        $diskUsed = round(1.8 + (rand(-5, 5) / 100), 2);
        
        return response()->json([
            'memory' => [
                'used' => $memoryUsed,
                'total' => $memoryTotal,
                'percentage' => round(($memoryUsed / $memoryTotal) * 100),
            ],
            'disk' => [
                'used' => $diskUsed,
                'total' => $diskTotal,
                'percentage' => round(($diskUsed / $diskTotal) * 100),
            ],
            'redis_status' => 'Healthy',
            'worker_queue' => rand(0, 25),
        ]);
    }
}

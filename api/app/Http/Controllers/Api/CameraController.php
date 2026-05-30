<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCameraRequest;
use App\Http\Requests\UpdateCameraRequest;
use App\Http\Resources\CameraResource;
use App\Models\Camera;
use App\Models\Stat;
use App\Models\AuditLog;
use Illuminate\Http\Request;

class CameraController extends Controller
{
    public function index()
    {
        $cameras = Camera::latest()->get();
        return CameraResource::collection($cameras);
    }

    public function store(StoreCameraRequest $request)
    {
        $camera = Camera::create($request->validated());
        AuditLog::log("Created camera '{$camera->name}' (ID: {$camera->id})", "Cameras");
        return new CameraResource($camera);
    }

    public function show(Camera $camera)
    {
        return new CameraResource($camera);
    }

    public function update(UpdateCameraRequest $request, Camera $camera)
    {
        $camera->update($request->validated());
        AuditLog::log("Updated camera '{$camera->name}' (ID: {$camera->id})", "Cameras");
        return new CameraResource($camera);
    }

    public function destroy(Camera $camera)
    {
        $camera->delete();
        AuditLog::log("Deleted camera '{$camera->name}' (ID: {$camera->id})", "Cameras");
        return response()->noContent();
    }

    /**
     * Return stats history for a specific camera (for charts).
     */
    public function stats(Camera $camera)
    {
        $stats = $camera->stats()
            ->select('crowd_count', 'created_at')
            ->latest()
            ->take(60)
            ->get()
            ->reverse()
            ->values();

        return response()->json([
            'camera' => new CameraResource($camera),
            'stats'  => $stats,
        ]);
    }
}

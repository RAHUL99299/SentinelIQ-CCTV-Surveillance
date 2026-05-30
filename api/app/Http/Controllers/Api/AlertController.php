<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\AlertResource;
use App\Models\Alert;
use App\Models\Camera;
use Illuminate\Http\Request;

use App\Models\AuditLog;

class AlertController extends Controller
{
    /**
     * List all alerts, newest first. Optionally filter by camera or status.
     */
    public function index(Request $request)
    {
        $query = Alert::with('camera')->latest();

        if ($request->has('camera_id')) {
            $query->where('camera_id', $request->camera_id);
        }
        if ($request->has('severity')) {
            $query->where('severity', $request->severity);
        }
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        return AlertResource::collection($query->paginate(50));
    }

    /**
     * Create a new alert (e.g. from AI or manual).
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'camera_id' => 'nullable|exists:cameras,id',
            'title' => 'required|string|max:255',
            'type' => 'required|string|max:100',
            'severity' => 'required|in:critical,high,medium,low',
            'confidence' => 'nullable|integer|min:0|max:100',
            'description' => 'nullable|string',
        ]);

        $alert = Alert::create($validated);
        
        // Log alert creation
        AuditLog::log("System triggered alert '{$alert->title}' (Severity: {$alert->severity})", "Alerts");

        return new AlertResource($alert->load('camera'));
    }

    /**
     * Show a single alert.
     */
    public function show(Alert $alert)
    {
        return new AlertResource($alert->load('camera'));
    }

    /**
     * Update alert status (acknowledge, resolve, close).
     */
    public function update(Request $request, Alert $alert)
    {
        $validated = $request->validate([
            'status' => 'required|in:open,acknowledged,resolved,closed',
        ]);

        $alert->update($validated);

        // Log alert status change
        AuditLog::log("Updated alert #{$alert->id} ('{$alert->title}') status to '{$alert->status}'", "Alerts");

        return new AlertResource($alert->load('camera'));
    }

    /**
     * Delete (false positive removal).
     */
    public function destroy(Alert $alert)
    {
        // Log alert deletion
        AuditLog::log("Deleted alert #{$alert->id} ('{$alert->title}')", "Alerts");

        $alert->delete();
        return response()->noContent();
    }
}

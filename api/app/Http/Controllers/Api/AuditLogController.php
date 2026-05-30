<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    public function index()
    {
        $logs = AuditLog::orderBy('created_at', 'desc')->get();
        return response()->json($logs);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'actor' => 'required|string',
            'action' => 'required|string',
            'module' => 'required|string',
            'ip_address' => 'nullable|string',
        ]);

        $log = AuditLog::create($validated);
        return response()->json($log, 201);
    }

    public function show(string $id)
    {
        //
    }

    public function update(Request $request, string $id)
    {
        //
    }

    public function destroy(string $id)
    {
        //
    }
}

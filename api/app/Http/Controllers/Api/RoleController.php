<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\User;
use App\Models\AuditLog;
use Illuminate\Http\Request;

class RoleController extends Controller
{
    public function index()
    {
        // Get roles and count of users assigned to each role
        $roles = Role::all()->map(function ($role) {
            $role->users_count = User::where('role', $role->name)->count();
            return $role;
        });
        return response()->json($roles);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|unique:roles,name',
            'color' => 'nullable|string',
            'desc' => 'nullable|string',
            'permissions' => 'nullable|array',
        ]);

        $role = Role::create($validated);
        $role->users_count = 0;
        AuditLog::log("Created role '{$role->name}'", "Users");
        return response()->json($role, 201);
    }

    public function show(Role $role)
    {
        $role->users_count = User::where('role', $role->name)->count();
        return response()->json($role);
    }

    public function update(Request $request, Role $role)
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|unique:roles,name,' . $role->id,
            'color' => 'sometimes|nullable|string',
            'desc' => 'sometimes|nullable|string',
            'permissions' => 'sometimes|nullable|array',
        ]);

        $role->update($validated);
        $role->users_count = User::where('role', $role->name)->count();
        AuditLog::log("Updated permissions / settings for role '{$role->name}'", "Users");
        return response()->json($role);
    }

    public function destroy(Role $role)
    {
        $role->delete();
        AuditLog::log("Deleted role '{$role->name}'", "Users");
        return response()->json(null, 204);
    }
}

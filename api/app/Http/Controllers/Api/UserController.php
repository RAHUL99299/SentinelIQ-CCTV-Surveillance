<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class UserController extends Controller
{
    public function index()
    {
        return response()->json(User::orderBy('name')->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'role' => 'required|string',
            'active' => 'boolean',
        ]);

        $validated['password'] = Hash::make(Str::random(16)); // Random password for invited users

        $user = User::create($validated);
        AuditLog::log("Created user '{$user->name}' with role '{$user->role}' (Email: {$user->email})", "Users");
        return response()->json($user, 201);
    }

    public function show(User $user)
    {
        return response()->json($user);
    }

    public function update(Request $request, User $user)
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|unique:users,email,' . $user->id,
            'role' => 'sometimes|string',
            'active' => 'sometimes|boolean',
        ]);

        $user->update($validated);
        AuditLog::log("Updated user '{$user->name}' settings/role", "Users");
        return response()->json($user);
    }

    public function destroy(User $user)
    {
        $user->delete();
        AuditLog::log("Deleted user '{$user->name}' (Email: {$user->email})", "Users");
        return response()->json(null, 204);
    }
}

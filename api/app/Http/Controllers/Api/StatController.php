<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\StatResource;
use App\Models\Stat;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class StatController extends Controller
{
    /**
     * Display a listing of the stats.
     * Optionally filter by camera_id
     */
    public function index(Request $request)
    {
        $query = Stat::query()->latest();

        if ($request->has('camera_id')) {
            $query->where('camera_id', $request->camera_id);
        }

        return StatResource::collection($query->paginate(20));
    }

    /**
     * Store a newly created stat.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'camera_id' => 'required|exists:cameras,id',
            'crowd_count' => 'required|integer|min:0',
        ]);

        $stat = Stat::create($validated);
        return new StatResource($stat);
    }

    /**
     * Display the specified stat.
     */
    public function show(Stat $stat)
    {
        return new StatResource($stat);
    }
}

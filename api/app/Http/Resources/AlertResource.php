<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AlertResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'camera_id' => $this->camera_id,
            'camera_name' => $this->camera?->name,
            'title' => $this->title,
            'type' => $this->type,
            'severity' => $this->severity,
            'status' => $this->status,
            'confidence' => $this->confidence,
            'description' => $this->description,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
            'age' => $this->created_at?->diffForHumans(),
        ];
    }
}

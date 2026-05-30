<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CameraResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'           => $this->id,
            'name'         => $this->name,
            'url'          => $this->url,
            'embed_url'    => $this->embed_url,
            'stream_type'  => $this->stream_type,
            'location'     => $this->location,
            'zone'         => $this->zone,
            'status'       => $this->status,
            'ptz'          => $this->ptz,
            'crowd_count'  => $this->crowd_count,
            'assigned_person' => $this->assigned_person,
            'created_at'   => $this->created_at?->toISOString(),
            'updated_at'   => $this->updated_at?->toISOString(),
        ];
    }
}

<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreCameraRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'name'        => 'required|string|max:255',
            'url'         => 'nullable|string|max:500',
            'embed_url'   => 'nullable|string|max:1000',
            'stream_type' => 'nullable|in:youtube,earthcam,rtsp,custom',
            'location'    => 'nullable|string|max:255',
            'zone'        => 'nullable|string|max:100',
            'status'      => 'nullable|in:active,inactive,offline',
            'ptz'         => 'nullable|boolean',
            'crowd_count' => 'nullable|integer|min:0',
            'assigned_person' => 'nullable|string|max:255',
        ];
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Alert extends Model
{
    use HasFactory;

    protected $fillable = [
        'camera_id',
        'title',
        'type',
        'severity',
        'status',
        'confidence',
        'description',
    ];

    protected $casts = [
        'confidence' => 'integer',
    ];

    public function camera()
    {
        return $this->belongsTo(Camera::class);
    }
}

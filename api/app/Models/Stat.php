<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Stat extends Model
{
    /** @use HasFactory<\Database\Factories\StatFactory> */
    use HasFactory;

    protected $fillable = [
        'camera_id',
        'crowd_count',
    ];

    public function camera()
    {
        return $this->belongsTo(Camera::class);
    }
}

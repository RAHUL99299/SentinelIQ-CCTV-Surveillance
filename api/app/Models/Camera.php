<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Camera extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'url',
        'embed_url',
        'stream_type',
        'location',
        'zone',
        'status',
        'ptz',
        'crowd_count',
        'assigned_person',
    ];

    protected $casts = [
        'ptz' => 'boolean',
        'crowd_count' => 'integer',
    ];

    public function stats()
    {
        return $this->hasMany(Stat::class);
    }

    public function alerts()
    {
        return $this->hasMany(Alert::class);
    }

    
    public function latestStat()
    {
        return $this->hasOne(Stat::class)->latestOfMany();
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PricingRequest extends Model
{
    use HasFactory;

    protected $table = 'pricing_requests';

    protected $fillable = [
        'name',
        'email',
        'company',
        'plan',
        'need',
    ];
}

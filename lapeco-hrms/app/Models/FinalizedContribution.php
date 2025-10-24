<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FinalizedContribution extends Model
{
    use HasFactory;

    protected $fillable = [
        'type',
        'year',
        'month',
        'pay_period',
        'header_data',
        'columns',
        'rows',
        'generated_by',
    ];

    protected $casts = [
        'header_data' => 'array',
        'columns' => 'array',
        'rows' => 'array',
    ];
}

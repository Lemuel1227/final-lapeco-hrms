<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Position extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'description',
        'monthly_salary',
        'base_rate_per_hour',
        'regular_day_ot_rate',
        'special_ot_rate',
        'regular_holiday_ot_rate',
        'night_diff_rate_per_hour',
        'late_deduction_per_minute',
    ];

    public function users()
    {
        return $this->hasMany(User::class);
    }
} 
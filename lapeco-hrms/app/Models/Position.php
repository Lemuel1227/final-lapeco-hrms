<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Position extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'max_team_leaders',
        'description',
        'monthly_salary',
        'base_rate_per_hour',
        'regular_day_ot_rate',
        'special_ot_rate',
        'regular_holiday_ot_rate',
        'night_diff_rate_per_hour',
        'late_deduction_per_minute',
        'department_id',
        'allowed_modules',
    ];

    protected $casts = [
        'allowed_modules' => 'array',
    ];

    public function users()
    {
        return $this->hasMany(User::class);
    }

    public function department()
    {
        return $this->belongsTo(Department::class);
    }
}
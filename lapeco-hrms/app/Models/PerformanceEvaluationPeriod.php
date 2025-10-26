<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PerformanceEvaluationPeriod extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'evaluation_start',
        'evaluation_end',
        'open_date',
        'close_date',
        'overall_score',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'evaluation_start' => 'date',
        'evaluation_end' => 'date',
        'open_date' => 'date',
        'close_date' => 'date',
        'overall_score' => 'decimal:2',
    ];

    protected $appends = ['status'];

    public function evaluations()
    {
        return $this->hasMany(PerformanceEvaluation::class, 'period_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function getStatusAttribute(): string
    {
        $today = Carbon::today();

        $windowStart = $this->open_date ? $this->open_date->copy()->startOfDay() : ($this->evaluation_start?->copy()->startOfDay());
        $windowEnd = $this->close_date ? $this->close_date->copy()->endOfDay() : ($this->evaluation_end?->copy()->endOfDay());

        if ($windowStart && $windowEnd && $today->betweenIncluded($windowStart, $windowEnd)) {
            return 'active';
        }

        if ($windowStart && $today->lt($windowStart)) {
            return 'upcoming';
        }

        if ($windowEnd && $today->gt($windowEnd)) {
            return 'closed';
        }

        return 'closed';
    }
}

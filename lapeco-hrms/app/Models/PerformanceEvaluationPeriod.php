<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PerformanceEvaluationPeriod extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'evaluation_start',
        'evaluation_end',
        'status',
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
}

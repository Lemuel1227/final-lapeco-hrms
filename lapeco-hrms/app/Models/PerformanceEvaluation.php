<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PerformanceEvaluation extends Model
{
    use HasFactory;

    protected $fillable = [
        'period_id',
        'employee_id',
        'average_score',
        'responses_count',
        'completed_at',
    ];

    protected $casts = [
        'average_score' => 'decimal:2',
        'completed_at' => 'datetime',
    ];

    public function period()
    {
        return $this->belongsTo(PerformanceEvaluationPeriod::class, 'period_id');
    }

    public function employee()
    {
        return $this->belongsTo(User::class, 'employee_id');
    }

    public function responses()
    {
        return $this->hasMany(PerformanceEvaluatorResponse::class, 'evaluation_id');
    }
}

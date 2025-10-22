<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PerformanceEvaluatorResponse extends Model
{
    use HasFactory;

    public const SCORE_FIELDS = [
        'attendance',
        'dedication',
        'performance_job_knowledge',
        'performance_work_efficiency_professionalism',
        'cooperation_task_acceptance',
        'cooperation_adaptability',
        'initiative_autonomy',
        'initiative_under_pressure',
        'communication',
        'teamwork',
        'character',
        'responsiveness',
        'personality',
        'appearance',
        'work_habits',
    ];

    protected $fillable = [
        'evaluation_id',
        'evaluator_id',
        'evaluated_on',
        'attendance',
        'dedication',
        'performance_job_knowledge',
        'performance_work_efficiency_professionalism',
        'cooperation_task_acceptance',
        'cooperation_adaptability',
        'initiative_autonomy',
        'initiative_under_pressure',
        'communication',
        'teamwork',
        'character',
        'responsiveness',
        'personality',
        'appearance',
        'work_habits',
        'evaluators_comment_summary',
        'evaluators_comment_development',
    ];

    protected $casts = [
        'evaluated_on' => 'datetime',
        'attendance' => 'integer',
        'dedication' => 'integer',
        'performance_job_knowledge' => 'integer',
        'performance_work_efficiency_professionalism' => 'integer',
        'cooperation_task_acceptance' => 'integer',
        'cooperation_adaptability' => 'integer',
        'initiative_autonomy' => 'integer',
        'initiative_under_pressure' => 'integer',
        'communication' => 'integer',
        'teamwork' => 'integer',
        'character' => 'integer',
        'responsiveness' => 'integer',
        'personality' => 'integer',
        'appearance' => 'integer',
        'work_habits' => 'integer',
    ];

    protected $appends = [
        'overall_score',
    ];

    public function evaluation()
    {
        return $this->belongsTo(PerformanceEvaluation::class, 'evaluation_id');
    }

    public function evaluator()
    {
        return $this->belongsTo(User::class, 'evaluator_id');
    }

    public function getOverallScoreAttribute(): ?float
    {
        $scores = collect(self::SCORE_FIELDS)->map(fn (string $field) => $this->{$field});

        if ($scores->contains(null)) {
            return null;
        }

        return round($scores->avg(), 2);
    }
}

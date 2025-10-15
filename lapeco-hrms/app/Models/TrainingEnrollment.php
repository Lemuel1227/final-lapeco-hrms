<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TrainingEnrollment extends Model
{
    protected $fillable = [
        'program_id',
        'user_id',
        'status',
        'progress',
        'enrolled_at',
        'completed_at',
        'notes',
        'score'
    ];

    protected $casts = [
        'enrolled_at' => 'datetime',
        'completed_at' => 'datetime',
        'progress' => 'integer',
        'score' => 'decimal:2'
    ];

    /**
     * Get the training program that owns the enrollment.
     */
    public function program(): BelongsTo
    {
        return $this->belongsTo(TrainingProgram::class, 'program_id');
    }

    /**
     * Get the user that owns the enrollment.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TrainingProgram extends Model
{
    protected $fillable = [
        'title',
        'description',
        'provider',
        'duration',
        'start_date',
        'end_date',
        'status',
        'cost',
        'location',
        'type',
        'max_participants',
        'requirements',
        'positions_allowed'
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'cost' => 'decimal:2',
        'positions_allowed' => 'array'
    ];

    /**
     * Get the enrollments for the training program.
     */
    public function enrollments(): HasMany
    {
        return $this->hasMany(TrainingEnrollment::class, 'program_id');
    }

    /**
     * Get the enrolled users for the training program.
     */
    public function enrolledUsers()
    {
        return $this->belongsToMany(User::class, 'training_enrollments', 'program_id', 'user_id')
                    ->withPivot(['status', 'progress', 'enrolled_at', 'completed_at'])
                    ->withTimestamps();
    }
}

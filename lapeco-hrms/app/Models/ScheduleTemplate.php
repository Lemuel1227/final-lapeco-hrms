<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ScheduleTemplate extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'description',
        'columns',
    ];

    protected $casts = [
        'columns' => 'array',
    ];

    public function assignments()
    {
        return $this->hasMany(ScheduleAssignment::class);
    }

    public function users()
    {
        return $this->belongsToMany(User::class, 'schedule_assignments', 'schedule_template_id', 'user_id')
                    ->withPivot(['start_time', 'end_time', 'notes'])
                    ->withTimestamps();
    }

    /**
     * Copy this template's assignments to a new schedule
     */
    public function copyToSchedule(Schedule $schedule)
    {
        $assignments = $this->assignments()->get();
        
        foreach ($assignments as $assignment) {
            ScheduleAssignment::create([
                'schedule_id' => $schedule->id,
                'user_id' => $assignment->user_id,
                'start_time' => $assignment->start_time,
                'end_time' => $assignment->end_time,
                'ot_hours' => $assignment->ot_hours,
                'notes' => $assignment->notes,
            ]);
        }
        
        return $schedule;
    }
}

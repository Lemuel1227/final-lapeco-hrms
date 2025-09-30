<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ScheduleAssignment extends Model
{
    use HasFactory;

    protected $fillable = [
        'schedule_id',
        'schedule_template_id',
        'user_id',
        'start_time',
        'end_time',
        'notes',
    ];

    protected $casts = [
        'start_time' => 'datetime:H:i',
        'end_time' => 'datetime:H:i',
    ];

    /**
     * Boot the model and add validation rules
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            // Ensure either schedule_id or schedule_template_id is set, but not both
            if (($model->schedule_id && $model->schedule_template_id) || 
                (!$model->schedule_id && !$model->schedule_template_id)) {
                throw new \InvalidArgumentException('Either schedule_id or schedule_template_id must be set, but not both.');
            }
        });

        static::updating(function ($model) {
            // Ensure either schedule_id or schedule_template_id is set, but not both
            if (($model->schedule_id && $model->schedule_template_id) || 
                (!$model->schedule_id && !$model->schedule_template_id)) {
                throw new \InvalidArgumentException('Either schedule_id or schedule_template_id must be set, but not both.');
            }
        });
    }

    public function schedule()
    {
        return $this->belongsTo(Schedule::class);
    }

    public function scheduleTemplate()
    {
        return $this->belongsTo(ScheduleTemplate::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the assignable model (either Schedule or ScheduleTemplate)
     */
    public function assignable()
    {
        if ($this->schedule_id) {
            return $this->schedule();
        } elseif ($this->schedule_template_id) {
            return $this->scheduleTemplate();
        }
        return null;
    }

    /**
     * Check if this assignment is for a template
     */
    public function isTemplate()
    {
        return !is_null($this->schedule_template_id);
    }

    /**
     * Check if this assignment is for a schedule
     */
    public function isSchedule()
    {
        return !is_null($this->schedule_id);
    }
}

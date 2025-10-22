<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Schedule extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'date',
        'description',
    ];

    protected $casts = [
        'date' => 'date',
    ];

    /**
     * Get the date attribute as a Carbon instance without timezone conversion
     */
    public function getDateAttribute($value)
    {
        if ($value instanceof \Carbon\Carbon) {
            return $value;
        }
        if (is_string($value)) {
            // Parse as date-only without timezone conversion
            return \Carbon\Carbon::createFromFormat('Y-m-d', $value);
        }
        return $value;
    }

    /**
     * Set the date attribute without timezone conversion
     */
    public function setDateAttribute($value)
    {
        if (is_string($value)) {
            // Parse as date-only without timezone conversion
            $this->attributes['date'] = \Carbon\Carbon::createFromFormat('Y-m-d', $value)->format('Y-m-d');
        } else {
            $this->attributes['date'] = $value;
        }
    }

    public function assignments()
    {
        return $this->hasMany(ScheduleAssignment::class);
    }

    public function users()
    {
        return $this->belongsToMany(User::class, 'schedule_assignments')
                    ->withPivot(['start_time', 'end_time', 'break_start', 'break_end', 'notes'])
                    ->withTimestamps();
    }

    protected static function boot()
{
    parent::boot();

    static::deleting(function ($schedule) {
        $schedule->assignments()->delete();
        
        foreach ($schedule->assignments as $assignment) {
            $assignment->attendance()->delete();
        }
    });
}
}
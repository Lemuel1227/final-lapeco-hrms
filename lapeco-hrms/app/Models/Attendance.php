<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class Attendance extends Model
{
    use HasFactory;

    protected $fillable = [
        'schedule_assignment_id',
        'sign_in',
        'break_out',
        'break_in',
        'sign_out',
        'status',
    ];

    protected $casts = [
        'sign_in' => 'datetime:H:i',
        'break_out' => 'datetime:H:i',
        'break_in' => 'datetime:H:i',
        'sign_out' => 'datetime:H:i',
    ];

    protected $appends = [
        'attendance_date',
        'hours_worked',
        'shift',
        'employee_name',
        'position_title',
        'ot_hours',
        'calculated_status',
    ];

    /**
     * Get the schedule assignment that owns the attendance.
     */
    public function scheduleAssignment()
    {
        return $this->belongsTo(ScheduleAssignment::class);
    }

    /**
     * Get the employee through schedule assignment.
     */
    public function employee()
    {
        return $this->hasOneThrough(
            User::class,
            ScheduleAssignment::class,
            'id', // Foreign key on schedule_assignments table
            'id', // Foreign key on users table
            'schedule_assignment_id', // Local key on attendances table
            'user_id' // Local key on schedule_assignments table
        );
    }

    /**
     * Get the position through schedule assignment and employee.
     */
    public function position()
    {
        return $this->scheduleAssignment->user->position ?? null;
    }

    /**
     * Calculate total hours worked.
     */
    public function getHoursWorkedAttribute()
    {
        if (!$this->sign_in || !$this->sign_out) {
            return '0h 0m';
        }

        $signIn = Carbon::parse($this->sign_in);
        $signOut = Carbon::parse($this->sign_out);
        
        // Calculate total time
        $totalMinutes = $signOut->diffInMinutes($signIn);
        
        // Subtract break time if both break_out and break_in are recorded
        if ($this->break_out && $this->break_in) {
            $breakOut = Carbon::parse($this->break_out);
            $breakIn = Carbon::parse($this->break_in);
            $breakMinutes = $breakIn->diffInMinutes($breakOut);
            $totalMinutes -= $breakMinutes;
        }
        
        $hours = intval($totalMinutes / 60);
        $minutes = $totalMinutes % 60;
        
        return "{$hours}h {$minutes}m";
    }

    /**
     * Get the attendance date from the schedule.
     */
    public function getAttendanceDateAttribute()
    {
        if (!$this->scheduleAssignment || !$this->scheduleAssignment->schedule) {
            return null;
        }
        
        return $this->scheduleAssignment->schedule->date;
    }

    /**
     * Get the shift information from schedule assignment.
     */
    public function getShiftAttribute()
    {
        if (!$this->scheduleAssignment || !$this->scheduleAssignment->schedule) {
            return null;
        }
        
        return $this->scheduleAssignment->start_time . ' - ' . $this->scheduleAssignment->end_time;
    }

    /**
     * Get employee name through relationship.
     */
    public function getEmployeeNameAttribute()
    {
        return $this->employee ? $this->employee->name : null;
    }

    /**
     * Get position title through relationship.
     */
    public function getPositionTitleAttribute()
    {
        $position = $this->scheduleAssignment->user->position ?? null;
        return $position ? $position->name : 'Unassigned';
    }

    /**
     * Get overtime hours from schedule assignment.
     */
    public function getOtHoursAttribute()
    {
        return $this->scheduleAssignment ? $this->scheduleAssignment->ot_hours : 0;
    }

    /**
     * Calculate the actual attendance status based on sign-in/out times and shift schedule.
     */
    public function getCalculatedStatusAttribute()
    {
        // If no schedule assignment, return the stored status
        if (!$this->scheduleAssignment) {
            return $this->status;
        }

        $currentDate = Carbon::now()->format('Y-m-d');
        $scheduleDate = $this->scheduleAssignment->schedule->date->format('Y-m-d');
        
        // For future dates, always return 'scheduled'
        if ($scheduleDate > $currentDate) {
            return 'scheduled';
        }
        
        // For today and past dates, calculate based on attendance data
        if (!$this->sign_in) {
            // No sign-in recorded
            if ($scheduleDate < $currentDate) {
                return 'absent'; // Past date without sign-in
            } else {
                return 'scheduled'; // Today but hasn't signed in yet
            }
        }
        
        // Has sign-in, check if late
        $scheduledStartTime = Carbon::parse($this->scheduleAssignment->start_time);
        $actualSignIn = Carbon::parse($this->sign_in);
        
        // Consider late if signed in after scheduled start time (no threshold)
        $isLate = $actualSignIn->gt($scheduledStartTime);
        
        // Check if they completed their shift
        if (!$this->sign_out) {
            // Signed in but no sign-out
            if ($scheduleDate < $currentDate) {
                // Past date without sign-out - consider incomplete/absent
                return 'absent';
            } else {
                // Today, still working or forgot to sign out
                return $isLate ? 'late' : 'present';
            }
        }
        
        // Has both sign-in and sign-out
        $scheduledEndTime = Carbon::parse($this->scheduleAssignment->end_time);
        $actualSignOut = Carbon::parse($this->sign_out);
        
        // Check if they left too early (more than 30 minutes before scheduled end)
        $earlyLeaveThreshold = $scheduledEndTime->copy()->subMinutes(30);
        $leftEarly = $actualSignOut->lt($earlyLeaveThreshold);
        
        if ($leftEarly) {
            return 'absent'; // Left too early, consider absent
        }
        
        return $isLate ? 'late' : 'present';
    }

    /**
     * Scope to filter by date.
     */
    public function scopeForDate($query, $date)
    {
        return $query->whereHas('scheduleAssignment.schedule', function ($q) use ($date) {
            $q->where('date', $date);
        });
    }

    /**
     * Scope to filter by employee.
     */
    public function scopeForEmployee($query, $userId)
    {
        return $query->whereHas('scheduleAssignment', function ($q) use ($userId) {
            $q->where('user_id', $userId);
        });
    }

    /**
     * Calculate and return the appropriate attendance status based on times.
     */
    public function calculateStatus()
    {
        // If no schedule assignment, return absent
        if (!$this->scheduleAssignment) {
            return 'absent';
        }

        // If no sign in time, return absent
        if (!$this->sign_in) {
            return 'absent';
        }

        $scheduleStart = Carbon::parse($this->scheduleAssignment->start_time);
        $scheduleEnd = Carbon::parse($this->scheduleAssignment->end_time);
        $signInTime = Carbon::parse($this->sign_in);
        
        // Check if late (any delay after scheduled start time)
        $isLate = $signInTime->gt($scheduleStart);
        
        // If no sign out time, consider as absent
        if (!$this->sign_out) {
            return 'absent';
        }
        
        // Determine final status based on sign in time
        if ($isLate) {
            return 'late';
        } else {
            return 'present';
        }
    }

    /**
     * Automatically update status when attendance times change.
     */
    public function updateStatus()
    {
        $this->status = $this->calculateStatus();
        return $this;
    }

    /**
     * Boot method to add model events.
     */
    protected static function boot()
    {
        parent::boot();

        // Automatically calculate status when saving
        static::saving(function ($attendance) {
            // Only auto-calculate if status is not manually set to a specific value
            // or if any time fields have changed
            if ($attendance->isDirty(['sign_in', 'break_out', 'break_in', 'sign_out']) || 
                $attendance->status === 'absent' || 
                !$attendance->exists) {
                $attendance->status = $attendance->calculateStatus();
            }
        });
    }
}
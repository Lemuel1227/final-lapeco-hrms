<?php

namespace App\Models;

use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use App\Notifications\CustomVerifyEmail;
use App\Notifications\CustomResetPassword;
use Illuminate\Database\Eloquent\Casts\Attribute;

class User extends Authenticatable implements MustVerifyEmail
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'first_name',
        'middle_name',
        'last_name',
        'username',
        'email',
        'password',
        'role',
        'position_id',
        'joining_date',
        'birthday',
        'gender',
        'address',
        'contact_number',
        'image_url',
        'sss_no',
        'tin_no',
        'pag_ibig_no',
        'philhealth_no',
        'resume_file',
        'theme_preference',
        'account_status',
        'attendance_status',
        'login_attempts',
        'last_failed_login',
        'locked_until',
        'password_changed',
        'employment_status',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
        'last_failed_login' => 'datetime',
        'locked_until' => 'datetime',
        'login_attempts' => 'integer',
    ];


    public function position()
    {
        return $this->belongsTo(Position::class);
    }

    public function scheduleAssignments()
    {
        return $this->hasMany(ScheduleAssignment::class);
    }

    public function leaves()
    {
        return $this->hasMany(Leave::class);
    }

    public function leaveCredits()
    {
        return $this->hasMany(LeaveCredit::class);
    }

    public function schedules()
    {
        return $this->belongsToMany(Schedule::class, 'schedule_assignments')
                    ->withPivot(['start_time', 'end_time', 'notes'])
                    ->withTimestamps();
    }

    public function resignations()
    {
        return $this->hasMany(Resignation::class, 'employee_id');
    }

    public function terminations()
    {
        return $this->hasMany(Termination::class, 'employee_id');
    }

    public function approvedResignations()
    {
        return $this->hasMany(Resignation::class, 'approved_by');
    }

    public function terminatedEmployees()
    {
        return $this->hasMany(Termination::class, 'terminated_by');
    }

    /**
     * Get profile picture URL
     */
    public function getProfilePictureUrlAttribute()
    {
        return $this->image_url ? asset('storage/' . $this->image_url) : null;
    }

    /**
     * Get resume URL
     */
    public function getResumeUrlAttribute()
    {
        return $this->resume_file ? asset('storage/' . $this->resume_file) : null;
    }

    /**
     * Create a new employee from applicant data.
     */
    public static function createFromApplicant($applicantData, $positionId, $employeeId = null)
    {
        // Map applicant data to employee data
        $employeeData = [
            'name' => trim($applicantData['first_name'] . ' ' . 
                          ($applicantData['middle_name'] ? $applicantData['middle_name'] . ' ' : '') . 
                          $applicantData['last_name']),
            'first_name' => $applicantData['first_name'],
            'middle_name' => $applicantData['middle_name'] ?? null,
            'last_name' => $applicantData['last_name'],
            'email' => $applicantData['email'],
            'password' => bcrypt('temporary'), // Temporary password, will be updated after creation
            'role' => 'Employee',
            'position_id' => $positionId,
            'joining_date' => now()->toDateString(),
            'birthday' => isset($applicantData['birthday']) ? date('Y-m-d', strtotime($applicantData['birthday'])) : null,
            'gender' => $applicantData['gender'] ?? null,
            'contact_number' => $applicantData['phone'] ?? null,
            'resume_file' => $applicantData['resume_file'] ?? null,
            'image_url' => $applicantData['profile_picture'] ?? null, // Transfer profile picture
            'account_status' => 'Active',
            'login_attempts' => 0,
            'password_changed' => false, // New employees haven't changed their password yet
        ];

        $employee = self::create($employeeData);
        
        // Generate password as 'lapeco+id' after creation
        $defaultPassword = 'lapeco' . $employee->id;
        $employee->update([
            'password' => bcrypt($defaultPassword)
        ]);

        return $employee;
    }

    /**
     * Calculate attendance rate for the employee based on their schedule assignments.
     * Returns the percentage of attended vs scheduled days.
     */
    public function calculateAttendanceRate($days = 30)
    {
        $startDate = now()->subDays($days);
        $endDate = now();

        // Get all schedule assignments for this employee in the date range
        $scheduleAssignments = $this->scheduleAssignments()
            ->with(['schedule', 'attendance'])
            ->whereHas('schedule', function ($query) use ($startDate, $endDate) {
                $query->whereBetween('date', [$startDate, $endDate]);
            })
            ->get();

        if ($scheduleAssignments->isEmpty()) {
            return 100; // No schedules means 100% attendance (no absences)
        }

        $totalScheduled = $scheduleAssignments->count();
        $attendedCount = 0;

        foreach ($scheduleAssignments as $assignment) {
            $attendance = $assignment->attendance;
            
            if ($attendance) {
                $status = $attendance->calculated_status;
                // Count 'present' and 'late' as attended, 'absent' as not attended
                if (in_array($status, ['present', 'late'])) {
                    $attendedCount++;
                }
            } else {
                // No attendance record for past dates means absent
                $scheduleDate = $assignment->schedule->date;
                if ($scheduleDate->isPast()) {
                    // This is an absence (no attendance record for past date)
                    continue; // Don't increment attendedCount
                } else {
                    // Future date, don't count against attendance rate
                    $totalScheduled--; // Reduce total scheduled count
                }
            }
        }

        if ($totalScheduled <= 0) {
            return 100; // No valid schedules to evaluate
        }

        return round(($attendedCount / $totalScheduled) * 100, 2);
    }

    /**
     * Update composite name field based on components.
     */
    public function setFullNameFromComponents(): string
    {
        $parts = array_filter([
            $this->first_name,
            $this->middle_name,
            $this->last_name,
        ]);

        return trim(implode(' ', $parts));
    }

    /**
     * Split a full name string into first, middle, and last components.
     */
    public static function splitFullName(?string $name): array
    {
        $name = trim((string) $name);

        if ($name === '') {
            return [null, null, null];
        }

        $parts = preg_split('/\s+/', $name);
        $first = array_shift($parts) ?? null;
        $last = array_pop($parts) ?? null;
        $middle = $parts ? implode(' ', $parts) : null;

        if ($last === null) {
            $last = null;
        }

        return [$first, $middle, $last];
    }

    /**
     * Set individual name parts from provided data, keeping backwards compatibility.
     */
    public function fillNameComponents(array $data): void
    {
        if (isset($data['first_name'])) {
            $this->first_name = $data['first_name'];
        }
        if (array_key_exists('middle_name', $data)) {
            $this->middle_name = $data['middle_name'];
        }
        if (isset($data['last_name'])) {
            $this->last_name = $data['last_name'];
        }

        $this->setFullNameFromComponents();
    }

    /**
     * Accessor for the virtual name attribute.
     */
    protected function name(): Attribute
    {
        return Attribute::make(
            get: fn () => $this->setFullNameFromComponents()
        );
    }

    /**
     * Check if employee's attendance rate is below threshold and update status.
     */
    public function checkAndUpdateAttendanceStatus($threshold = 80)
    {
        $attendanceRate = $this->calculateAttendanceRate();
        
        if ($attendanceRate < $threshold) {
            $this->update(['attendance_status' => 'Inactive']);
            return true; // Status was updated
        } else {
            // If attendance improves, reset to Active
            $this->update(['attendance_status' => 'Active']);
            return false; // No status change needed
        }
    }

    /**
     * Send the email verification notification.
     */
    public function sendEmailVerificationNotification()
    {
        $this->notify(new CustomVerifyEmail);
    }

    /**
     * Send the password reset notification.
     */
    public function sendPasswordResetNotification($token)
    {
        $this->notify(new CustomResetPassword($token));
    }
}

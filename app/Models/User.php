<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
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
     * Create a new employee from applicant data.
     */
    public static function createFromApplicant($applicantData, $positionId, $employeeId = null)
    {
        // Map applicant data to employee data
        $employeeData = [
            'name' => trim($applicantData['first_name'] . ' ' . 
                          ($applicantData['middle_name'] ? $applicantData['middle_name'] . ' ' : '') . 
                          $applicantData['last_name']),
            'email' => $applicantData['email'],
            'password' => bcrypt('temporary'), // Temporary password, will be updated after creation
            'role' => 'Employee',
            'position_id' => $positionId,
            'joining_date' => now()->toDateString(),
            'birthday' => isset($applicantData['birthday']) ? date('Y-m-d', strtotime($applicantData['birthday'])) : null,
            'gender' => $applicantData['gender'] ?? null,
            'contact_number' => $applicantData['phone'] ?? null,
            'resume_file' => $applicantData['resume_file'] ?? null,
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
}

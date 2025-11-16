<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Applicant extends Model
{
    use HasFactory;

    protected $fillable = [
        'first_name',
        'middle_name',
        'last_name',
        'email',
        'phone',
        'address',
        'birthday',
        'gender',
        'job_opening_id',
        'resume_file',
        'profile_picture',
        'status',
        'application_date',
        'notes',
        'interview_schedule',
        'sss_no',
        'tin_no',
        'pag_ibig_no',
        'philhealth_no',
    ];

    protected $casts = [
        'birthday' => 'date',
        'application_date' => 'date',
        'interview_schedule' => 'array',
    ];

    // Get full name
    public function getFullNameAttribute()
    {
        $name = $this->first_name;
        if ($this->middle_name) {
            $name .= ' ' . $this->middle_name;
        }
        $name .= ' ' . $this->last_name;
        return $name;
    }

    // Get resume URL
    public function getResumeUrlAttribute()
    {
        return $this->resume_file ? asset('storage/' . $this->resume_file) : null;
    }

    // Get profile picture URL
    public function getProfilePictureUrlAttribute()
    {
        return $this->profile_picture ? asset('storage/' . $this->profile_picture) : null;
    }

    // Convert applicant to employee data
    public function toEmployeeData($positionId, $employeeId = null)
    {
        return [
            'name' => $this->full_name,
            'email' => $this->email,
            'position_id' => $positionId,
            'joining_date' => now()->toDateString(),
            'birthday' => $this->birthday,
            'gender' => $this->gender,
            'contact_number' => $this->phone,
            'resume_file' => $this->resume_file,
            'role' => 'employee',
            'account_status' => 'active',
            'password' => bcrypt('password123'), // Default password, should be changed on first login
        ];
    }

    // Scope for filtering by status
    public function scopeByStatus($query, $status)
    {
        return $query->where('status', $status);
    }

    // Scope for filtering by date range
    public function scopeByDateRange($query, $startDate, $endDate)
    {
        return $query->whereBetween('application_date', [$startDate, $endDate]);
    }
}

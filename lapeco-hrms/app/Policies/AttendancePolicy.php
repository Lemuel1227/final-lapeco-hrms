<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Attendance;
use Illuminate\Auth\Access\Response;

class AttendancePolicy
{
    /**
     * Determine whether the user can view any attendance records.
     */
    public function viewAny(User $user): bool
    {
        // All authenticated users can view attendance (with restrictions applied in controller)
        return in_array($user->role, ['HR_PERSONNEL', 'TEAM_LEADER', 'REGULAR_EMPLOYEE']);
    }

    /**
     * Determine whether the user can view the attendance record.
     */
    public function view(User $user, Attendance $attendance): bool
    {
        // HR can view any attendance record
        if ($user->role === 'HR_PERSONNEL') {
            return true;
        }

        // Team leaders can view their team's attendance
        if ($user->role === 'TEAM_LEADER') {
            return $attendance->scheduleAssignment->user->position_id === $user->position_id;
        }

        // Regular employees can only view their own attendance
        return $attendance->scheduleAssignment->user_id === $user->id;
    }

    /**
     * Determine whether the user can create attendance records.
     */
    public function create(User $user): bool
    {
        // All authenticated users can create their own attendance records
        return true;
    }

    /**
     * Determine whether the user can update the attendance record.
     */
    public function update(User $user, Attendance $attendance): bool
    {
        // Users can update their own attendance records
        if ($attendance->scheduleAssignment->user_id === $user->id) {
            return true;
        }

        // HR can update any attendance record
        if ($user->role === 'HR_PERSONNEL') {
            return true;
        }

        // Team leaders can update their team's attendance
        if ($user->role === 'TEAM_LEADER') {
            return $attendance->scheduleAssignment->user->position_id === $user->position_id;
        }

        return false;
    }

    /**
     * Determine whether the user can delete the attendance record.
     */
    public function delete(User $user, Attendance $attendance): bool
    {
        // Only HR can delete attendance records
        return $user->role === 'HR_PERSONNEL';
    }

    /**
     * Determine whether the user can clock in/out.
     */
    public function clockInOut(User $user, Attendance $attendance): bool
    {
        // Users can only clock in/out for their own attendance
        return $attendance->scheduleAssignment->user_id === $user->id;
    }

    /**
     * Determine whether the user can view attendance reports.
     */
    public function viewReports(User $user): bool
    {
        // HR can view all reports, team leaders can view their team's reports
        return in_array($user->role, ['HR_PERSONNEL', 'TEAM_LEADER']);
    }

    /**
     * Determine whether the user can export attendance data.
     */
    public function export(User $user): bool
    {
        // Only HR can export attendance data
        return $user->role === 'HR_PERSONNEL';
    }

    /**
     * Determine whether the user can approve/reject attendance corrections.
     */
    public function approveCorrections(User $user, Attendance $attendance): bool
    {
        // Only HR and team leaders can approve corrections
        if (!in_array($user->role, ['HR_PERSONNEL', 'TEAM_LEADER'])) {
            return false;
        }

        // Team leaders can only approve their team's corrections
        if ($user->role === 'TEAM_LEADER') {
            return $attendance->scheduleAssignment->user->position_id === $user->position_id;
        }

        // HR can approve any correction
        return true;
    }

    /**
     * Determine whether the user can view attendance analytics.
     */
    public function viewAnalytics(User $user): bool
    {
        // HR can view all analytics, team leaders can view their team's analytics
        return in_array($user->role, ['HR_PERSONNEL', 'TEAM_LEADER']);
    }
}
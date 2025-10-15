<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Leave;
use Illuminate\Auth\Access\Response;

class LeavePolicy
{
    /**
     * Determine whether the user can view any leaves.
     */
    public function viewAny(User $user): bool
    {
        // All authenticated users can view leaves (with restrictions applied in controller)
        return in_array($user->role, ['HR_PERSONNEL', 'TEAM_LEADER', 'REGULAR_EMPLOYEE']);
    }

    /**
     * Determine whether the user can view the leave.
     */
    public function view(User $user, Leave $leave): bool
    {
        // HR can view any leave
        if ($user->role === 'HR_PERSONNEL') {
            return true;
        }

        // Team leaders can view leaves from their team
        if ($user->role === 'TEAM_LEADER') {
            return $leave->user->position_id === $user->position_id;
        }

        // Regular employees can only view their own leaves
        return $leave->user_id === $user->id;
    }

    /**
     * Determine whether the user can create leaves.
     */
    public function create(User $user): bool
    {
        // All authenticated users can create leave requests
        return true;
    }

    /**
     * Determine whether the user can update the leave.
     */
    public function update(User $user, Leave $leave): bool
    {
        // Users can only update their own pending leave requests
        if ($leave->user_id === $user->id && $leave->status === 'pending') {
            return true;
        }

        // HR and team leaders can update leave requests for approval/rejection
        if (in_array($user->role, ['HR_PERSONNEL', 'TEAM_LEADER'])) {
            // Team leaders can only manage their team's leaves
            if ($user->role === 'TEAM_LEADER') {
                return $leave->user->position_id === $user->position_id;
            }
            return true;
        }

        return false;
    }

    /**
     * Determine whether the user can delete the leave.
     */
    public function delete(User $user, Leave $leave): bool
    {
        // HR can delete any leave
        if ($user->role === 'HR_PERSONNEL') {
            return true;
        }

        // Users can only delete their own pending leave requests
        return $leave->user_id === $user->id && $leave->status === 'pending';
    }

    /**
     * Determine whether the user can approve/reject leaves.
     */
    public function approve(User $user, Leave $leave): bool
    {
        // Only HR and team leaders can approve leaves
        if (!in_array($user->role, ['HR_PERSONNEL', 'TEAM_LEADER'])) {
            return false;
        }

        // Team leaders can only approve their team's leaves
        if ($user->role === 'TEAM_LEADER') {
            return $leave->user->position_id === $user->position_id;
        }

        // HR can approve any leave
        return true;
    }

    /**
     * Determine whether the user can view leave statistics.
     */
    public function viewStatistics(User $user): bool
    {
        // HR can view all statistics, team leaders can view their team's statistics
        return in_array($user->role, ['HR_PERSONNEL', 'TEAM_LEADER']);
    }

    /**
     * Determine whether the user can export leave data.
     */
    public function export(User $user): bool
    {
        // Only HR can export leave data
        return $user->role === 'HR_PERSONNEL';
    }
}
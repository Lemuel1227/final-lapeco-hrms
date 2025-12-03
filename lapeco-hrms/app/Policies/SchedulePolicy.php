<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Schedule;
use Illuminate\Auth\Access\Response;

class SchedulePolicy
{
    /**
     * Determine whether the user can view any schedules.
     */
    public function viewAny(User $user): bool
    {
        // All authenticated users can view schedules
        return true;
    }

    /**
     * Determine whether the user can view the schedule.
     */
    public function view(User $user, Schedule $schedule): bool
    {
        // All authenticated users can view schedules
        return true;
    }

    /**
     * Determine whether the user can create schedules.
     */
    public function create(User $user): bool
    {
        // Only HR and team leaders can create schedules
        return $user->role === 'SUPER_ADMIN' || $user->is_team_leader;
    }

    /**
     * Determine whether the user can update the schedule.
     */
    public function update(User $user, Schedule $schedule): bool
    {
        // Only HR and team leaders can update schedules
        return $user->role === 'SUPER_ADMIN' || $user->is_team_leader;
    }

    /**
     * Determine whether the user can delete the schedule.
     */
    public function delete(User $user, Schedule $schedule): bool
    {
        // Only HR and team leaders can delete schedules
        return $user->role === 'SUPER_ADMIN' || $user->is_team_leader;
    }

    /**
     * Determine whether the user can assign employees to schedules.
     */
    public function assignEmployees(User $user): bool
    {
        // Only HR and team leaders can assign employees to schedules
        return $user->role === 'SUPER_ADMIN' || $user->is_team_leader;
    }

    /**
     * Determine whether the user can manage schedule templates.
     */
    public function manageTemplates(User $user): bool
    {
        // Only HR and team leaders can manage schedule templates
        return $user->role === 'SUPER_ADMIN' || $user->is_team_leader;
    }

    /**
     * Determine whether the user can view schedule analytics.
     */
    public function viewAnalytics(User $user): bool
    {
        // HR can view all analytics, team leaders can view their team's analytics
        return $user->role === 'SUPER_ADMIN' || $user->is_team_leader;
    }

    /**
     * Determine whether the user can export schedule data.
     */
    public function export(User $user): bool
    {
        // Only HR can export schedule data
        return $user->role === 'SUPER_ADMIN';
    }

    /**
     * Determine whether the user can publish/unpublish schedules.
     */
    public function publish(User $user, Schedule $schedule): bool
    {
        // Only HR and team leaders can publish schedules
        return $user->role === 'SUPER_ADMIN' || $user->is_team_leader;
    }
}

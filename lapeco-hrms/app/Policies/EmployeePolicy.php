<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\Response;

class EmployeePolicy
{
    /**
     * Determine whether the user can view any employees.
     */
    public function viewAny(User $user): bool
    {
        // All authenticated users can view employees (with restrictions applied in controller)
        return in_array($user->role, ['HR_PERSONNEL', 'TEAM_LEADER', 'REGULAR_EMPLOYEE']);
    }

    /**
     * Determine whether the user can view the employee.
     */
    public function view(User $user, User $employee): bool
    {
        // HR can view any employee
        if ($user->role === 'HR_PERSONNEL') {
            return true;
        }

        // Team leaders and regular employees can only view employees in their position
        return $employee->position_id === $user->position_id;
    }

    /**
     * Determine whether the user can create employees.
     */
    public function create(User $user): bool
    {
        // Only HR personnel can create new employees
        return $user->role === 'HR_PERSONNEL';
    }

    /**
     * Determine whether the user can update the employee.
     */
    public function update(User $user, User $employee): bool
    {
        // HR can update any employee
        if ($user->role === 'HR_PERSONNEL') {
            return true;
        }

        // Users can only update their own profile
        return $employee->id === $user->id;
    }

    /**
     * Determine whether the user can delete the employee.
     */
    public function delete(User $user, User $employee): bool
    {
        // Only HR personnel can delete employees
        if ($user->role !== 'HR_PERSONNEL') {
            return false;
        }

        // Prevent self-deletion
        return $employee->id !== $user->id;
    }

    /**
     * Determine whether the user can restore the employee.
     */
    public function restore(User $user, User $employee): bool
    {
        // Only HR personnel can restore employees
        return $user->role === 'HR_PERSONNEL';
    }

    /**
     * Determine whether the user can permanently delete the employee.
     */
    public function forceDelete(User $user, User $employee): bool
    {
        // Only HR personnel can permanently delete employees
        return $user->role === 'HR_PERSONNEL';
    }

    /**
     * Determine whether the user can manage employee roles.
     */
    public function manageRoles(User $user): bool
    {
        // Only HR personnel can manage employee roles
        return $user->role === 'HR_PERSONNEL';
    }

    /**
     * Determine whether the user can view employee sensitive data.
     */
    public function viewSensitiveData(User $user, User $employee): bool
    {
        // HR can view sensitive data for any employee
        if ($user->role === 'HR_PERSONNEL') {
            return true;
        }

        // Users can only view their own sensitive data
        return $employee->id === $user->id;
    }

    /**
     * Determine whether the user can deactivate/activate employee accounts.
     */
    public function manageAccountStatus(User $user, User $employee): bool
    {
        // Only HR personnel can manage account status
        if ($user->role !== 'HR_PERSONNEL') {
            return false;
        }

        // Prevent self-deactivation
        return $employee->id !== $user->id;
    }
}
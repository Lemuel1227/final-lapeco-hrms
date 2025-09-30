<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RoleBasedAccess
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next, string $resource, string $action = 'view'): Response
    {
        $user = $request->user();
        
        if (!$user) {
            return response()->json([
                'message' => 'Authentication required.',
                'error_type' => 'authentication_error'
            ], 401);
        }

        // Check if user has permission for the resource and action
        if (!$this->hasPermission($user, $resource, $action, $request)) {
            return response()->json([
                'message' => $this->getAccessDeniedMessage($user->role, $resource, $action),
                'error_type' => 'authorization_error'
            ], 403);
        }

        return $next($request);
    }

    /**
     * Check if user has permission for a specific resource and action
     */
    private function hasPermission($user, string $resource, string $action, Request $request): bool
    {
        $role = $user->role;
        
        switch ($resource) {
            case 'employee':
                return $this->checkEmployeePermission($user, $action, $request);
            
            case 'leave':
                return $this->checkLeavePermission($user, $action, $request);
            
            case 'schedule':
                return $this->checkSchedulePermission($user, $action, $request);
            
            case 'attendance':
                return $this->checkAttendancePermission($user, $action, $request);
            
            case 'position':
                return $this->checkPositionPermission($user, $action, $request);
            
            case 'payroll':
                return $this->checkPayrollPermission($user, $action, $request);
            
            case 'training':
                return $this->checkTrainingPermission($user, $action, $request);
            
            case 'disciplinary':
                return $this->checkDisciplinaryPermission($user, $action, $request);
            
            case 'recruitment':
                return $this->checkRecruitmentPermission($user, $action, $request);
            
            default:
                return false;
        }
    }

    /**
     * Check employee-related permissions
     */
    private function checkEmployeePermission($user, string $action, Request $request): bool
    {
        $role = $user->role;
        
        switch ($action) {
            case 'view':
            case 'index':
                // HR can view all, Team Leaders and Regular employees can view same position
                return in_array($role, ['HR_PERSONNEL', 'TEAM_LEADER', 'REGULAR_EMPLOYEE']);
            
            case 'show':
                // Check if user can view specific employee
                $targetEmployee = $request->route('employee');
                if ($role === 'HR_PERSONNEL') {
                    return true;
                }
                // Team leaders and regular employees can only view same position
                return $targetEmployee && $targetEmployee->position_id === $user->position_id;
            
            case 'create':
            case 'store':
                // Only HR can create employees
                return $role === 'HR_PERSONNEL';
            
            case 'update':
                // HR can update any employee, others can only update themselves
                $targetEmployee = $request->route('employee');
                if ($role === 'HR_PERSONNEL') {
                    return true;
                }
                return $targetEmployee && $targetEmployee->id === $user->id;
            
            case 'delete':
            case 'destroy':
                // Only HR can delete employees
                return $role === 'HR_PERSONNEL';
            
            default:
                return false;
        }
    }

    /**
     * Check leave-related permissions
     */
    private function checkLeavePermission($user, string $action, Request $request): bool
    {
        $role = $user->role;
        
        switch ($action) {
            case 'view':
            case 'index':
                // HR can view all, Team Leaders can view team, Regular employees can view own
                return in_array($role, ['HR_PERSONNEL', 'TEAM_LEADER', 'REGULAR_EMPLOYEE']);
            
            case 'create':
            case 'store':
                // All authenticated users can create leave requests
                return true;
            
            case 'update':
            case 'approve':
                // HR can approve all, Team Leaders can approve team leaves
                return in_array($role, ['HR_PERSONNEL', 'TEAM_LEADER']);
            
            case 'delete':
            case 'destroy':
                // HR can delete any, others can delete own pending requests
                return true; // Additional logic needed in controller
            
            default:
                return false;
        }
    }

    /**
     * Check schedule-related permissions
     */
    private function checkSchedulePermission($user, string $action, Request $request): bool
    {
        $role = $user->role;
        
        switch ($action) {
            case 'view':
            case 'index':
                // All can view schedules
                return true;
            
            case 'create':
            case 'store':
            case 'update':
            case 'delete':
            case 'destroy':
                // Only HR and Team Leaders can manage schedules
                return in_array($role, ['HR_PERSONNEL', 'TEAM_LEADER']);
            
            default:
                return false;
        }
    }

    /**
     * Check attendance-related permissions
     */
    private function checkAttendancePermission($user, string $action, Request $request): bool
    {
        $role = $user->role;
        
        switch ($action) {
            case 'view':
            case 'index':
                // HR can view all, Team Leaders can view team, Regular employees can view own
                return in_array($role, ['HR_PERSONNEL', 'TEAM_LEADER', 'REGULAR_EMPLOYEE']);
            
            case 'create':
            case 'store':
            case 'update':
                // All can manage their own attendance
                return true;
            
            case 'delete':
            case 'destroy':
                // Only HR can delete attendance records
                return $role === 'HR_PERSONNEL';
            
            default:
                return false;
        }
    }

    /**
     * Check position-related permissions
     */
    private function checkPositionPermission($user, string $action, Request $request): bool
    {
        $role = $user->role;
        
        switch ($action) {
            case 'view':
            case 'index':
                // All can view positions
                return true;
            
            case 'create':
            case 'store':
            case 'update':
            case 'delete':
            case 'destroy':
                // Only HR can manage positions
                return $role === 'HR_PERSONNEL';
            
            default:
                return false;
        }
    }

    /**
     * Check payroll-related permissions
     */
    private function checkPayrollPermission($user, string $action, Request $request): bool
    {
        $role = $user->role;
        
        switch ($action) {
            case 'view':
            case 'index':
                // HR can view all, others can view own
                return true; // Additional logic needed in controller
            
            case 'create':
            case 'store':
            case 'update':
            case 'delete':
            case 'destroy':
                // Only HR can manage payroll
                return $role === 'HR_PERSONNEL';
            
            default:
                return false;
        }
    }

    /**
     * Check training-related permissions
     */
    private function checkTrainingPermission($user, string $action, Request $request): bool
    {
        $role = $user->role;
        
        switch ($action) {
            case 'view':
            case 'index':
                // All can view training programs
                return true;
            
            case 'create':
            case 'store':
            case 'update':
            case 'delete':
            case 'destroy':
                // Only HR can manage training programs
                return $role === 'HR_PERSONNEL';
            
            case 'enroll':
                // All can enroll in training
                return true;
            
            default:
                return false;
        }
    }

    /**
     * Check disciplinary-related permissions
     */
    private function checkDisciplinaryPermission($user, string $action, Request $request): bool
    {
        $role = $user->role;
        
        switch ($action) {
            case 'view':
            case 'index':
                // HR can view all, Team Leaders can view team cases
                return in_array($role, ['HR_PERSONNEL', 'TEAM_LEADER']);
            
            case 'create':
            case 'store':
            case 'update':
            case 'delete':
            case 'destroy':
                // Only HR can manage disciplinary cases
                return $role === 'HR_PERSONNEL';
            
            default:
                return false;
        }
    }

    /**
     * Check recruitment-related permissions
     */
    private function checkRecruitmentPermission($user, string $action, Request $request): bool
    {
        $role = $user->role;
        
        switch ($action) {
            case 'view':
            case 'index':
            case 'create':
            case 'store':
            case 'update':
            case 'delete':
            case 'destroy':
                // Only HR can manage recruitment
                return $role === 'HR_PERSONNEL';
            
            default:
                return false;
        }
    }

    /**
     * Get appropriate access denied message based on role and resource
     */
    private function getAccessDeniedMessage(string $role, string $resource, string $action): string
    {
        $messages = [
            'HR_PERSONNEL' => 'Access denied. This action is not available for your role.',
            'TEAM_LEADER' => 'Access denied. Team leaders can only manage their team members and related resources.',
            'REGULAR_EMPLOYEE' => 'Access denied. Regular employees have limited access to system resources.'
        ];

        $specificMessages = [
            'employee' => [
                'create' => 'Only HR personnel can create new employee accounts.',
                'update' => 'You can only update your own profile or contact HR for assistance.',
                'delete' => 'Only HR personnel can delete employee accounts.',
            ],
            'leave' => [
                'approve' => 'Only HR personnel and team leaders can approve leave requests.',
                'delete' => 'You can only delete your own pending leave requests.',
            ],
            'schedule' => [
                'create' => 'Only HR personnel and team leaders can create schedules.',
                'update' => 'Only HR personnel and team leaders can modify schedules.',
                'delete' => 'Only HR personnel and team leaders can delete schedules.',
            ],
            'payroll' => [
                'view' => 'You can only view your own payroll information.',
                'create' => 'Only HR personnel can manage payroll.',
                'update' => 'Only HR personnel can modify payroll.',
                'delete' => 'Only HR personnel can delete payroll records.',
            ]
        ];

        // Return specific message if available
        if (isset($specificMessages[$resource][$action])) {
            return $specificMessages[$resource][$action];
        }

        // Return role-based generic message
        return $messages[$role] ?? 'Access denied.';
    }
}
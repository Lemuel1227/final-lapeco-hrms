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
        $roleAliases = [
            'EMPLOYEE' => 'REGULAR_EMPLOYEE',
            'HR_PERSONNEL' => 'SUPER_ADMIN',
        ];
        $role = $roleAliases[$role] ?? $role;
        
        // Treat Team Leaders as having TEAM_LEADER role for permission checks
        if ($user->is_team_leader && $role !== 'SUPER_ADMIN') {
            $role = 'TEAM_LEADER';
        }

        $modules = $this->getPositionModules($user);
        $isHr = $role === 'SUPER_ADMIN';
        
        switch ($resource) {
            case 'employee':
                if ($isHr) return true;
                if (in_array($action, ['view', 'index', 'show'])) {
                    return $this->checkEmployeePermission($user, $action, $request);
                }
                return $this->checkModulePermission($modules, 'employee_data', $action, $request, $user);
            
            case 'leave':
                if ($isHr) return true;
                return $this->checkModulePermission($modules, 'leave_management', $action, $request, $user);
            
            case 'schedule':
                if ($isHr) return true;
                if (in_array($action, ['view', 'index', 'show'])) {
                    return $this->checkSchedulePermission($user, $action, $request);
                }
                return $this->checkModulePermission($modules, 'schedules', $action, $request, $user);
            
            case 'attendance':
                if ($isHr) return true;
                if (in_array($action, ['view', 'index', 'show'])) {
                    return $this->checkAttendancePermission($user, $action, $request);
                }
                return $this->checkModulePermission($modules, 'attendance_management', $action, $request, $user);
            
            case 'position':
                if ($isHr) return true;
                if (in_array($action, ['view', 'index', 'show'])) {
                    return $this->checkPositionPermission($user, $action, $request);
                }
                return $this->checkModulePermission($modules, 'department_management', $action, $request, $user);
            
            case 'payroll':
                if ($isHr) return true;
                return $this->checkModulePermission($modules, 'payroll_management', $action, $request, $user);
            
            case 'training':
                if ($isHr) return true;
                return $this->checkModulePermission($modules, 'training_and_development', $action, $request, $user);
            
            case 'disciplinary':
                if ($isHr) return true;
                return $this->checkModulePermission($modules, 'case_management', $action, $request, $user);
            
            case 'recruitment':
                if ($isHr) return true;
                return $this->checkModulePermission($modules, 'recruitment', $action, $request, $user);
            
            case 'resignation':
                if ($isHr) return true;
                return $this->checkModulePermission($modules, 'resignation_management', $action, $request, $user);
            
            case 'performance':
                if ($isHr) return true;
                return $this->checkModulePermission($modules, 'performance_management', $action, $request, $user);
            
            default:
                return false;
        }
    }

    private function getPositionModules($user): array
    {
        try {
            $position = $user->position;
            return is_array($position?->allowed_modules) ? $position->allowed_modules : [];
        } catch (\Throwable $e) {
            return [];
        }
    }

    private function checkModulePermission(array $modules, string $moduleKey, string $action, Request $request, $user): bool
    {
        $aliases = [
            'employee' => 'employee_data',
            'leave' => 'leave_management',
            'schedule' => 'schedules',
            'attendance' => 'attendance_management',
            'positions' => 'department_management',
            'departments' => 'department_management',
            'payroll' => 'payroll_management',
            'training' => 'training_and_development',
            'disciplinary' => 'case_management',
            'resignation' => 'resignation_management',
            'performance' => 'performance_management',
        ];
        $normalizedKey = $aliases[$moduleKey] ?? $moduleKey;
        $hasMyAccess = function(string $key) use ($modules) {
            switch ($key) {
                case 'attendance_management':
                    return in_array('my_attendance', $modules);
                case 'leave_management':
                    return in_array('my_leave', $modules);
                case 'payroll_management':
                    return in_array('my_payroll', $modules);
                case 'case_management':
                    return in_array('my_cases', $modules) || in_array('submit_incident_report', $modules);
                case 'resignation_management':
                    return in_array('my_resignation', $modules);
                case 'performance_management':
                    return in_array('submit_evaluation', $modules) || in_array('my_team', $modules);
                default:
                    return false;
            }
        };

        if (!in_array($normalizedKey, $modules) && !$hasMyAccess($normalizedKey)) {
            return false;
        }
        // For view/index/show, having module is enough
        if (in_array($action, ['view', 'index', 'show'])) {
            return true;
        }
        // For create/store/update/delete/destroy require module; add simple ownership checks where applicable
        switch ($normalizedKey) {
            case 'employee_data':
                return in_array($action, ['create','store','update','delete','destroy','view','index','show']);
            case 'department_management':
            case 'attendance_management':
            case 'schedules':
            case 'leave_management':
            case 'payroll_management':
            case 'training_and_development':
            case 'case_management':
            case 'recruitment':
            case 'resignation_management':
            case 'performance_management':
                $isMyAccess = $hasMyAccess($normalizedKey);
                if ($isMyAccess) {
                    switch ($normalizedKey) {
                        case 'attendance_management':
                            return in_array($action, ['store','update','view','index','show']);
                        case 'leave_management':
                            return in_array($action, ['store','update','view','index','show']);
                        case 'payroll_management':
                            return in_array($action, ['view','index','show']);
                        case 'case_management':
                            if (in_array('submit_incident_report', $modules)) {
                                if (in_array($action, ['store','view','index','show'])) return true;
                            }
                            if (in_array('my_cases', $modules)) {
                                return in_array($action, ['view','index','show']);
                            }
                            return false;
                        case 'resignation_management':
                            return in_array($action, ['store','update','view','index','show']);
                        case 'performance_management':
                            if ($action === 'evaluate') return true;
                            return in_array($action, ['view','index','show']);
                        default:
                            return false;
                    }
                }
                return true;
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
        if ($user->is_team_leader && $role !== 'SUPER_ADMIN') {
            $role = 'TEAM_LEADER';
        }
        
        switch ($action) {
            case 'view':
            case 'index':
                // HR can view all, Team Leaders and Regular employees can view same position
                return in_array($role, ['SUPER_ADMIN', 'HR_PERSONNEL', 'TEAM_LEADER', 'REGULAR_EMPLOYEE']);
            
            case 'show':
                // Check if user can view specific employee
                $targetEmployee = $request->route('employee');
                if (in_array($role, ['SUPER_ADMIN', 'HR_PERSONNEL'])) {
                    return true;
                }
                // Team leaders and regular employees can only view same position
                return $targetEmployee && $targetEmployee->position_id === $user->position_id;
            
            case 'create':
            case 'store':
                // Only HR can create employees
                return in_array($role, ['SUPER_ADMIN', 'HR_PERSONNEL']);
            
            case 'update':
                // HR can update any employee, others can only update themselves
                $targetEmployee = $request->route('employee');
                if (in_array($role, ['SUPER_ADMIN', 'HR_PERSONNEL'])) {
                    return true;
                }
                return $targetEmployee && $targetEmployee->id === $user->id;
            
            case 'delete':
            case 'destroy':
                // Only HR can delete employees
                return in_array($role, ['SUPER_ADMIN', 'HR_PERSONNEL']);
            
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
        if ($user->is_team_leader && $role !== 'SUPER_ADMIN') {
            $role = 'TEAM_LEADER';
        }
        
        switch ($action) {
            case 'view':
            case 'index':
                // HR can view all, Team Leaders can view team, Regular employees can view own
                return in_array($role, ['SUPER_ADMIN', 'TEAM_LEADER', 'REGULAR_EMPLOYEE']);
            
            case 'create':
            case 'store':
                // All authenticated users can create leave requests
                return true;
            
            case 'update':
                if (in_array($role, ['SUPER_ADMIN', 'TEAM_LEADER'])) {
                    return true;
                }

                if ($role === 'REGULAR_EMPLOYEE') {
                    $targetLeave = $request->route('leave');
                    $newStatus = $request->input('status');

                    if ($targetLeave && $targetLeave->user_id === $user->id && $newStatus === 'Canceled') {
                        return true;
                    }
                }

                return false;

            case 'approve':
                // HR can approve all, Team Leaders can approve team leaves
                return in_array($role, ['SUPER_ADMIN', 'TEAM_LEADER']);
            
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
        if ($user->is_team_leader && $role !== 'SUPER_ADMIN') {
            $role = 'TEAM_LEADER';
        }
        
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
                return in_array($role, ['SUPER_ADMIN', 'TEAM_LEADER']);
            
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
        if ($user->is_team_leader && $role !== 'SUPER_ADMIN') {
            $role = 'TEAM_LEADER';
        }
        
        switch ($action) {
            case 'view':
            case 'index':
                // HR can view all, Team Leaders can view team, Regular employees can view own
                return in_array($role, ['SUPER_ADMIN', 'TEAM_LEADER', 'REGULAR_EMPLOYEE']);
            
            case 'create':
            case 'store':
            case 'update':
                // All can manage their own attendance
                return true;
            
            case 'delete':
            case 'destroy':
                // Only HR can delete attendance records
                return $role === 'SUPER_ADMIN';
            
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
        if ($user->is_team_leader && $role !== 'SUPER_ADMIN') {
            $role = 'TEAM_LEADER';
        }
        
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
                return $role === 'SUPER_ADMIN';
            
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
        if ($user->is_team_leader && $role !== 'SUPER_ADMIN') {
            $role = 'TEAM_LEADER';
        }
        
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
                return $role === 'SUPER_ADMIN';
            
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
        if ($user->is_team_leader && $role !== 'SUPER_ADMIN') {
            $role = 'TEAM_LEADER';
        }
        
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
                return $role === 'SUPER_ADMIN';
            
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
        if ($user->is_team_leader && $role !== 'SUPER_ADMIN') {
            $role = 'TEAM_LEADER';
        }
        
        switch ($action) {
            case 'view':
            case 'index':
                return in_array($role, ['SUPER_ADMIN', 'TEAM_LEADER']);
            case 'create':
            case 'store':
                return in_array($role, ['SUPER_ADMIN', 'TEAM_LEADER', 'REGULAR_EMPLOYEE']);
            case 'update':
            case 'delete':
            case 'destroy':
                return $role === 'SUPER_ADMIN';
            
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
        if ($user->is_team_leader && $role !== 'SUPER_ADMIN') {
            $role = 'TEAM_LEADER';
        }
        
        switch ($action) {
            case 'view':
            case 'index':
            case 'create':
            case 'store':
            case 'update':
            case 'delete':
            case 'destroy':
                // Only HR can manage recruitment
                return $role === 'SUPER_ADMIN';
            
            default:
                return false;
        }
    }

    /**
     * Check performance-related permissions
     */
    private function checkPerformancePermission($user, string $action, Request $request): bool
    {
        $role = $user->role;
        if ($user->is_team_leader && $role !== 'SUPER_ADMIN') {
            $role = 'TEAM_LEADER';
        }
        
        switch ($action) {
            case 'view':
            case 'index':
                // All authenticated users can view performance data
                return in_array($role, ['SUPER_ADMIN', 'TEAM_LEADER', 'REGULAR_EMPLOYEE']);
            
            case 'evaluate':
                // Team leaders can evaluate their team members
                // Regular employees can evaluate their team leader
                return in_array($role, ['TEAM_LEADER', 'REGULAR_EMPLOYEE']);
            
            case 'create':
            case 'store':
                // Only HR can create evaluation periods and evaluations
                return $role === 'SUPER_ADMIN';
            
            case 'update':
                // Only HR can update evaluation periods and evaluations
                return $role === 'SUPER_ADMIN';
            
            case 'delete':
            case 'destroy':
                // Only HR can delete evaluation periods
                return $role === 'SUPER_ADMIN';
            
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
            'SUPER_ADMIN' => 'Access denied. This action is not available for your role.',
        ];

        $specificMessages = [
            'employee' => [
                'create' => 'Only Super Admins can create new employee accounts.',
                'update' => 'You can only update your own profile or contact a Super Admin for assistance.',
                'delete' => 'Only Super Admins can delete employee accounts.',
            ],
            'leave' => [
                'approve' => 'Only Super Admins and team leaders can approve leave requests.',
                'delete' => 'You can only delete your own pending leave requests.',
            ],
            'schedule' => [
                'create' => 'Only Super Admins and team leaders can create schedules.',
                'update' => 'Only Super Admins and team leaders can modify schedules.',
                'delete' => 'Only Super Admins and team leaders can delete schedules.',
            ],
            'payroll' => [
                'view' => 'You can only view your own payroll information.',
                'create' => 'Only Super Admins can manage payroll.',
                'update' => 'Only Super Admins can modify payroll.',
                'delete' => 'Only Super Admins can delete payroll records.',
            ]
        ];

        // Return specific message if available
        if (isset($specificMessages[$resource][$action])) {
            return $specificMessages[$resource][$action];
        }

        return $messages[$role] ?? 'Access denied.';
    }
}

<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Auth\AuthenticatedSessionController;
use App\Http\Controllers\Auth\RegisteredUserController;
use App\Http\Controllers\Auth\AccountController;
use App\Http\Controllers\Auth\PasswordResetController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\SessionController;
use App\Http\Controllers\ScheduleController;
use App\Http\Controllers\EmployeeController;
use App\Http\Controllers\PositionController;
use App\Http\Controllers\HolidayController;
use App\Http\Controllers\LeaveController;
use App\Http\Controllers\PayrollController;
use App\Http\Controllers\RecruitmentController;
use App\Http\Controllers\ApplicantController;
use App\Http\Controllers\PerformanceController;
use App\Http\Controllers\TrainingController;
use App\Http\Controllers\DisciplinaryCaseController;
use App\Http\Controllers\ActionLogController;
use App\Http\Controllers\AttendanceController;
use App\Http\Controllers\ResignationController;
use App\Http\Controllers\TerminationController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\TeamLeaderDashboardController;
use App\Http\Controllers\EmployeeDashboardController;
use App\Http\Controllers\LeaderboardController;
use App\Models\User;
use App\Models\Position;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

// Public routes
Route::post('/login', [AuthenticatedSessionController::class, 'store']);
Route::post('/register', [RegisteredUserController::class, 'store']);
Route::post('/forgot-password', [PasswordResetController::class, 'sendResetLinkEmail']);
Route::post('/reset-password', [PasswordResetController::class, 'reset']);

// Public recruitment routes for testing
Route::get('/applicants/statistics', [ApplicantController::class, 'getStats']);
Route::get('/applicants', [ApplicantController::class, 'index']);
Route::post('/applicants', [ApplicantController::class, 'store']); // Add public POST route for testing
Route::get('/positions', [PositionController::class, 'publicIndex']);

// Resume serving route (handles auth internally)
Route::get('/employees/{employee}/resume', [EmployeeController::class, 'serveResume'])->name('employee.resume');

Route::get('/email/verify/{id}/{hash}', [ProfileController::class, 'verifyEmail'])
    ->middleware(['signed', 'throttle:1,1'])
    ->name('verification.verify');

Route::middleware(['auth:sanctum', 'check.account.status'])->group(function () {
    // User profile
    Route::get('/user', function (Request $request) {
        return $request->user();
    });
    
    // User theme preference
    Route::put('/user/theme-preference', [ProfileController::class, 'updateThemePreference']);
    
    Route::get('/profile', [ProfileController::class, 'edit']);
    Route::patch('/profile', [ProfileController::class, 'update']);
    Route::delete('/profile', [ProfileController::class, 'destroy']);
    
    // Password change
    Route::put('/password', [\App\Http\Controllers\Auth\PasswordController::class, 'update']);

    // Email verification routes
    Route::post('/email/verification-notification', [ProfileController::class, 'sendVerificationNotification']);

    // Session management routes
    Route::middleware('web')->group(function () {
        Route::get('/sessions', [SessionController::class, 'index']);
        Route::delete('/sessions/{sessionId}', [SessionController::class, 'destroy']);
    });

    
    // Employee Data - with role-based access control
    Route::middleware(['role.access:employee,index'])->get('/employees', [EmployeeController::class, 'index']);
    Route::middleware(['role.access:employee,index'])->get('/employees/list', [EmployeeController::class, 'getEmployeesList']);
    Route::middleware(['role.access:employee,index'])->get('/employees/all', [EmployeeController::class, 'getAllEmployees']);
    Route::middleware(['role.access:employee,show'])->get('/employees/{employee}', [EmployeeController::class, 'show']);
    Route::middleware(['role.access:employee,store'])->post('/employees', [EmployeeController::class, 'store']);
    Route::middleware(['role.access:employee,update'])->put('/employees/{employee}', [EmployeeController::class, 'update']);
    Route::middleware(['role.access:employee,destroy'])->delete('/employees/{employee}', [EmployeeController::class, 'destroy']);
    Route::middleware(['role.access:employee,update'])->post('/employees/{employee}/reset-password', [AccountController::class, 'resetPassword']);
    Route::middleware(['role.access:employee,update'])->post('/employees/{employee}/deactivate', [AccountController::class, 'deactivateAccount']);
    Route::middleware(['role.access:employee,update'])->post('/employees/{employee}/activate', [AccountController::class, 'activateAccount']);
    Route::middleware(['role.access:employee,update'])->post('/employees/{employee}/rehire', [EmployeeController::class, 'rehireEmployee']);
    Route::middleware(['role.access:employee,update'])->post('/employees/{employee}/toggle-team-leader', [EmployeeController::class, 'toggleTeamLeaderStatus']);

    // Positions (authenticated routes) - with role-based access control
    Route::middleware(['role.access:position,index'])->get('/positions/authenticated', [PositionController::class, 'index']);
    Route::middleware(['role.access:position,view'])->get('/positions/{position}', [PositionController::class, 'show']);
    Route::middleware(['role.access:position,store'])->post('/positions', [PositionController::class, 'store']);
    Route::middleware(['role.access:position,update'])->put('/positions/{position}', [PositionController::class, 'update']);
    Route::middleware(['role.access:position,destroy'])->delete('/positions/{position}', [PositionController::class, 'destroy']);
    Route::middleware(['role.access:position,view'])->get('/positions/{position}/employees', [PositionController::class, 'employees']);

    // Attendance Management - with role-based access control
    Route::middleware(['role.access:attendance,index'])->get('/attendance', [AttendanceController::class, 'index']);
    Route::middleware(['role.access:attendance,store'])->post('/attendance', [AttendanceController::class, 'store']);
    Route::middleware(['role.access:attendance,index'])->get('/attendance-logs', [AttendanceController::class, 'getLogs']);
    Route::middleware(['role.access:attendance,index'])->get('/attendance-history', [AttendanceController::class, 'getAttendanceHistory']);
    Route::middleware(['role.access:attendance,index'])->get('/attendance-daily', [AttendanceController::class, 'getDailyAttendance']);
    Route::middleware(['role.access:attendance,index'])->get('/attendance/employees', [AttendanceController::class, 'getEmployees']);
    Route::middleware(['role.access:attendance,index'])->get('/attendance/employee/{employeeId}', [AttendanceController::class, 'getEmployeeAttendance']);
    Route::middleware(['role.access:attendance,store'])->post('/attendance/clock', [AttendanceController::class, 'clockAction']);
    Route::middleware(['role.access:attendance,view'])->get('/attendance/{attendance}', [AttendanceController::class, 'show']);
    Route::middleware(['role.access:attendance,update'])->put('/attendance/{attendance}', [AttendanceController::class, 'update']);
    Route::middleware(['role.access:attendance,destroy'])->delete('/attendance/{attendance}', [AttendanceController::class, 'destroy']);

    // Dashboard summaries
    Route::middleware(['role.access:employee,index'])->get('/dashboard/team-leader/summary', [TeamLeaderDashboardController::class, 'summary']);
    Route::middleware(['role.access:employee,index'])->get('/dashboard/employee/summary', [EmployeeDashboardController::class, 'summary']);
    Route::middleware(['role.access:employee,index'])->get('/leaderboards', [LeaderboardController::class, 'index']);

    // Schedule Management - with role-based access control
    Route::middleware(['role.access:schedule,index'])->get('/schedules', [ScheduleController::class, 'index']);
    Route::middleware(['role.access:schedule,index'])->get('/schedules/api', [ScheduleController::class, 'apiIndex']);
    Route::middleware(['role.access:schedule,index'])->get('/schedules/by-date', [ScheduleController::class, 'getByDate']);
    Route::middleware(['role.access:schedule,index'])->get('/schedules/basic', [ScheduleController::class, 'apiIndexBasic']);
    Route::middleware(['role.access:schedule,view'])->get('/schedules/{id}', [ScheduleController::class, 'show']);
    Route::middleware(['role.access:schedule,store'])->post('/schedules', [ScheduleController::class, 'store']);
    Route::middleware(['role.access:schedule,update'])->put('/schedules/{schedule}', [ScheduleController::class, 'update']);
    Route::middleware(['role.access:schedule,destroy'])->delete('/schedules/{schedule}', [ScheduleController::class, 'destroy']);
    Route::get('/schedules/create', function (Request $request) {
        return response()->json([
            'employees' => User::all(),
            'positions' => Position::all()->map(function ($pos) {
                return [
                    'id' => $pos->id,
                    'title' => $pos->name,
                ];
            }),
            'initialDate' => $request->input('date'),
            'method' => $request->input('method'),
            'sourceData' => $request->input('sourceData'),
        ]);
    });

    // Schedule Templates - with role-based access control
    Route::middleware(['role.access:schedule,index'])->get('/schedule-templates', [ScheduleController::class, 'templatesIndex']);
    Route::middleware(['role.access:schedule,index'])->get('/schedule-templates/{id}', [ScheduleController::class, 'templatesShow']);
    Route::middleware(['role.access:schedule,store'])->post('/schedule-templates', [ScheduleController::class, 'createTemplate']);
    Route::middleware(['role.access:schedule,update'])->put('/schedule-templates/{id}', [ScheduleController::class, 'updateTemplate']);
    Route::middleware(['role.access:schedule,destroy'])->delete('/schedule-templates/{id}', [ScheduleController::class, 'deleteTemplate']);

    // Leave Management - with role-based access control
    Route::middleware(['role.access:leave,index'])->get('/leaves', [LeaveController::class, 'index']);
    Route::middleware(['role.access:leave,view'])->get('/leaves/{leave}', [LeaveController::class, 'show']);
    Route::middleware(['role.access:leave,store'])->post('/leaves', [LeaveController::class, 'store']);
    Route::middleware(['role.access:leave,update'])->put('/leaves/{leave}', [LeaveController::class, 'update']);
    Route::middleware(['role.access:leave,destroy'])->delete('/leaves/{leave}', [LeaveController::class, 'destroy']);
    
    // Leave Credits Management
    Route::middleware(['role.access:leave,index'])->get('/leave-credits/all', [LeaveController::class, 'getAllLeaveCredits']);
    Route::middleware(['role.access:leave,index'])->get('/leave-credits/{userId}', [LeaveController::class, 'getLeaveCredits']);
    Route::middleware(['role.access:leave,update'])->put('/leave-credits/{userId}', [LeaveController::class, 'updateLeaveCredits']);
    Route::middleware(['role.access:leave,update'])->post('/leave-credits/bulk-add', [LeaveController::class, 'bulkAddCredits']);
    Route::middleware(['role.access:leave,update'])->post('/leave-credits/reset', [LeaveController::class, 'resetUsedCredits']);

    // Payroll - with role-based access control
    Route::middleware(['role.access:payroll,index'])->get('/payroll', [PayrollController::class, 'index']);
    Route::middleware(['role.access:payroll,index'])->get('/payroll/compute', [PayrollController::class, 'compute']);
    Route::middleware(['role.access:payroll,store'])->post('/payroll/generate', [PayrollController::class, 'generate']);
    Route::middleware(['role.access:payroll,update'])->put('/payroll/{payroll}', [PayrollController::class, 'update']);

    // Holiday Management - with role-based access control
    Route::middleware(['role.access:schedule,index'])->get('/holidays', [HolidayController::class, 'index']);
    Route::middleware(['role.access:schedule,store'])->post('/holidays', [HolidayController::class, 'store']);
    Route::middleware(['role.access:schedule,update'])->put('/holidays/{holiday}', [HolidayController::class, 'update']);
    Route::middleware(['role.access:schedule,destroy'])->delete('/holidays/{holiday}', [HolidayController::class, 'destroy']);

    // Recruitment - with role-based access control
    Route::middleware(['role.access:recruitment,index'])->get('/recruitment', [RecruitmentController::class, 'index']);
    Route::middleware(['role.access:recruitment,store'])->post('/recruitment/applicants', [RecruitmentController::class, 'storeApplicant']);
    Route::middleware(['role.access:recruitment,update'])->put('/recruitment/applicants/{applicant}', [RecruitmentController::class, 'updateApplicant']);
    Route::middleware(['role.access:recruitment,destroy'])->delete('/recruitment/applicants/{applicant}', [RecruitmentController::class, 'destroyApplicant']);

    // Applicant Management - with role-based access control
    
    // Route::post('/applicants', [ApplicantController::class, 'store']); // Commented out to avoid conflict with public route
    Route::middleware(['role.access:recruitment,view'])->get('/applicants/{applicant}', [ApplicantController::class, 'show']);
    Route::middleware(['role.access:recruitment,update'])->put('/applicants/{applicant}', [ApplicantController::class, 'update']);
    Route::middleware(['role.access:recruitment,destroy'])->delete('/applicants/{applicant}', [ApplicantController::class, 'destroy']);
    Route::middleware(['role.access:recruitment,update'])->put('/applicants/{applicant}/status', [ApplicantController::class, 'updateStatus']);
    Route::middleware(['role.access:recruitment,update'])->post('/applicants/{applicant}/interview', [ApplicantController::class, 'scheduleInterview']);
    Route::middleware(['role.access:recruitment,update'])->post('/applicants/{applicant}/hire', [ApplicantController::class, 'hire']);

    // Performance Management - with role-based access control
    Route::middleware(['role.access:employee,index'])->get('/performance', [PerformanceController::class, 'index']);
    Route::middleware(['role.access:employee,index'])->get('/performance/overview', [PerformanceController::class, 'overview']);
    Route::middleware(['role.access:employee,index'])->get('/performance/employees/{employee}/history', [PerformanceController::class, 'employeeHistory']);
    Route::middleware(['role.access:employee,store'])->post('/performance/periods', [PerformanceController::class, 'storePeriod']);
    Route::middleware(['role.access:employee,update'])->put('/performance/periods/{period}', [PerformanceController::class, 'updatePeriod']);
    Route::middleware(['role.access:employee,store'])->post('/performance/evaluations', [PerformanceController::class, 'storeEvaluation']);
    Route::middleware(['role.access:employee,update'])->put('/performance/evaluations/{evaluation}', [PerformanceController::class, 'updateEvaluation']);

    // Training and Development - with role-based access control
    Route::middleware(['role.access:training,index'])->get('/training', [TrainingController::class, 'index']);
    Route::middleware(['role.access:training,index'])->get('/training/programs', [TrainingController::class, 'programs']);
    Route::middleware(['role.access:training,store'])->post('/training/programs', [TrainingController::class, 'storeProgram']);
    Route::middleware(['role.access:training,view'])->get('/training/programs/{program}', [TrainingController::class, 'show']);
    Route::middleware(['role.access:training,update'])->put('/training/programs/{program}', [TrainingController::class, 'updateProgram']);
    Route::middleware(['role.access:training,destroy'])->delete('/training/programs/{program}', [TrainingController::class, 'destroyProgram']);
    Route::middleware(['role.access:training,destroy'])->delete('/training/programs/{program}/force', [TrainingController::class, 'forceDestroyProgram']);
    
    // Training Enrollments - with role-based access control
    Route::middleware(['role.access:training,index'])->get('/training/enrollments', [TrainingController::class, 'enrollments']);
    Route::middleware(['role.access:training,store'])->post('/training/enroll', [TrainingController::class, 'enroll']);
    Route::middleware(['role.access:training,update'])->put('/training/enrollments/{enrollment}', [TrainingController::class, 'updateEnrollment']);
    Route::middleware(['role.access:training,destroy'])->delete('/training/enrollments/{enrollment}', [TrainingController::class, 'unenroll']);

    // Disciplinary Cases - with role-based access control
    Route::middleware(['role.access:disciplinary,index'])->get('/disciplinary-cases', [DisciplinaryCaseController::class, 'index']);
    Route::middleware(['role.access:disciplinary,store'])->post('/disciplinary-cases', [DisciplinaryCaseController::class, 'store']);
    Route::middleware(['role.access:disciplinary,view'])->get('/disciplinary-cases/{disciplinaryCase}', [DisciplinaryCaseController::class, 'show']);
    Route::middleware(['role.access:disciplinary,update'])->put('/disciplinary-cases/{disciplinaryCase}', [DisciplinaryCaseController::class, 'update']);
    Route::middleware(['role.access:disciplinary,destroy'])->delete('/disciplinary-cases/{disciplinaryCase}', [DisciplinaryCaseController::class, 'destroy']);
    Route::middleware(['role.access:disciplinary,view'])->get('/disciplinary-cases/employee/{employee}', [DisciplinaryCaseController::class, 'getByEmployee']);
    Route::middleware(['role.access:disciplinary,index'])->get('/disciplinary-cases/status/{status}', [DisciplinaryCaseController::class, 'getByStatus']);
    Route::middleware(['role.access:disciplinary,index'])->get('/disciplinary-cases-grouped-by-employee', [DisciplinaryCaseController::class, 'getGroupedByEmployee']);
    Route::middleware(['role.access:disciplinary,index'])->get('/disciplinary-cases-statistics', [DisciplinaryCaseController::class, 'getStatistics']);
    
    // Disciplinary Case Attachments
    Route::middleware(['role.access:disciplinary,store'])->post('/disciplinary-cases/{disciplinaryCase}/attachments', [DisciplinaryCaseController::class, 'uploadAttachment']);
    Route::middleware(['role.access:disciplinary,view'])->get('/disciplinary-cases/{disciplinaryCase}/attachments/{filename}', [DisciplinaryCaseController::class, 'downloadAttachment']);
    Route::middleware(['role.access:disciplinary,destroy'])->delete('/disciplinary-cases/{disciplinaryCase}/attachments/{filename}', [DisciplinaryCaseController::class, 'deleteAttachment']);

    // Action Logs - with role-based access control (disciplinary domain)
    Route::middleware(['role.access:disciplinary,destroy'])->delete('/action-logs/{actionLog}', [ActionLogController::class, 'destroy']);

    // Resignation Management - with role-based access control
    Route::middleware(['role.access:resignation,index'])->get('/resignations', [ResignationController::class, 'index']);
    Route::middleware(['role.access:resignation,store'])->post('/resignations', [ResignationController::class, 'store']);
    Route::middleware(['role.access:resignation,view'])->get('/resignations/{resignation}', [ResignationController::class, 'show']);
    Route::middleware(['role.access:resignation,update'])->put('/resignations/{resignation}', [ResignationController::class, 'update']);
    Route::middleware(['role.access:resignation,destroy'])->delete('/resignations/{resignation}', [ResignationController::class, 'destroy']);
    Route::middleware(['role.access:resignation,update'])->put('/resignations/{resignation}/status', [ResignationController::class, 'updateStatus']);
    Route::middleware(['role.access:resignation,update'])->put('/resignations/{resignation}/effective-date', [ResignationController::class, 'updateEffectiveDate']);

    // Termination Management - with role-based access control
    Route::middleware(['role.access:employee,index'])->get('/terminations', [TerminationController::class, 'index']);
    Route::middleware(['role.access:employee,store'])->post('/terminations', [TerminationController::class, 'store']);
    Route::middleware(['role.access:employee,view'])->get('/terminations/{termination}', [TerminationController::class, 'show']);
    Route::middleware(['role.access:employee,update'])->put('/terminations/{termination}', [TerminationController::class, 'update']);
    Route::middleware(['role.access:employee,destroy'])->delete('/terminations/{termination}', [TerminationController::class, 'destroy']);
    Route::middleware(['role.access:employee,view'])->get('/terminations/employee/{employee}', [TerminationController::class, 'getByEmployee']);
    Route::middleware(['role.access:employee,index'])->get('/terminations/statistics', [TerminationController::class, 'getStatistics']);

    // Notifications
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::get('/notifications/unread', [NotificationController::class, 'unread']);
    Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount']);
    Route::put('/notifications/{id}/mark-as-read', [NotificationController::class, 'markAsRead']);
    Route::put('/notifications/mark-all-as-read', [NotificationController::class, 'markAllAsRead']);
    Route::delete('/notifications/{id}', [NotificationController::class, 'destroy']);
    Route::post('/notifications', [NotificationController::class, 'store']);


    // Logout
    Route::post('/logout', [AuthenticatedSessionController::class, 'destroy']);
});

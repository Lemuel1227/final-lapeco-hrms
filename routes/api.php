<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Auth\AuthenticatedSessionController;
use App\Http\Controllers\Auth\RegisteredUserController;
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
use App\Http\Controllers\AttendanceController;
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

// Public recruitment routes for testing
Route::get('/applicants/statistics', [ApplicantController::class, 'getStats']);
Route::get('/applicants', [ApplicantController::class, 'index']);
Route::post('/applicants', [ApplicantController::class, 'store']); // Add public POST route for testing
Route::get('/positions', [PositionController::class, 'publicIndex']);

// Protected routes
Route::middleware('auth:sanctum')->group(function () {
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

    // Session management routes
    Route::middleware('web')->group(function () {
        Route::get('/sessions', [SessionController::class, 'index']);
        Route::delete('/sessions/{sessionId}', [SessionController::class, 'destroy']);
    });

    // Dashboard
    Route::get('/dashboard', function () {
        return response()->json([
            'currentUser' => auth()->user(),
            'userRole' => auth()->user()->role,
        ]);
    });

    // Employee Data - with role-based access control
    Route::middleware(['role.access:employee,index'])->get('/employees', [EmployeeController::class, 'index']);
    Route::middleware(['role.access:employee,show'])->get('/employees/{employee}', [EmployeeController::class, 'show']);
    Route::middleware(['role.access:employee,store'])->post('/employees', [EmployeeController::class, 'store']);
    Route::middleware(['role.access:employee,update'])->put('/employees/{employee}', [EmployeeController::class, 'update']);
    Route::middleware(['role.access:employee,destroy'])->delete('/employees/{employee}', [EmployeeController::class, 'destroy']);
    Route::middleware(['role.access:employee,update'])->post('/employees/{employee}/reset-password', [EmployeeController::class, 'resetPassword']);
    Route::middleware(['role.access:employee,update'])->post('/employees/{employee}/deactivate', [EmployeeController::class, 'deactivateAccount']);
    Route::middleware(['role.access:employee,update'])->post('/employees/{employee}/activate', [EmployeeController::class, 'activateAccount']);

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
    Route::middleware(['role.access:attendance,view'])->get('/attendance/{attendance}', [AttendanceController::class, 'show']);
    Route::middleware(['role.access:attendance,update'])->put('/attendance/{attendance}', [AttendanceController::class, 'update']);
    Route::middleware(['role.access:attendance,destroy'])->delete('/attendance/{attendance}', [AttendanceController::class, 'destroy']);
    Route::middleware(['role.access:attendance,index'])->get('/attendance-logs', [AttendanceController::class, 'getLogs']);
    Route::middleware(['role.access:attendance,store'])->post('/attendance/clock', [AttendanceController::class, 'clockAction']);

    // Schedule Management - with role-based access control
    Route::middleware(['role.access:schedule,index'])->get('/schedules', [ScheduleController::class, 'index']);
    Route::middleware(['role.access:schedule,index'])->get('/schedules/api', [ScheduleController::class, 'apiIndex']);
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
    Route::middleware(['role.access:schedule,index'])->get('/schedule-templates', [ScheduleController::class, 'getTemplates']);
    Route::middleware(['role.access:schedule,store'])->post('/schedule-templates', [ScheduleController::class, 'createTemplate']);
    Route::middleware(['role.access:schedule,update'])->put('/schedule-templates/{id}', [ScheduleController::class, 'updateTemplate']);
    Route::middleware(['role.access:schedule,destroy'])->delete('/schedule-templates/{id}', [ScheduleController::class, 'deleteTemplate']);

    // Leave Management - with role-based access control
    Route::middleware(['role.access:leave,index'])->get('/leaves', [LeaveController::class, 'index']);
    Route::middleware(['role.access:leave,view'])->get('/leaves/{leave}', [LeaveController::class, 'show']);
    Route::middleware(['role.access:leave,store'])->post('/leaves', [LeaveController::class, 'store']);
    Route::middleware(['role.access:leave,update'])->put('/leaves/{leave}', [LeaveController::class, 'update']);
    Route::middleware(['role.access:leave,destroy'])->delete('/leaves/{leave}', [LeaveController::class, 'destroy']);

    // Payroll - with role-based access control
    Route::middleware(['role.access:payroll,index'])->get('/payroll', [PayrollController::class, 'index']);
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

    // Reports - with role-based access control
    Route::middleware(['role.access:employee,index'])->get('/reports/employees', [ReportController::class, 'employeeReport']);
    Route::middleware(['role.access:attendance,index'])->get('/reports/attendance', [ReportController::class, 'attendanceReport']);
    Route::middleware(['role.access:leave,index'])->get('/reports/leaves', [ReportController::class, 'leaveReport']);
    Route::middleware(['role.access:payroll,index'])->get('/reports/payroll', [ReportController::class, 'payrollReport']);
    Route::get('/reports', function () {
        return response()->json([
            'employees' => User::all(),
            'positions' => [],
        ]);
    });

    // Logout
    Route::post('/logout', [AuthenticatedSessionController::class, 'destroy']);
});

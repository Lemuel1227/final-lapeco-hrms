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

    // Employee Data
    Route::get('/employees', [EmployeeController::class, 'index']);
    Route::get('/employees/{employee}', [EmployeeController::class, 'show']);
    Route::post('/employees', [EmployeeController::class, 'store']);
    Route::put('/employees/{employee}', [EmployeeController::class, 'update']);
    Route::delete('/employees/{employee}', [EmployeeController::class, 'destroy']);
    Route::post('/employees/{employee}/reset-password', [EmployeeController::class, 'resetPassword']);
    Route::post('/employees/{employee}/deactivate', [EmployeeController::class, 'deactivateAccount']);
    Route::post('/employees/{employee}/activate', [EmployeeController::class, 'activateAccount']);

    // Positions (authenticated routes)
    Route::get('/positions/authenticated', [PositionController::class, 'index']);
    Route::get('/positions/{position}', [PositionController::class, 'show']);
    Route::post('/positions', [PositionController::class, 'store']);
    Route::put('/positions/{position}', [PositionController::class, 'update']);
    Route::delete('/positions/{position}', [PositionController::class, 'destroy']);
    Route::get('/positions/{position}/employees', [PositionController::class, 'employees']);

    // Attendance Management
    Route::get('/attendance', [AttendanceController::class, 'index']);
    Route::post('/attendance', [AttendanceController::class, 'store']);
    Route::get('/attendance/{attendance}', [AttendanceController::class, 'show']);
    Route::put('/attendance/{attendance}', [AttendanceController::class, 'update']);
    Route::delete('/attendance/{attendance}', [AttendanceController::class, 'destroy']);
    Route::get('/attendance-logs', [AttendanceController::class, 'getLogs']);
    Route::post('/attendance/clock', [AttendanceController::class, 'clockAction']);

    // Schedule Management
    Route::get('/schedules', [ScheduleController::class, 'index']);
    Route::get('/schedules/api', [ScheduleController::class, 'apiIndex']);
    Route::get('/schedules/basic', [ScheduleController::class, 'apiIndexBasic']);
    Route::get('/schedules/{id}', [ScheduleController::class, 'show']);
    Route::post('/schedules', [ScheduleController::class, 'store']);
    Route::put('/schedules/{schedule}', [ScheduleController::class, 'update']);
    Route::delete('/schedules/{schedule}', [ScheduleController::class, 'destroy']);
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

    // Schedule Templates
    Route::get('/templates', [ScheduleController::class, 'templatesIndex']);
    Route::post('/templates', [ScheduleController::class, 'templatesStore']);
    Route::put('/templates/{id}', [ScheduleController::class, 'templatesUpdate']);
    Route::delete('/templates/{id}', [ScheduleController::class, 'templatesDestroy']);

    // Leave Management
    Route::get('/leaves', [LeaveController::class, 'index']);
    Route::post('/leaves', [LeaveController::class, 'store']);
    Route::put('/leaves/{leave}', [LeaveController::class, 'update']);
    Route::delete('/leaves/{leave}', [LeaveController::class, 'destroy']);

    // Payroll
    Route::get('/payroll', [PayrollController::class, 'index']);
    Route::post('/payroll/generate', [PayrollController::class, 'generate']);
    Route::put('/payroll/{payroll}', [PayrollController::class, 'update']);

    // Holiday Management
    Route::get('/holidays', [HolidayController::class, 'index']);
    Route::post('/holidays', [HolidayController::class, 'store']);
    Route::put('/holidays/{holiday}', [HolidayController::class, 'update']);
    Route::delete('/holidays/{holiday}', [HolidayController::class, 'destroy']);

    // Recruitment
    Route::get('/recruitment', [RecruitmentController::class, 'index']);
    Route::post('/recruitment/applicants', [RecruitmentController::class, 'storeApplicant']);
    Route::put('/recruitment/applicants/{applicant}', [RecruitmentController::class, 'updateApplicant']);
    Route::delete('/recruitment/applicants/{applicant}', [RecruitmentController::class, 'destroyApplicant']);

    // Applicant Management
    
    // Route::post('/applicants', [ApplicantController::class, 'store']); // Commented out to avoid conflict with public route
    Route::get('/applicants/{applicant}', [ApplicantController::class, 'show']);
    Route::put('/applicants/{applicant}', [ApplicantController::class, 'update']);
    Route::delete('/applicants/{applicant}', [ApplicantController::class, 'destroy']);
    Route::put('/applicants/{applicant}/status', [ApplicantController::class, 'updateStatus']);
    Route::post('/applicants/{applicant}/interview', [ApplicantController::class, 'scheduleInterview']);
    Route::post('/applicants/{applicant}/hire', [ApplicantController::class, 'hire']);

    // Performance Management
    Route::get('/performance', [PerformanceController::class, 'index']);
    Route::post('/performance/evaluations', [PerformanceController::class, 'storeEvaluation']);
    Route::put('/performance/evaluations/{evaluation}', [PerformanceController::class, 'updateEvaluation']);

    // Training and Development
    Route::get('/training', [TrainingController::class, 'index']);
    Route::get('/training/programs', [TrainingController::class, 'programs']);
    Route::post('/training/programs', [TrainingController::class, 'storeProgram']);
    Route::get('/training/programs/{program}', [TrainingController::class, 'show']);
    Route::put('/training/programs/{program}', [TrainingController::class, 'updateProgram']);
    Route::delete('/training/programs/{program}', [TrainingController::class, 'destroyProgram']);
    
    // Training Enrollments
    Route::get('/training/enrollments', [TrainingController::class, 'enrollments']);
    Route::post('/training/enroll', [TrainingController::class, 'enroll']);
    Route::put('/training/enrollments/{enrollment}', [TrainingController::class, 'updateEnrollment']);
    Route::delete('/training/enrollments/{enrollment}', [TrainingController::class, 'unenroll']);

    // Disciplinary Cases
    Route::get('/disciplinary-cases', [DisciplinaryCaseController::class, 'index']);
    Route::post('/disciplinary-cases', [DisciplinaryCaseController::class, 'store']);
    Route::get('/disciplinary-cases/{disciplinaryCase}', [DisciplinaryCaseController::class, 'show']);
    Route::put('/disciplinary-cases/{disciplinaryCase}', [DisciplinaryCaseController::class, 'update']);
    Route::delete('/disciplinary-cases/{disciplinaryCase}', [DisciplinaryCaseController::class, 'destroy']);
    Route::get('/disciplinary-cases/employee/{employee}', [DisciplinaryCaseController::class, 'getByEmployee']);
    Route::get('/disciplinary-cases/status/{status}', [DisciplinaryCaseController::class, 'getByStatus']);
    Route::get('/disciplinary-cases-grouped-by-employee', [DisciplinaryCaseController::class, 'getGroupedByEmployee']);
    Route::get('/disciplinary-cases-statistics', [DisciplinaryCaseController::class, 'getStatistics']);

    // Reports
    Route::get('/reports', function () {
        return response()->json([
            'employees' => User::all(),
            'positions' => [],
        ]);
    });

    // Logout
    Route::post('/logout', [AuthenticatedSessionController::class, 'destroy']);
});

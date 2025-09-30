<?php

namespace App\Http\Controllers;

use App\Models\Attendance;
use App\Models\ScheduleAssignment;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Carbon\Carbon;

class AttendanceController extends Controller
{
    /**
     * Display a listing of attendance records.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Attendance::with([
            'scheduleAssignment.user',
            'scheduleAssignment.schedule',
            'scheduleAssignment.user.position'
        ]);

        // Filter by date if provided
        if ($request->has('date')) {
            $query->forDate($request->date);
        }

        // Filter by employee if provided
        if ($request->has('employee_id')) {
            $query->forEmployee($request->employee_id);
        }

        $attendances = $query->get();

        // Transform data to match frontend expectations
        $transformedData = $attendances->map(function ($attendance) {
            $user = $attendance->scheduleAssignment->user;
            $schedule = $attendance->scheduleAssignment->schedule;
            
            return [
                'id' => $attendance->id,
                'empId' => $user->id,
                'date' => $attendance->attendance_date,
                'signIn' => $attendance->sign_in ? $attendance->sign_in->format('H:i') : null,
                'breakOut' => $attendance->break_out ? $attendance->break_out->format('H:i') : null,
                'breakIn' => $attendance->break_in ? $attendance->break_in->format('H:i') : null,
                'signOut' => $attendance->sign_out ? $attendance->sign_out->format('H:i') : null,
                'status' => ucfirst($attendance->status),
                'hoursWorked' => $attendance->hours_worked,
                'employee' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'position' => $user->position ? $user->position->title : 'Unassigned'
                ],
                'shift' => $attendance->shift,
                'schedule_assignment_id' => $attendance->schedule_assignment_id
            ];
        });

        return response()->json($transformedData);
    }

    /**
     * Store a newly created attendance record.
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'schedule_assignment_id' => 'required|exists:schedule_assignments,id',
            'sign_in' => 'nullable|date_format:H:i',
            'break_out' => 'nullable|date_format:H:i',
            'break_in' => 'nullable|date_format:H:i',
            'sign_out' => 'nullable|date_format:H:i',
            'status' => 'sometimes|in:present,absent,late'
        ]);

        $attendance = Attendance::create($request->all());
        $attendance->load([
            'scheduleAssignment.user',
            'scheduleAssignment.schedule',
            'scheduleAssignment.user.position'
        ]);

        return response()->json($attendance, 201);
    }

    /**
     * Display the specified attendance record.
     */
    public function show(Attendance $attendance): JsonResponse
    {
        $attendance->load([
            'scheduleAssignment.user',
            'scheduleAssignment.schedule',
            'scheduleAssignment.user.position'
        ]);

        return response()->json($attendance);
    }

    /**
     * Update the specified attendance record.
     */
    public function update(Request $request, Attendance $attendance): JsonResponse
    {
        $request->validate([
            'sign_in' => 'nullable|date_format:H:i',
            'break_out' => 'nullable|date_format:H:i',
            'break_in' => 'nullable|date_format:H:i',
            'sign_out' => 'nullable|date_format:H:i',
            'status' => 'sometimes|in:present,absent,late'
        ]);

        $attendance->update($request->all());
        $attendance->load([
            'scheduleAssignment.user',
            'scheduleAssignment.schedule',
            'scheduleAssignment.user.position'
        ]);

        return response()->json($attendance);
    }

    /**
     * Remove the specified attendance record.
     */
    public function destroy(Attendance $attendance): JsonResponse
    {
        $attendance->delete();
        return response()->json(['message' => 'Attendance record deleted successfully']);
    }

    /**
     * Get attendance logs in the format expected by the frontend.
     */
    public function getLogs(Request $request): JsonResponse
    {
        $query = Attendance::with([
            'scheduleAssignment.user',
            'scheduleAssignment.schedule'
        ]);

        if ($request->has('start_date') && $request->has('end_date')) {
            $query->whereHas('scheduleAssignment.schedule', function ($q) use ($request) {
                $q->whereBetween('date', [$request->start_date, $request->end_date]);
            });
        }

        $attendances = $query->get();

        // Group attendance by schedule date
        $groupedLogs = $attendances->groupBy(function ($attendance) {
            return $attendance->scheduleAssignment->schedule->date->format('Y-m-d');
        })->map(function ($attendanceGroup, $date) {
            return [
                'date' => $date,
                'attendances' => $attendanceGroup->map(function ($attendance) {
                    return [
                        'empId' => $attendance->scheduleAssignment->user->id,
                        'employeeName' => $attendance->scheduleAssignment->user->name,
                        'date' => $attendance->scheduleAssignment->schedule->date->format('Y-m-d'),
                        'signIn' => $attendance->sign_in ? $attendance->sign_in->format('H:i') : null,
                        'breakOut' => $attendance->break_out ? $attendance->break_out->format('H:i') : null,
                        'breakIn' => $attendance->break_in ? $attendance->break_in->format('H:i') : null,
                        'signOut' => $attendance->sign_out ? $attendance->sign_out->format('H:i') : null,
                        'status' => ucfirst($attendance->status),
                        'scheduleId' => $attendance->scheduleAssignment->schedule->id,
                        'scheduleName' => $attendance->scheduleAssignment->schedule->name,
                    ];
                })->values()
            ];
        })->values();

        return response()->json($groupedLogs);
    }

    /**
     * Clock in/out functionality.
     */
    public function clockAction(Request $request): JsonResponse
    {
        $request->validate([
            'schedule_assignment_id' => 'required|exists:schedule_assignments,id',
            'action' => 'required|in:sign_in,break_out,break_in,sign_out',
            'time' => 'nullable|date_format:H:i'
        ]);

        $time = $request->time ?? now()->format('H:i');
        $scheduleAssignmentId = $request->schedule_assignment_id;
        
        $attendance = Attendance::firstOrCreate(
            ['schedule_assignment_id' => $scheduleAssignmentId],
            ['status' => 'present']
        );

        $attendance->{$request->action} = $time;
        
        // The status will be automatically calculated by the model's boot method
        // based on the 15-minute late threshold
        $attendance->save();
        
        return response()->json([
            'message' => 'Clock action recorded successfully',
            'attendance' => $attendance
        ]);
    }
}
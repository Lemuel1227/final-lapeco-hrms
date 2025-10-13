<?php

namespace App\Http\Controllers;

use App\Models\Attendance;
use App\Models\Schedule;
use App\Models\ScheduleAssignment;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Carbon\Carbon;

class AttendanceController extends Controller
{
    /**
     * Display a listing of attendance records.
     * New logic: Schedule -> Schedule Assignment -> Attendance
     */
    public function index(Request $request): JsonResponse
    {
        // Start with schedule assignments (which link schedules to users)
        $query = ScheduleAssignment::with([
            'user',
            'user.position',
            'schedule',
            'attendance'
        ]);

        // Filter by date if provided
        if ($request->has('date')) {
            $query->whereHas('schedule', function ($q) use ($request) {
                $q->whereDate('date', $request->date);
            });
        }

        // Filter by employee if provided
        if ($request->has('employee_id')) {
            $query->where('user_id', $request->employee_id);
        }

        $scheduleAssignments = $query->get();

        // Transform data to match frontend expectations
        $transformedData = $scheduleAssignments->map(function ($assignment) {
            $user = $assignment->user;
            $schedule = $assignment->schedule;
            $attendance = $assignment->attendance;
            
            // Format shift times properly
            $startTime = $assignment->start_time ? Carbon::parse($assignment->start_time)->format('H:i') : null;
            $endTime = $assignment->end_time ? Carbon::parse($assignment->end_time)->format('H:i') : null;
            $shift = ($startTime && $endTime) ? "$startTime - $endTime" : null;
            
            // Determine status based on date and attendance
            $currentDate = Carbon::now()->format('Y-m-d');
            $scheduleDate = $schedule->date->format('Y-m-d');
            
            $status = 'scheduled'; // Default status
            $signIn = null;
            $breakOut = null;
            $breakIn = null;
            $signOut = null;
            $hoursWorked = null;
            $attendanceId = null;
            
            if ($attendance) {
                // Attendance record exists - use calculated status based on actual times
                $status = ucfirst($attendance->calculated_status);
                $signIn = $attendance->sign_in ? $attendance->sign_in->format('H:i') : null;
                $breakOut = $attendance->break_out ? $attendance->break_out->format('H:i') : null;
                $breakIn = $attendance->break_in ? $attendance->break_in->format('H:i') : null;
                $signOut = $attendance->sign_out ? $attendance->sign_out->format('H:i') : null;
                $hoursWorked = $attendance->hours_worked;
                $attendanceId = $attendance->id;
            } else {
                // No attendance record - determine status based on date
                if ($scheduleDate < $currentDate) {
                    $status = 'Absent'; // Past date without attendance
                } else {
                    $status = 'Scheduled'; // Future date or today without attendance yet
                }
            }
            
            return [
                'id' => $attendanceId,
                'empId' => $user->id,
                'employeeName' => $user->name,
                'date' => $scheduleDate,
                'signIn' => $signIn,
                'breakOut' => $breakOut,
                'breakIn' => $breakIn,
                'signOut' => $signOut,
                'status' => $status,
                'hoursWorked' => $hoursWorked,
                'position' => $user->position ? $user->position->title : 'Unassigned',
                'shift' => $shift,
                'otHours' => $assignment->ot_hours,
                'employee' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'position' => $user->position ? $user->position->title : 'Unassigned'
                ],
                'schedule_assignment_id' => $assignment->id,
                'schedule_id' => $schedule->id,
                'schedule_name' => $schedule->name
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
            'status' => 'sometimes|in:present,absent,late',
            'ot_hours' => 'nullable|numeric|min:0'
        ]);

        $attendance = Attendance::create($request->only([
            'schedule_assignment_id', 'sign_in', 'break_out', 'break_in', 'sign_out', 'status', 'ot_hours'
        ]));

        // Update OT hours in schedule assignment if provided
        if ($request->has('ot_hours')) {
            $scheduleAssignment = ScheduleAssignment::find($request->schedule_assignment_id);
            $scheduleAssignment->update([
                'ot_hours' => $request->ot_hours
            ]);
        }

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
            'status' => 'sometimes|in:present,absent,late',
            'ot_hours' => 'nullable|numeric|min:0'
        ]);

        // Update attendance record
        $attendance->update($request->only([
            'sign_in', 'break_out', 'break_in', 'sign_out', 'status'
        ]));

        // Update OT hours in schedule assignment if provided
        if ($request->has('ot_hours')) {
            try {
                if ($attendance->scheduleAssignment) {
                    $attendance->scheduleAssignment->update([
                        'ot_hours' => $request->ot_hours
                    ]);
                } else {
                    \Log::error('No schedule assignment found for attendance ID: ' . $attendance->id);
                    return response()->json(['message' => 'No schedule assignment found for this attendance record'], 422);
                }
            } catch (\Exception $e) {
                \Log::error('Failed to update OT hours: ' . $e->getMessage(), [
                    'attendance_id' => $attendance->id,
                    'ot_hours' => $request->ot_hours,
                    'trace' => $e->getTraceAsString()
                ]);
                return response()->json(['message' => 'Failed to update overtime hours: ' . $e->getMessage()], 500);
            }
        }

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
     * Updated to use the new schedule -> schedule_assignment -> attendance logic
     */
    public function getLogs(Request $request): JsonResponse
    {
        $query = ScheduleAssignment::with([
            'user',
            'user.position',
            'schedule',
            'attendance'
        ]);

        if ($request->has('start_date') && $request->has('end_date')) {
            $query->whereHas('schedule', function ($q) use ($request) {
                $q->whereBetween('date', [$request->start_date, $request->end_date]);
            });
        }

        $scheduleAssignments = $query->get();

        // Group by schedule date
        $groupedLogs = $scheduleAssignments->groupBy(function ($assignment) {
            return $assignment->schedule ? $assignment->schedule->date->format('Y-m-d') : 'no-date';
        })->map(function ($assignmentGroup, $date) {
            return [
                'date' => $date,
                'attendances' => $assignmentGroup->map(function ($assignment) {
                    $user = $assignment->user;
                    $attendance = $assignment->attendance;
                    
                    // Skip assignments without a schedule
                    if (!$assignment->schedule) {
                        return null;
                    }
                    
                    // Format shift times properly
                    $startTime = $assignment->start_time ? Carbon::parse($assignment->start_time)->format('H:i') : null;
                    $endTime = $assignment->end_time ? Carbon::parse($assignment->end_time)->format('H:i') : null;
                    $shift = ($startTime && $endTime) ? "$startTime - $endTime" : null;
                    
                    // Determine status based on date and attendance
                    $currentDate = Carbon::now()->format('Y-m-d');
                    $scheduleDate = $assignment->schedule->date->format('Y-m-d');
                    
                    $status = 'scheduled'; // Default status
                    $signIn = null;
                    $breakOut = null;
                    $breakIn = null;
                    $signOut = null;
                    
                    if ($attendance) {
                        // Attendance record exists - use calculated status based on actual times
                        $status = ucfirst($attendance->calculated_status);
                        $signIn = $attendance->sign_in ? $attendance->sign_in->format('H:i') : null;
                        $breakOut = $attendance->break_out ? $attendance->break_out->format('H:i') : null;
                        $breakIn = $attendance->break_in ? $attendance->break_in->format('H:i') : null;
                        $signOut = $attendance->sign_out ? $attendance->sign_out->format('H:i') : null;
                    } else {
                        // No attendance record - determine status based on date
                        if ($scheduleDate < $currentDate) {
                            $status = 'Absent'; // Past date without attendance
                        } else {
                            $status = 'Scheduled'; // Future date or today without attendance yet
                        }
                    }
                    
                    return [
                        'empId' => $user->id,
                        'employeeName' => $user->name,
                        'position' => $user->position ? $user->position->name : 'Unassigned',
                        'date' => $scheduleDate,
                        'shift' => $shift,
                        'otHours' => $assignment->ot_hours,
                        'signIn' => $signIn,
                        'breakOut' => $breakOut,
                        'breakIn' => $breakIn,
                        'signOut' => $signOut,
                        'status' => $status,
                        'scheduleId' => $assignment->schedule->id,
                        'scheduleName' => $assignment->schedule->name,
                    ];
                })->filter()->values() // Filter out null values
            ];
        })->filter(function ($group) {
            return $group['date'] !== 'no-date'; // Remove groups with no date
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

    /**
     * Get attendance history with statistics by date
     */
    public function getAttendanceHistory(Request $request): JsonResponse
    {
        // If no date range is provided, get all available historical data
        $startDate = $request->get('start_date');
        $endDate = $request->get('end_date', Carbon::now()->toDateString());
        
        // If no start date is provided, find the earliest schedule date
        if (!$startDate) {
            $earliestSchedule = Schedule::orderBy('date', 'asc')->first();
            $startDate = $earliestSchedule ? $earliestSchedule->date : Carbon::now()->subDays(90)->toDateString();
        }

        // Get all schedule assignments within the date range
        $scheduleAssignments = ScheduleAssignment::with(['user', 'schedule', 'attendance'])
            ->whereHas('schedule', function ($query) use ($startDate, $endDate) {
                $query->whereBetween('date', [$startDate, $endDate]);
            })
            ->get();

        // Group by date and calculate statistics
        $historyData = [];
        $groupedByDate = $scheduleAssignments->groupBy(function ($assignment) {
            return Carbon::parse($assignment->schedule->date)->toDateString();
        });

        foreach ($groupedByDate as $date => $assignments) {
            $stats = [
                'total' => $assignments->count(),
                'present' => 0,
                'late' => 0,
                'absent' => 0
            ];

            foreach ($assignments as $assignment) {
                $attendance = $assignment->attendance;
                if ($attendance) {
                    $status = $attendance->calculated_status;
                    if ($status === 'present') {
                        $stats['present']++;
                    } elseif ($status === 'late') {
                        $stats['late']++;
                    } else {
                        $stats['absent']++;
                    }
                } else {
                    // No attendance record means absent for past dates
                    $scheduleDate = Carbon::parse($assignment->schedule->date);
                    if ($scheduleDate->isPast()) {
                        $stats['absent']++;
                    }
                }
            }

            $historyData[] = [
                'date' => Carbon::parse($date)->toISOString(),
                'total' => $stats['total'],
                'present' => $stats['present'],
                'late' => $stats['late'],
                'absent' => $stats['absent']
            ];
        }

        // Sort by date descending
        usort($historyData, function ($a, $b) {
            return strtotime($b['date']) - strtotime($a['date']);
        });

        return response()->json($historyData);
    }

    /**
     * Get daily attendance data with all employee details
     */
    public function getDailyAttendance(Request $request): JsonResponse
    {
        $date = $request->get('date', Carbon::now()->toDateString());

        // Get all schedule assignments for the specified date
        $scheduleAssignments = ScheduleAssignment::with([
            'user',
            'user.position',
            'schedule',
            'attendance'
        ])
        ->whereHas('schedule', function ($query) use ($date) {
            $query->whereDate('date', $date);
        })
        ->get();

        // Transform data to match the specified format
        $dailyData = $scheduleAssignments->map(function ($assignment) {
            $user = $assignment->user;
            $schedule = $assignment->schedule;
            $attendance = $assignment->attendance;

            // Format shift times
            $startTime = $assignment->start_time ? Carbon::parse($assignment->start_time)->format('H:i') : null;
            $endTime = $assignment->end_time ? Carbon::parse($assignment->end_time)->format('H:i') : null;
            $shift = ($startTime && $endTime) ? "$startTime - $endTime" : null;

            // Determine status and attendance details
            $status = 'Scheduled';
            $signIn = null;
            $signOut = null;
            $breakIn = null;
            $breakOut = null;

            if ($attendance) {
                $status = ucfirst($attendance->calculated_status);
                $signIn = $attendance->sign_in ? $attendance->sign_in->format('H:i') : null;
                $signOut = $attendance->sign_out ? $attendance->sign_out->format('H:i') : null;
                $breakIn = $attendance->break_in ? $attendance->break_in->format('H:i') : null;
                $breakOut = $attendance->break_out ? $attendance->break_out->format('H:i') : null;
            } else {
                // No attendance record
                $scheduleDate = Carbon::parse($schedule->date);
                if ($scheduleDate->isPast()) {
                    $status = 'Absent';
                }
            }

            return [
                'id' => $attendance ? $attendance->id : null,
                'empId' => $user->id,
                'employeeName' => $user->name,
                'position' => $user->position ? $user->position->name : null,
                'date' => Carbon::parse($schedule->date)->toDateString(),
                'shift' => $shift,
                'otHours' => $assignment->ot_hours ?? '0.00',
                'signIn' => $signIn,
                'signOut' => $signOut,
                'breakIn' => $breakIn,
                'breakOut' => $breakOut,
                'status' => $status,
                'scheduleId' => $schedule->id,
                'scheduleName' => $schedule->name,
                'schedule_assignment_id' => $assignment->id
            ];
        });

        return response()->json($dailyData->values());
    }
}
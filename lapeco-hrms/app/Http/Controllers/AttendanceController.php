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
            'ot_hours' => 'sometimes|numeric|min:0'
        ]);

        // Update attendance record
        $attendance->update($request->only([
            'sign_in', 'break_out', 'break_in', 'sign_out', 'status'
        ]));

        // Update OT hours in schedule assignment if provided
        if ($request->has('ot_hours')) {
            try {
                if ($attendance->scheduleAssignment) {
                    // Ensure ot_hours is never null - default to 0
                    $otHours = $request->ot_hours ?? 0;
                    $attendance->scheduleAssignment->update([
                        'ot_hours' => $otHours
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

        // Get schedules within the date range and their assignments (this ensures only existing schedules)
        $schedules = Schedule::with(['assignments.user', 'assignments.attendance'])
            ->whereBetween('date', [$startDate, $endDate])
            ->get();
            
        // Flatten the schedule assignments
        $scheduleAssignments = $schedules->flatMap(function ($schedule) {
            return $schedule->assignments->map(function ($assignment) use ($schedule) {
                $assignment->schedule = $schedule; // Ensure schedule relationship is loaded
                return $assignment;
            });
        });

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
                'date' => $date,
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

    /**
     * Get all employees (name and ID only) for attendance management
     * Includes all employees regardless of account status
     */
    public function getEmployees(Request $request): JsonResponse
    {
        try {
            // Get ALL employees including deactivated ones
            $employees = \App\Models\User::select('id', 'first_name', 'middle_name', 'last_name', 'position_id')
                ->with('position:id,name') // Load position relationship
                ->get()
                ->map(function ($user) {
                    // Combine first, middle, and last name
                    $name = trim($user->first_name . ' ' . $user->middle_name . ' ' . $user->last_name);
                    
                    return [
                        'id' => $user->id,
                        'name' => $name,
                        'position' => $user->position ? $user->position->name : 'Unassigned'
                    ];
                });

            return response()->json([
                'success' => true,
                'data' => $employees
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch employees: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Import attendance records from Excel
     * Creates schedules if they don't exist and assigns attendance to employees
     */
    public function importAttendance(Request $request): JsonResponse
    {
        // Debug: Log the incoming request data
        \Log::info('Import Attendance Request Data:', [
            'groupedByDate' => $request->groupedByDate,
            'all_data' => $request->all()
        ]);

        // Basic validation
        $request->validate([
            'groupedByDate' => 'required|array',
        ]);

        // The data is already grouped by date from frontend
        $groupedByDate = $request->groupedByDate;
        $totalImported = 0;
        $schedulesCreated = 0;
        $validationErrors = [];

        try {
            // Debug: Log data structure
            \Log::info('GroupedByDate structure:', [
                'type' => gettype($groupedByDate),
                'keys' => array_keys($groupedByDate),
                'sample_date' => isset($groupedByDate[array_key_first($groupedByDate)])
                    ? [
                        'type' => gettype($groupedByDate[array_key_first($groupedByDate)]),
                        'is_array' => is_array($groupedByDate[array_key_first($groupedByDate)]),
                        'sample_value' => $groupedByDate[array_key_first($groupedByDate)]
                    ]
                    : 'empty'
            ]);

            // Validate data structure manually
            foreach ($groupedByDate as $date => $records) {
                if (!is_array($records)) {
                    $validationErrors[] = "Date '{$date}' must contain an array of records, got " . gettype($records);
                    continue;
                }

                foreach ($records as $index => $record) {
                    if (!is_array($record) && !is_object($record)) {
                        $validationErrors[] = "Record {$index} for date '{$date}' must be an array or object, got " . gettype($record);
                        continue;
                    }

                    // Convert to array if it's an object
                    if (is_object($record)) {
                        $record = (array) $record;
                    }

                    // Validate required fields
                    $requiredFields = ['employee_id', 'date', 'time', 'log_type'];
                    foreach ($requiredFields as $field) {
                        if (!isset($record[$field]) || empty($record[$field])) {
                            $validationErrors[] = "Field '{$field}' is required for record {$index} on date '{$date}'";
                        }
                    }

                    // Validate employee_id exists
                    if (isset($record['employee_id'])) {
                        // Convert to integer for database query
                        $employeeId = (int) $record['employee_id'];
                        $employeeExists = \App\Models\User::where('id', $employeeId)->exists();
                        if (!$employeeExists) {
                            $validationErrors[] = "Employee with ID {$record['employee_id']} does not exist";
                        }
                    }

                    // Validate date format
                    if (isset($record['date'])) {
                        $dateObj = \DateTime::createFromFormat('Y-m-d', $record['date']);
                        if (!$dateObj || $dateObj->format('Y-m-d') !== $record['date']) {
                            $validationErrors[] = "Invalid date format for record {$index} on date '{$date}': {$record['date']}";
                        }
                    }

                    // Validate time format
                    if (isset($record['time'])) {
                        $timeObj = \DateTime::createFromFormat('H:i', $record['time']);
                        if (!$timeObj || $timeObj->format('H:i') !== $record['time']) {
                            $validationErrors[] = "Invalid time format for record {$index} on date '{$date}': {$record['time']}";
                        }
                    }

                    // Validate log_type
                    if (isset($record['log_type'])) {
                        $validLogTypes = ['sign_in', 'sign_out', 'break_in', 'break_out'];
                        if (!in_array($record['log_type'], $validLogTypes)) {
                            $validationErrors[] = "Invalid log_type '{$record['log_type']}' for record {$index} on date '{$date}'";
                        }
                    }
                }
            }

            // If validation errors, return them
            if (!empty($validationErrors)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validationErrors
                ], 422);
            }

            // Process each date
            foreach ($groupedByDate as $date => $records) {
                // Check if schedule exists for this date
                $schedule = Schedule::where('date', $date)->first();

                if (!$schedule) {
                    // Create new schedule
                    $schedule = Schedule::create([
                        'name' => 'Imported Schedule',
                        'date' => $date,
                        'description' => 'Schedule created from Excel import'
                    ]);
                    $schedulesCreated++;
                }

                // Group records by employee for this date
                $recordsByEmployee = collect($records)->groupBy('employee_id');

                // Process each employee's records
                foreach ($recordsByEmployee as $employeeId => $employeeRecords) {
                    // Check if employee is already assigned to this schedule
                    $existingAssignment = ScheduleAssignment::where('schedule_id', $schedule->id)
                        ->where('user_id', $employeeId)
                        ->first();

                    if (!$existingAssignment) {
                        // Create schedule assignment for this employee
                        $existingAssignment = ScheduleAssignment::create([
                            'schedule_id' => $schedule->id,
                            'user_id' => $employeeId,
                            'start_time' => '08:00', // Default shift start
                            'end_time' => '17:00',   // Default shift end
                            'break_start' => '12:00',
                            'break_end' => '13:00'
                        ]);
                    }

                    // Get or create attendance record
                    $attendance = Attendance::firstOrCreate(
                        ['schedule_assignment_id' => $existingAssignment->id],
                        ['status' => 'present']
                    );

                    // Extract time values based on log type
                    foreach ($employeeRecords as $record) {
                        $timeStr = $record['time'];

                        switch ($record['log_type']) {
                            case 'sign_in':
                                $attendance->sign_in = $timeStr;
                                break;
                            case 'sign_out':
                                $attendance->sign_out = $timeStr;
                                break;
                            case 'break_in':
                                $attendance->break_in = $timeStr;
                                break;
                            case 'break_out':
                                $attendance->break_out = $timeStr;
                                break;
                        }
                    }

                    // Save the attendance record
                    $attendance->save();
                    $totalImported++;
                }
            }

            return response()->json([
                'success' => true,
                'message' => "Successfully imported {$totalImported} attendance records" .
                           ($schedulesCreated > 0 ? " and created {$schedulesCreated} new schedule(s)" : ''),
                'data' => [
                    'records_imported' => $totalImported,
                    'schedules_created' => $schedulesCreated
                ]
            ]);

        } catch (\Exception $e) {
            \Log::error('Attendance import failed: ' . $e->getMessage(), [
                'groupedByDate' => $groupedByDate,
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to import attendance records: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get all attendance records for a specific employee
     * Includes scheduled records without actual attendance
     */
    public function getEmployeeAttendance($employeeId, Request $request): JsonResponse
    {
        try {
            // Get all schedule assignments for this employee
            $scheduleAssignments = ScheduleAssignment::with([
                'user',
                'user.position',
                'schedule',
                'attendance'
            ])
            ->where('user_id', $employeeId)
            ->orderBy('created_at', 'desc')
            ->get();

            // Transform the data to include all necessary fields
            $attendanceRecords = $scheduleAssignments->map(function ($assignment) {
                $user = $assignment->user;
                $schedule = $assignment->schedule;
                $attendance = $assignment->attendance;

                // Skip if no schedule (shouldn't happen but safety check)
                if (!$schedule) {
                    return null;
                }

                // Format shift times
                $startTime = $assignment->start_time ? Carbon::parse($assignment->start_time)->format('H:i') : null;
                $endTime = $assignment->end_time ? Carbon::parse($assignment->end_time)->format('H:i') : null;
                $shift = ($startTime && $endTime) ? "$startTime - $endTime" : null;

                // Determine status and attendance details
                $currentDate = Carbon::now()->format('Y-m-d');
                $scheduleDate = Carbon::parse($schedule->date)->format('Y-m-d');

                $status = 'Scheduled'; // Default status
                $signIn = null;
                $signOut = null;
                $breakIn = null;
                $breakOut = null;
                $hoursWorked = '0:00';
                $attendanceId = null;

                if ($attendance) {
                    // Attendance record exists
                    $status = ucfirst($attendance->calculated_status);
                    $signIn = $attendance->sign_in ? $attendance->sign_in->format('H:i') : null;
                    $signOut = $attendance->sign_out ? $attendance->sign_out->format('H:i') : null;
                    $breakIn = $attendance->break_in ? $attendance->break_in->format('H:i') : null;
                    $breakOut = $attendance->break_out ? $attendance->break_out->format('H:i') : null;
                    $hoursWorked = $attendance->hours_worked ?? '0:00';
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
                    'employeeName' => trim($user->first_name . ' ' . $user->middle_name . ' ' . $user->last_name),
                    'position' => $user->position ? $user->position->name : 'Unassigned',
                    'date' => $scheduleDate,
                    'shift' => $shift,
                    'timeIn' => $signIn,
                    'timeOut' => $signOut,
                    'breakIn' => $breakIn,
                    'breakOut' => $breakOut,
                    'status' => $status,
                    'workingHours' => $hoursWorked,
                    'otHours' => $assignment->ot_hours ?? '0.00',
                    'scheduleId' => $schedule->id,
                    'scheduleName' => $schedule->name,
                    'schedule_assignment_id' => $assignment->id
                ];
            })->filter()->values(); // Remove null values

            return response()->json([
                'success' => true,
                'data' => $attendanceRecords
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch employee attendance: ' . $e->getMessage()
            ], 500);
        }
    }
}
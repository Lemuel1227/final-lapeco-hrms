<?php

namespace App\Http\Controllers;

use App\Models\Schedule;
use App\Models\ScheduleAssignment;
use Illuminate\Http\Request;
use App\Models\User;
use App\Models\Position;
use App\Models\ScheduleTemplate;

class ScheduleController extends Controller
{
    public function store(Request $request)
    {
        try {
            $data = $request->validate([
                'name' => 'required|string|max:255',
                'date' => 'required|date',
                'description' => 'nullable|string|max:1000',
                'assignments' => 'required|array|min:1',
                'assignments.*.empId' => 'required|exists:users,id',
                'assignments.*.start_time' => 'required|date_format:H:i',
                'assignments.*.end_time' => 'required|date_format:H:i|after:assignments.*.start_time',
                'assignments.*.notes' => 'nullable|string|max:500',
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'message' => 'Validation failed. Please check your input data.',
                'error' => 'VALIDATION_ERROR',
                'errors' => $e->errors()
            ], 422);
        }

        try {
            // Check if a schedule already exists for this date
            $existingSchedule = Schedule::where('date', $data['date'])->first();
            if ($existingSchedule) {
                return response()->json([
                    'message' => 'A schedule already exists for this date. Only one schedule per date is allowed.',
                    'error' => 'SCHEDULE_EXISTS_FOR_DATE',
                    'existing_schedule' => [
                        'id' => $existingSchedule->id,
                        'name' => $existingSchedule->name,
                        'date' => $existingSchedule->date
                    ]
                ], 422);
            }

            // Validate time format and logic
            foreach ($data['assignments'] as $index => $assignment) {
                $startTime = strtotime($assignment['start_time']);
                $endTime = strtotime($assignment['end_time']);
                
                // Additional validation: ensure times are valid
                if ($startTime === false || $endTime === false) {
                    return response()->json([
                        'message' => 'Invalid time format. Please use HH:MM format.',
                        'error' => 'INVALID_TIME_FORMAT',
                        'assignment_index' => $index
                    ], 422);
                }
                
                // Only validate that they are not exactly the same time
                if ($startTime === $endTime) {
                    return response()->json([
                        'message' => 'Start time and end time cannot be the same.',
                        'error' => 'INVALID_TIME_RANGE',
                        'assignment_index' => $index
                    ], 422);
                }
                
                // Calculate work duration and validate 8-hour limit (Philippine Labor Code Article 83)
                $startHour = (int) date('H', $startTime);
                $endHour = (int) date('H', $endTime);
                $startMinute = (int) date('i', $startTime);
                $endMinute = (int) date('i', $endTime);
                
                $workDurationHours = 0;
                
                // Check if this is a night shift (starts at 4 PM or later)
                $isNightShift = $startHour >= 16; // 4 PM = 16:00
                
                if ($isNightShift && $endHour < $startHour) {
                    // Night shift crossing midnight (e.g., 22:00 to 06:00)
                    $workDurationHours = (24 - $startHour) + $endHour + (($endMinute - $startMinute) / 60);
                } else if (!$isNightShift && $endHour < $startHour) {
                    // Invalid: Regular shift cannot have end time before start time
                    return response()->json([
                        'message' => 'End time cannot be before start time unless it\'s a night shift starting at 4 PM or later.',
                        'error' => 'INVALID_NIGHT_SHIFT',
                        'assignment_index' => $index
                    ], 422);
                } else {
                    // Regular shift or night shift within same day
                    $workDurationHours = ($endHour - $startHour) + (($endMinute - $startMinute) / 60);
                }
                
                // Enforce 8-hour maximum work limit (Philippine Labor Code Article 83)
                if ($workDurationHours > 8) {
                    return response()->json([
                        'message' => 'Work duration cannot exceed 8 hours per Philippine Labor Code Article 83.',
                        'error' => 'EXCEEDS_WORK_LIMIT',
                        'assignment_index' => $index,
                        'work_duration' => round($workDurationHours, 2)
                    ], 422);
                }
            }

            // Create the schedule
            $schedule = Schedule::create([
                'name' => $data['name'],
                'date' => $data['date'],
                'description' => $data['description'] ?? null,
            ]);

            // Create assignments for users
            foreach ($data['assignments'] as $assignment) {
                ScheduleAssignment::updateOrCreate(
                    [
                        'schedule_id' => $schedule->id,
                        'user_id' => $assignment['empId'],
                    ],
                    [
                        'start_time' => $assignment['start_time'],
                        'end_time' => $assignment['end_time'],
                        'notes' => $assignment['notes'] ?? null,
                    ]
                );
            }

            return response()->json([
                'message' => 'Schedule saved successfully!', 
                'success' => true,
                'schedule' => [
                    'id' => $schedule->id,
                    'name' => $schedule->name,
                    'date' => $schedule->date,
                    'assignments_count' => count($data['assignments'])
                ]
            ], 201);

        } catch (\Exception $e) {
            \Log::error('Schedule creation failed: ' . $e->getMessage(), [
                'request_data' => $data ?? null,
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'message' => 'An unexpected error occurred while creating the schedule. Please try again.',
                'error' => 'SERVER_ERROR'
            ], 500);
        }
    }

    public function update(Request $request, $id)
    {
        $data = $request->validate([
            'name' => 'required|string',
            'date' => 'required|date',
            'description' => 'nullable|string',
            'assignments' => 'required|array',
            'assignments.*.empId' => 'required|exists:users,id',
            'assignments.*.start_time' => 'required',
            'assignments.*.end_time' => 'required',
            'assignments.*.notes' => 'nullable|string',
        ]);
        
        // Find the schedule to update
        $schedule = Schedule::findOrFail($id);
        
        // Check if changing date would conflict with existing schedule
        if ($schedule->date !== $data['date']) {
            $existingSchedule = Schedule::where('date', $data['date'])
                                      ->where('id', '!=', $id)
                                      ->first();
            if ($existingSchedule) {
                return response()->json([
                    'message' => 'A schedule already exists for this date. Only one schedule per date is allowed.',
                    'error' => 'SCHEDULE_EXISTS_FOR_DATE'
                ], 422);
            }
        }
        
        // Update the schedule
        $schedule->update([
            'name' => $data['name'],
            'date' => $data['date'],
            'description' => $data['description'] ?? null,
        ]);
        
        // Delete existing assignments for this schedule
        ScheduleAssignment::where('schedule_id', $schedule->id)->delete();
        
        // Create new assignments
        foreach ($data['assignments'] as $assignment) {
            ScheduleAssignment::create([
                'schedule_id' => $schedule->id,
                'user_id' => $assignment['empId'],
                'start_time' => $assignment['start_time'],
                'end_time' => $assignment['end_time'],
                'notes' => $assignment['notes'] ?? null,
            ]);
        }
        
        return response()->json(['message' => 'Schedule updated successfully!', 'schedule' => $schedule]);
    }

    public function templatesIndex()
    {
        $templates = ScheduleTemplate::all();
        return response()->json($templates);
    }

    public function templatesStore(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'columns' => 'required|array',
            'applicable_positions' => 'nullable|array',
        ]);
        $template = ScheduleTemplate::create($data);
        return response()->json($template, 201);
    }

    public function templatesUpdate(Request $request, $id)
    {
        $template = ScheduleTemplate::findOrFail($id);
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'columns' => 'required|array',
            'applicable_positions' => 'nullable|array',
        ]);
        $template->update($data);
        return response()->json($template);
    }

    public function templatesDestroy($id)
    {
        $template = ScheduleTemplate::findOrFail($id);
        $template->delete();
        return response()->json(['success' => true]);
    }

    public function index(Request $request)
    {
        $user = $request->user();
        $role = $user->role;
        
        $schedules = Schedule::with(['assignments.user.position'])->get()->map(function ($schedule) {
            return [
                'id' => $schedule->id,
                'name' => $schedule->name,
                'date' => $schedule->date,
                'description' => $schedule->description,
                'assignments' => $schedule->assignments->map(function ($assignment) {
                    return [
                        'id' => $assignment->id,
                        'start_time' => $assignment->start_time,
                        'end_time' => $assignment->end_time,
                        'notes' => $assignment->notes,
                        'user_name' => $assignment->user ? $assignment->user->name : null,
                        'employee_id' => $assignment->user ? $assignment->user->id : null,
                        'position_name' => $assignment->user && $assignment->user->position ? $assignment->user->position->name : null,
                    ];
                }),
            ];
        });
        
        $employees = User::all()->map(function ($user) {
            return [
                'id' => $user->id,
                'name' => $user->name,
                'positionId' => $user->position_id,
            ];
        });
        
        $positions = Position::all()->map(function ($position) {
            return [
                'id' => $position->id,
                'title' => $position->name,
            ];
        });
        
        $templates = ScheduleTemplate::all();
        
        return response()->json([
            'currentUser' => $user,
            'userRole' => $role,
            'schedules' => $schedules,
            'employees' => $employees,
            'positions' => $positions,
            'templates' => $templates,
        ]);
    }

    public function apiIndex()
    {
        $schedules = Schedule::with(['assignments.user.position'])->get();
        return response()->json($schedules);
    }

    public function apiIndexBasic()
    {
        $schedules = Schedule::query()
            ->select('id', 'name', 'date')
            ->get()
            ->map(function ($schedule) {
                return [
                    'id' => $schedule->id,
                    'name' => $schedule->name,
                    'date' => $schedule->date,
                    'employees_count' => $schedule->assignments()->count(),
                ];
            });
        
        return response()->json($schedules);
    }

    public function show($id)
    {
        $schedule = Schedule::with(['assignments.user.position'])->findOrFail($id);
        
        return response()->json([
            'id' => $schedule->id,
            'name' => $schedule->name,
            'date' => $schedule->date,
            'description' => $schedule->description,
            'assignments' => $schedule->assignments->map(function ($assignment) {
                return [
                    'id' => $assignment->id,
                    'start_time' => $assignment->start_time,
                    'end_time' => $assignment->end_time,
                    'notes' => $assignment->notes,
                    'user_name' => $assignment->user ? $assignment->user->name : null,
                    'employee_id' => $assignment->user ? $assignment->user->id : null,
                    'position_name' => $assignment->user && $assignment->user->position ? $assignment->user->position->name : null,
                ];
            }),
        ]);
    }

    public function destroy($id)
    {
        $schedule = Schedule::findOrFail($id);
        
        // Delete all assignments first
        ScheduleAssignment::where('schedule_id', $schedule->id)->delete();
        
        // Delete the schedule
        $schedule->delete();
        
        return response()->json(['message' => 'Schedule deleted successfully!']);
    }
}
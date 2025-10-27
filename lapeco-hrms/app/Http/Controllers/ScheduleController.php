<?php

namespace App\Http\Controllers;

use App\Models\Schedule;
use App\Models\ScheduleAssignment;
use Illuminate\Http\Request;
use App\Models\User;
use App\Models\Position;
use App\Models\ScheduleTemplate;
use App\Traits\LogsActivity;
use Illuminate\Support\Facades\Log;

class ScheduleController extends Controller
{
    use LogsActivity;
    public function store(Request $request)
    {
        try {
            $this->normalizeAssignments($request);
            $data = $request->validate([
                'name' => 'required|string|max:255',
                'date' => 'required|date',
                'description' => 'nullable|string|max:1000',
                'assignments' => 'required|array|min:1',
                'assignments.*.empId' => 'required|exists:users,id',
                'assignments.*.start_time' => 'required|date_format:H:i',
                'assignments.*.end_time' => 'required|date_format:H:i',
                'assignments.*.break_start' => 'nullable|date_format:H:i',
                'assignments.*.break_end' => 'nullable|date_format:H:i',
                'assignments.*.ot_hours' => 'nullable|numeric',
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
                $breakStart = isset($assignment['break_start']) ? strtotime($assignment['break_start']) : null;
                $breakEnd = isset($assignment['break_end']) ? strtotime($assignment['break_end']) : null;
                
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

                if (($breakStart !== null && $breakStart === false) || ($breakEnd !== null && $breakEnd === false)) {
                    return response()->json([
                        'message' => 'Invalid break time format. Please use HH:MM format.',
                        'error' => 'INVALID_BREAK_TIME',
                        'assignment_index' => $index
                    ], 422);
                }

                if ($breakStart !== null && $breakEnd !== null) {
                    if ($breakStart === $breakEnd) {
                        return response()->json([
                            'message' => 'Break start and end time cannot be the same.',
                            'error' => 'INVALID_BREAK_RANGE',
                            'assignment_index' => $index
                        ], 422);
                    }
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
                'date' => \Carbon\Carbon::parse($data['date'])->format('Y-m-d'),
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
                        'break_start' => $assignment['break_start'] ?? null,
                        'break_end' => $assignment['break_end'] ?? null,
                        'ot_hours' => $assignment['ot_hours'] ?? 0,
                        'notes' => $assignment['notes'] ?? null,
                    ]
                );
            }

            // Log activity
            $this->logCreate('schedule', $schedule->id, "{$schedule->name} for {$schedule->date}");
            
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
            Log::error('Schedule creation failed: ' . $e->getMessage(), [
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
        try {
            Log::info('Schedule update request received', [
                'schedule_id' => $id,
                'request_data' => $request->all()
            ]);

            $this->normalizeAssignments($request);
            $data = $request->validate([
                'name' => 'required|string',
                'date' => 'required|date',
                'description' => 'nullable|string',
                'assignments' => 'required|array',
                'assignments.*.empId' => 'required|exists:users,id',
                'assignments.*.start_time' => 'required|date_format:H:i',
                'assignments.*.end_time' => 'required|date_format:H:i',
                'assignments.*.break_start' => 'nullable|date_format:H:i',
                'assignments.*.break_end' => 'nullable|date_format:H:i',
                'assignments.*.ot_hours' => 'nullable|numeric|min:0',
                'assignments.*.notes' => 'nullable|string',
            ]);
            
            Log::info('Validation passed for schedule update', ['validated_data' => $data]);
            
            // Find the schedule to update
            $schedule = Schedule::findOrFail($id);
            
            // Check if changing date would conflict with existing schedule
            if ($schedule->date !== $data['date']) {
                $existingSchedule = Schedule::where('date', $data['date'])
                                          ->where('id', '!=', $id)
                                          ->first();
                if ($existingSchedule) {
                    Log::warning('Schedule update failed: date conflict', [
                        'schedule_id' => $id,
                        'new_date' => $data['date'],
                        'existing_schedule_id' => $existingSchedule->id
                    ]);
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
            
            Log::info('Schedule basic info updated', ['schedule_id' => $schedule->id]);
            
            // Delete existing assignments for this schedule
            ScheduleAssignment::where('schedule_id', $schedule->id)->delete();
            
            Log::info('Existing assignments deleted', ['schedule_id' => $schedule->id]);
            
            // Create new assignments
            foreach ($data['assignments'] as $index => $assignment) {
                try {
                    ScheduleAssignment::create([
                        'schedule_id' => $schedule->id,
                        'user_id' => $assignment['empId'],
                        'start_time' => $assignment['start_time'],
                        'end_time' => $assignment['end_time'],
                        'break_start' => $assignment['break_start'] ?? null,
                        'break_end' => $assignment['break_end'] ?? null,
                        'ot_hours' => $assignment['ot_hours'] ?? 0,
                        'notes' => $assignment['notes'] ?? null,
                    ]);
                    Log::info('Assignment created', [
                        'schedule_id' => $schedule->id,
                        'assignment_index' => $index,
                        'user_id' => $assignment['empId']
                    ]);
                } catch (\Exception $e) {
                    Log::error('Failed to create assignment', [
                        'schedule_id' => $schedule->id,
                        'assignment_index' => $index,
                        'assignment_data' => $assignment,
                        'error' => $e->getMessage()
                    ]);
                    throw $e;
                }
            }
            
            Log::info('Schedule update completed successfully', ['schedule_id' => $schedule->id]);
            
            return response()->json(['message' => 'Schedule updated successfully!', 'schedule' => $schedule]);
            
        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::error('Schedule update validation failed', [
                'schedule_id' => $id,
                'errors' => $e->errors(),
                'request_data' => $request->all()
            ]);
            return response()->json([
                'message' => 'Validation failed. Please check your input data.',
                'error' => 'VALIDATION_ERROR',
                'errors' => $e->errors()
            ], 422);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            Log::error('Schedule not found for update', [
                'schedule_id' => $id,
                'error' => $e->getMessage()
            ]);
            return response()->json([
                'message' => 'Schedule not found.',
                'error' => 'SCHEDULE_NOT_FOUND'
            ], 404);
        } catch (\Exception $e) {
            Log::error('Schedule update failed with unexpected error', [
                'schedule_id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'request_data' => $request->all()
            ]);
            return response()->json([
                'message' => 'An unexpected error occurred while updating the schedule. Please try again.',
                'error' => 'SERVER_ERROR'
            ], 500);
        }
    }

    protected function normalizeAssignments(Request $request): void
    {
        $assignments = $request->input('assignments');

        if (!is_array($assignments)) {
            return;
        }

        foreach ($assignments as $index => $assignment) {
            if (!is_array($assignment)) {
                continue;
            }

            foreach (['start_time', 'end_time', 'break_start', 'break_end'] as $field) {
                if (!array_key_exists($field, $assignment)) {
                    continue;
                }

                $assignments[$index][$field] = $this->normalizeTimeValue($assignment[$field]);
            }
        }

        $request->merge(['assignments' => $assignments]);
    }

    protected function normalizeTimeValue($value)
    {
        if ($value === null || $value === '' || (is_string($value) && strtolower($value) === 'null')) {
            return null;
        }

        if (is_string($value) && preg_match('/^\d{2}:\d{2}$/', $value)) {
            return $value;
        }

        try {
            if (is_string($value) && preg_match('/^\d{2}:\d{2}:\d{2}$/', $value)) {
                return \Carbon\Carbon::createFromFormat('H:i:s', $value)->format('H:i');
            }

            return \Carbon\Carbon::parse($value)->format('H:i');
        } catch (\Exception $e) {
            return $value;
        }
    }

    public function templatesIndex()
    {
        $templates = ScheduleTemplate::with(['assignments.user.position'])->get();
        return response()->json($templates);
    }

    public function templatesStore(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'columns' => 'required|array',
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
        ]);
        $template->update($data);
        return response()->json($template);
    }

    public function templatesShow($id)
    {
        $template = ScheduleTemplate::with(['assignments.user.position'])->find($id);

        if (!$template) {
            return response()->json(['template' => null], 404);
        }

        $normalizedTemplate = [
            'id' => $template->id,
            'name' => $template->name,
            'description' => $template->description,
            'columns' => $template->columns,
            'assignments' => $template->assignments->map(function ($assignment) {
                return [
                    'id' => $assignment->id,
                    'start_time' => $assignment->start_time,
                    'end_time' => $assignment->end_time,
                    'break_start' => $assignment->break_start,
                    'break_end' => $assignment->break_end,
                    'ot_hours' => $assignment->ot_hours,
                    'notes' => $assignment->notes,
                    'user' => $assignment->user ? [
                        'id' => $assignment->user->id,
                        'name' => $assignment->user->name,
                        'position' => $assignment->user->position ? [
                            'id' => $assignment->user->position->id,
                            'name' => $assignment->user->position->name,
                        ] : null,
                    ] : null,
                ];
            })->values()->toArray(),
        ];

        return response()->json(['template' => $normalizedTemplate]);
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
                        'break_start' => $assignment->break_start,
                        'break_end' => $assignment->break_end,
                        'ot_hours' => $assignment->ot_hours,
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

    public function getByDate(Request $request)
    {
        $validated = $request->validate([
            'date' => 'required|date',
        ]);

        $schedule = Schedule::with(['assignments.user.position'])
            ->where('date', $validated['date'])
            ->first();

        if (!$schedule) {
            return response()->json([
                'schedule' => null,
            ]);
        }

        return response()->json([
            'schedule' => [
                'id' => $schedule->id,
                'name' => $schedule->name,
                'date' => $schedule->date,
                'description' => $schedule->description,
                'assignments' => $schedule->assignments->map(function ($assignment) {
                    return [
                        'id' => $assignment->id,
                        'start_time' => $assignment->start_time,
                        'end_time' => $assignment->end_time,
                        'break_start' => $assignment->break_start,
                        'break_end' => $assignment->break_end,
                        'ot_hours' => $assignment->ot_hours,
                        'notes' => $assignment->notes,
                        'user_name' => $assignment->user ? $assignment->user->name : null,
                        'employee_id' => $assignment->user ? $assignment->user->id : null,
                        'position_name' => $assignment->user && $assignment->user->position ? $assignment->user->position->name : null,
                    ];
                })->values()->toArray(),
            ],
        ]);
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
                    'break_start' => $assignment->break_start,
                    'break_end' => $assignment->break_end,
                    'ot_hours' => $assignment->ot_hours,
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

        $date = $schedule->date;
        $scheduleName = $schedule->name;
        $scheduleId = $schedule->id;
        $schedule->delete();
        
        // Log activity
        $this->logDelete('schedule', $scheduleId, "{$scheduleName} for {$date}");
        
        return response()->json(['message' => 'Schedule ' . $date . ' deleted successfully!']);
    }

    // Template methods
    public function getTemplates()
    {
        $templates = ScheduleTemplate::all();
        return response()->json($templates);
    }

    public function createTemplate(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'columns' => 'required|array',
        ]);

        $template = ScheduleTemplate::create($data);
        return response()->json($template, 201);
    }

    public function updateTemplate(Request $request, $id)
    {
        $template = ScheduleTemplate::findOrFail($id);
        
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'columns' => 'required|array',
        ]);

        $template->update($data);
        return response()->json($template);
    }

    public function deleteTemplate($id)
    {
        $template = ScheduleTemplate::findOrFail($id);
        $template->delete();
        
        return response()->json(['message' => 'Template deleted successfully!']);
    }
}
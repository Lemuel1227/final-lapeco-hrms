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

        // Check if a schedule already exists for this date
        $existingSchedule = Schedule::where('date', $data['date'])->first();
        if ($existingSchedule) {
            return response()->json([
                'message' => 'A schedule already exists for this date. Only one schedule per date is allowed.',
                'error' => 'SCHEDULE_EXISTS_FOR_DATE'
            ], 422);
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

        return response()->json(['message' => 'Schedule saved successfully!', 'schedule' => $schedule], 201);
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
<?php

namespace App\Http\Controllers;

use App\Models\Position;
use Illuminate\Http\Request;
use App\Models\User;
use App\Models\Notification;
use App\Traits\LogsActivity;

class PositionController extends Controller
{
    use LogsActivity;
    public function index(Request $request)
    {
        $positions = Position::all()->map(function ($pos) {
            $employeeCount = \App\Models\User::where('position_id', $pos->id)
                ->whereNotIn('employment_status', ['terminated', 'resigned'])
                ->count();
            return [
                'id' => $pos->id,
                'title' => $pos->name,
                'name' => $pos->name,
                'description' => $pos->description,
                'max_team_leaders' => $pos->max_team_leaders,
                'monthly_salary' => $pos->monthly_salary,
                'base_rate_per_hour' => $pos->base_rate_per_hour,
                'overtime_rate_per_hour' => $pos->overtime_rate_per_hour,
                'night_diff_rate_per_hour' => $pos->night_diff_rate_per_hour,
                'late_deduction_per_minute' => $pos->late_deduction_per_minute,
                'allowed_modules' => $pos->allowed_modules ?? [],
                'employeeCount' => $employeeCount,
            ];
        });
        return response()->json($positions);
    }

    public function publicIndex()
    {
        $positions = Position::select('id', 'name', 'description')->get();
        return response()->json($positions);
    }

    public function show(Position $position)
    {
        return response()->json($position);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'max_team_leaders' => 'nullable|integer|min:1',
            'description' => 'nullable|string',
            'monthly_salary' => 'nullable|numeric|min:0',
            'base_rate_per_hour' => 'required|numeric|min:0',
            'overtime_rate_per_hour' => 'nullable|numeric|min:0',
            'night_diff_rate_per_hour' => 'nullable|numeric|min:0',
            'late_deduction_per_minute' => 'nullable|numeric|min:0',
            'regular_day_ot_rate' => 'nullable|numeric|min:0',
            'special_ot_rate' => 'nullable|numeric|min:0',
            'regular_holiday_ot_rate' => 'nullable|numeric|min:0',
            'department_id' => 'nullable|exists:departments,id',
            'allowed_modules' => 'nullable|array',
            'allowed_modules.*' => 'string',
        ]);

        $position = Position::create($validated);
        
        $this->logCreate('position', $position->id, $position->name);
        
        return response()->json($position, 201);
    }

    public function update(Request $request, Position $position)
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'max_team_leaders' => 'sometimes|integer|min:1',
            'description' => 'sometimes|nullable|string',
            'monthly_salary' => 'sometimes|nullable|numeric|min:0',
            'base_rate_per_hour' => 'sometimes|numeric|min:0',
            'overtime_rate_per_hour' => 'sometimes|nullable|numeric|min:0',
            'night_diff_rate_per_hour' => 'sometimes|nullable|numeric|min:0',
            'late_deduction_per_minute' => 'sometimes|nullable|numeric|min:0',
            'regular_day_ot_rate' => 'sometimes|nullable|numeric|min:0',
            'special_ot_rate' => 'sometimes|nullable|numeric|min:0',
            'regular_holiday_ot_rate' => 'sometimes|nullable|numeric|min:0',
            'department_id' => 'sometimes|nullable|exists:departments,id',
            'allowed_modules' => 'sometimes|array',
            'allowed_modules.*' => 'string',
        ]);

        $position->update($validated);
        
        $this->logUpdate('position', $position->id, $position->name);
        
        return response()->json($position);
    }

    public function destroy(Position $position)
    {
        $positionName = $position->name;
        $positionId = $position->id;
        $position->delete();
        
        $this->logDelete('position', $positionId, $positionName);
        
        return response()->json(null, 204);
    }

    public function employees($id)
    {
        $employees = User::where('position_id', $id)
            ->whereNotIn('employment_status', ['terminated', 'resigned'])
            ->get()
            ->map(function ($user) {
                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'role' => $user->is_team_leader ? 'TEAM_LEADER' : $user->role,
                    'isTeamLeader' => $user->is_team_leader,
                    'employee_id' => $user->employee_id,
                    'joining_date' => $user->joining_date,
                    'image_url' => $user->image_url,
                ];
            });
        return response()->json(['employees' => $employees]);
    }

    public function removeEmployee(Position $position, User $employee)
    {
        if ($employee->position_id !== $position->id) {
            return response()->json([
                'message' => 'Employee is not assigned to the specified position.',
            ], 422);
        }

        $employee->position_id = null;

        if ($employee->is_team_leader) {
            $employee->is_team_leader = false;
        }

        $employee->save();

        Notification::createForUser(
            $employee->id,
            'position_change',
            'Position Updated',
            'You have been removed from your position.'
        );

        $this->logUpdate('employee', $employee->id, $employee->name);

        return response()->json([
            'message' => 'Employee removed from position successfully.',
            'employee' => [
                'id' => $employee->id,
                'name' => $employee->name,
                'role' => $employee->is_team_leader ? 'TEAM_LEADER' : $employee->role,
                'position_id' => $employee->position_id,
            ],
        ]);
    }

    public function assignTeamLeader(Position $position, User $employee)
    {
        if ($employee->position_id !== $position->id) {
            return response()->json([
                'message' => 'Employee is not assigned to the specified position.',
            ], 422);
        }
        
        $maxLeaders = $position->max_team_leaders ?? 1;
        $currentLeadersCount = User::where('position_id', $position->id)
            ->where('is_team_leader', true)
            ->where('id', '!=', $employee->id) 
            ->count();

        if ($maxLeaders == 1) {
            
            User::where('position_id', $position->id)
                ->where('is_team_leader', true)
                ->where('id', '!=', $employee->id)
                ->update(['is_team_leader' => false]);
        } else {
            
            if ($currentLeadersCount >= $maxLeaders) {
                return response()->json([
                    'message' => "Maximum number of team leaders ($maxLeaders) reached for this position. Please remove a team leader first.",
                ], 422);
            }
        }

        $employee->is_team_leader = true;  
        
        $employee->save();

        Notification::createForUser(
            $employee->id,
            'role_change',
            'Promoted to Team Leader',
            "You have been assigned as a Team Leader for the position {$position->name}."
        );

        $this->logUpdate('employee', $employee->id, "Assigned as Team Leader for {$position->name}");

        return response()->json([
            'message' => 'Employee assigned as Team Leader successfully.',
            'employee' => [
                'id' => $employee->id,
                'name' => $employee->name,
                'role' => 'TEAM_LEADER', 
                'isTeamLeader' => true,
                'position_id' => $employee->position_id,
            ],
        ]);
    }

    public function removeTeamLeader(Position $position, User $employee)
    {
        if ($employee->position_id !== $position->id) {
            return response()->json([
                'message' => 'Employee is not assigned to the specified position.',
            ], 422);
        }

        $employee->is_team_leader = false;
        $employee->save();

        Notification::createForUser(
            $employee->id,
            'role_change',
            'Team Leader Status Removed',
            "You are no longer a Team Leader for the position {$position->name}."
        );

        $this->logUpdate('employee', $employee->id, "Removed as Team Leader for {$position->name}");

        return response()->json([
            'message' => 'Team Leader status removed successfully.',
            'employee' => [
                'id' => $employee->id,
                'name' => $employee->name,
                'role' => $employee->role,
                'isTeamLeader' => false,
                'position_id' => $employee->position_id,
            ],
        ]);
    }
}
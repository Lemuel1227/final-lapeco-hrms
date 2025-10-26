<?php

namespace App\Http\Controllers;

use App\Models\Position;
use Illuminate\Http\Request;
use App\Models\User;
use App\Traits\LogsActivity;

class PositionController extends Controller
{
    use LogsActivity;
    public function index(Request $request)
    {
        // Enhanced version for authenticated users (web interface)
        $positions = Position::all()->map(function ($pos) {
            $employeeCount = \App\Models\User::where('position_id', $pos->id)->count();
            return [
                'id' => $pos->id,
                'title' => $pos->name,
                'name' => $pos->name,
                'description' => $pos->description,
                'monthly_salary' => $pos->monthly_salary,
                'base_rate_per_hour' => $pos->base_rate_per_hour,
                'overtime_rate_per_hour' => $pos->overtime_rate_per_hour,
                'night_diff_rate_per_hour' => $pos->night_diff_rate_per_hour,
                'late_deduction_per_minute' => $pos->late_deduction_per_minute,
                'employeeCount' => $employeeCount,
            ];
        });
        return response()->json($positions);
    }

    public function publicIndex()
    {
        // Public version - only name and description
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
            'description' => 'nullable|string',
            'monthly_salary' => 'nullable|numeric|min:0',
            'base_rate_per_hour' => 'required|numeric|min:0',
            'overtime_rate_per_hour' => 'nullable|numeric|min:0',
            'night_diff_rate_per_hour' => 'nullable|numeric|min:0',
            'late_deduction_per_minute' => 'nullable|numeric|min:0',
        ]);

        $position = Position::create($validated);
        
        // Log activity
        $this->logCreate('position', $position->id, $position->name);
        
        return response()->json($position, 201);
    }

    public function update(Request $request, Position $position)
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'sometimes|nullable|string',
            'monthly_salary' => 'sometimes|nullable|numeric|min:0',
            'base_rate_per_hour' => 'sometimes|numeric|min:0',
            'overtime_rate_per_hour' => 'sometimes|nullable|numeric|min:0',
            'night_diff_rate_per_hour' => 'sometimes|nullable|numeric|min:0',
            'late_deduction_per_minute' => 'sometimes|nullable|numeric|min:0',
        ]);

        $position->update($validated);
        
        // Log activity
        $this->logUpdate('position', $position->id, $position->name);
        
        return response()->json($position);
    }

    public function destroy(Position $position)
    {
        $positionName = $position->name;
        $positionId = $position->id;
        $position->delete();
        
        // Log activity
        $this->logDelete('position', $positionId, $positionName);
        
        return response()->json(null, 204);
    }

    public function employees($id)
    {
        $employees = User::where('position_id', $id)
            ->get()
            ->map(function ($user) {
                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'role' => $user->role,
                    'isTeamLeader' => $user->role === 'TEAM_LEADER',
                    'employee_id' => $user->employee_id,
                ];
            });
        return response()->json(['employees' => $employees]);
    }
}
<?php

namespace App\Http\Controllers;

use App\Models\Position;
use Illuminate\Http\Request;
use App\Models\User;

class PositionController extends Controller
{
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
        ]);

        $position = Position::create($validated);
        return response()->json($position, 201);
    }

    public function update(Request $request, Position $position)
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'sometimes|nullable|string',
            'monthly_salary' => 'sometimes|nullable|numeric|min:0',
        ]);

        $position->update($validated);
        return response()->json($position);
    }

    public function destroy(Position $position)
    {
        $position->delete();
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
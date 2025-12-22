<?php

namespace App\Http\Controllers;

use App\Models\Department;
use App\Models\Position;
use App\Models\User;
use Illuminate\Http\Request;
use App\Traits\LogsActivity;

class DepartmentController extends Controller
{
    use LogsActivity;

    public function index(Request $request)
    {
        $departments = Department::all()->map(function ($dept) {
            $positionCount = Position::where('department_id', $dept->id)->count();
            $employeeCount = User::whereIn('position_id', function($q) use ($dept) {
                    $q->select('id')->from('positions')->where('department_id', $dept->id);
                })
                ->whereNotIn('employment_status', ['terminated', 'resigned'])
                ->count();
            return [
                'id' => $dept->id,
                'name' => $dept->name,
                'description' => $dept->description,
                'positionCount' => $positionCount,
                'employeeCount' => $employeeCount,
            ];
        });
        return response()->json($departments);
    }

    public function publicIndex()
    {
        $departments = Department::select('id', 'name', 'description')->get();
        return response()->json($departments);
    }

    public function show(Department $department)
    {
        return response()->json($department);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:160',
        ]);

        $department = Department::create($validated);
        $this->logCreate('department', $department->id, $department->name);
        return response()->json($department, 201);
    }

    public function update(Request $request, Department $department)
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'sometimes|nullable|string|max:160',
        ]);
        $department->update($validated);
        $this->logUpdate('department', $department->id, $department->name);
        return response()->json($department);
    }

    public function destroy(Department $department)
    {
        // Prevent deleting Admin Department
        if ($department->name === 'Admin Department') {
            return response()->json([
                'message' => 'The Admin Department cannot be deleted as it is a system default.'
            ], 403);
        }

        // Optional: prevent deletion if positions exist
        $hasPositions = Position::where('department_id', $department->id)->exists();
        if ($hasPositions) {
            return response()->json([
                'message' => 'Cannot delete department with existing positions. Please reassign or delete positions first.'
            ], 422);
        }

        $name = $department->name;
        $id = $department->id;
        $department->delete();
        $this->logDelete('department', $id, $name);
        return response()->json(null, 204);
    }

    public function positions(Department $department)
    {
        $positions = Position::where('department_id', $department->id)->get()->map(function ($pos) {
            $employeeCount = User::where('position_id', $pos->id)
                ->whereNotIn('employment_status', ['terminated', 'resigned'])
                ->count();
            return [
                'id' => $pos->id,
                'title' => $pos->name,
                'name' => $pos->name,
                'description' => $pos->description,
                'monthly_salary' => $pos->monthly_salary,
                'base_rate_per_hour' => $pos->base_rate_per_hour,
                'regular_day_ot_rate' => $pos->regular_day_ot_rate,
                'special_ot_rate' => $pos->special_ot_rate,
                'regular_holiday_ot_rate' => $pos->regular_holiday_ot_rate,
                'night_diff_rate_per_hour' => $pos->night_diff_rate_per_hour,
                'late_deduction_per_minute' => $pos->late_deduction_per_minute,
                'allowed_modules' => $pos->allowed_modules ?? [],
                'department_id' => $pos->department_id,
                'employeeCount' => $employeeCount,
            ];
        });
        return response()->json($positions);
    }
}
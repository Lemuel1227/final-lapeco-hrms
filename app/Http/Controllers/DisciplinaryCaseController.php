<?php

namespace App\Http\Controllers;

use App\Models\DisciplinaryCase;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\Rule;

class DisciplinaryCaseController extends Controller
{
    /**
     * Display a listing of disciplinary cases.
     */
    public function index(): JsonResponse
    {
        $cases = DisciplinaryCase::with('employee:id,name,employee_id')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($cases);
    }

    /**
     * Store a newly created disciplinary case.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'employee_id' => 'required|exists:users,id',
            'violation_type' => 'required|string|max:255',
            'description' => 'required|string',
            'incident_date' => 'required|date',
            'reported_date' => 'required|date',
            'reported_by' => 'required|string|max:255',
            'severity' => 'required|in:minor,major,severe',
            'status' => 'required|in:pending,under_investigation,resolved,closed',
            'investigation_notes' => 'nullable|string',
            'action_taken' => 'nullable|string|max:255',
            'resolution_date' => 'nullable|date',
            'resolution_notes' => 'nullable|string'
        ]);

        // Generate case number
        $case = new DisciplinaryCase($validated);
        $case->case_number = $case->generateCaseNumber();
        $case->save();

        // Load the employee relationship
        $case->load('employee:id,name,employee_id');

        return response()->json($case, 201);
    }

    /**
     * Display the specified disciplinary case.
     */
    public function show(DisciplinaryCase $disciplinaryCase): JsonResponse
    {
        $disciplinaryCase->load('employee:id,name,employee_id');
        return response()->json($disciplinaryCase);
    }

    /**
     * Update the specified disciplinary case.
     */
    public function update(Request $request, DisciplinaryCase $disciplinaryCase): JsonResponse
    {
        $validated = $request->validate([
            'employee_id' => 'sometimes|exists:users,id',
            'violation_type' => 'sometimes|string|max:255',
            'description' => 'sometimes|string',
            'incident_date' => 'sometimes|date',
            'reported_date' => 'sometimes|date',
            'reported_by' => 'sometimes|string|max:255',
            'severity' => 'sometimes|in:minor,major,severe',
            'status' => 'sometimes|in:pending,under_investigation,resolved,closed',
            'investigation_notes' => 'nullable|string',
            'action_taken' => 'nullable|string|max:255',
            'resolution_date' => 'nullable|date',
            'resolution_notes' => 'nullable|string'
        ]);

        $disciplinaryCase->update($validated);
        $disciplinaryCase->load('employee:id,name,employee_id');

        return response()->json($disciplinaryCase);
    }

    /**
     * Remove the specified disciplinary case.
     */
    public function destroy(DisciplinaryCase $disciplinaryCase): JsonResponse
    {
        $disciplinaryCase->delete();
        return response()->json(['message' => 'Disciplinary case deleted successfully']);
    }

    /**
     * Get disciplinary cases by employee.
     */
    public function getByEmployee(User $employee): JsonResponse
    {
        $cases = DisciplinaryCase::where('employee_id', $employee->id)
            ->with('employee:id,name,employee_id')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($cases);
    }

    /**
     * Get cases by status.
     */
    public function getByStatus(string $status): JsonResponse
    {
        $cases = DisciplinaryCase::where('status', $status)
            ->with('employee:id,name,employee_id')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($cases);
    }

    /**
     * Get cases statistics.
     */
    public function getStatistics(): JsonResponse
    {
        $stats = [
            'total_cases' => DisciplinaryCase::count(),
            'pending_cases' => DisciplinaryCase::where('status', 'pending')->count(),
            'under_investigation' => DisciplinaryCase::where('status', 'under_investigation')->count(),
            'resolved_cases' => DisciplinaryCase::where('status', 'resolved')->count(),
            'closed_cases' => DisciplinaryCase::where('status', 'closed')->count(),
            'by_severity' => [
                'minor' => DisciplinaryCase::where('severity', 'minor')->count(),
                'major' => DisciplinaryCase::where('severity', 'major')->count(),
                'severe' => DisciplinaryCase::where('severity', 'severe')->count()
            ],
            'recent_cases' => DisciplinaryCase::with('employee:id,name,employee_id')
                ->orderBy('created_at', 'desc')
                ->limit(5)
                ->get()
        ];

        return response()->json($stats);
    }
}
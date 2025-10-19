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
        $cases = DisciplinaryCase::with(['employee:id,first_name,middle_name,last_name', 'actionLogs'])
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
            'action_type' => 'required|string|max:255',
            'description' => 'required|string',
            'incident_date' => 'required|date',
            'reason' => 'required|string|max:255',
            'status' => 'required|string|max:255',
            'resolution_taken' => 'nullable|string',
            'attachment' => 'nullable|string|max:255',
            'reported_by' => 'nullable|exists:users,id',
            'approval_status' => 'nullable|in:pending,approved'
        ]);

        $user = $request->user();
        $reportedById = $validated['reported_by'] ?? ($user ? $user->id : null);
        $approvalStatus = $validated['approval_status'] ?? (($user && $user->role === 'HR_PERSONNEL') ? 'approved' : 'pending');

        $case = DisciplinaryCase::create(array_merge($validated, [
            'reported_by' => $reportedById,
            'approval_status' => $approvalStatus,
        ]));

        // Load the employee relationship
        $case->load('employee:id,first_name,middle_name,last_name');

        return response()->json($case, 201);
    }

    /**
     * Display the specified disciplinary case.
     */
    public function show(DisciplinaryCase $disciplinaryCase): JsonResponse
    {
        $disciplinaryCase->load(['employee:id,first_name,middle_name,last_name', 'actionLogs']);
        return response()->json($disciplinaryCase);
    }

    /**
     * Update the specified disciplinary case.
     */
    public function update(Request $request, DisciplinaryCase $disciplinaryCase): JsonResponse
    {
        $validated = $request->validate([
            'employee_id' => 'sometimes|exists:users,id',
            'action_type' => 'sometimes|string|max:255',
            'description' => 'sometimes|string',
            'incident_date' => 'sometimes|date',
            'reason' => 'sometimes|string|max:255',
            'status' => 'sometimes|string|max:255',
            'resolution_taken' => 'nullable|string',
            'attachment' => 'nullable|string|max:255',
            'reported_by' => 'sometimes|nullable|exists:users,id',
            'approval_status' => 'sometimes|in:pending,approved'
        ]);

        $disciplinaryCase->update($validated);
        $disciplinaryCase->load('employee:id,first_name,middle_name,last_name');

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
            ->with('employee:id,first_name,middle_name,last_name')
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
            ->with('employee:id,first_name,middle_name,last_name')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($cases);
    }

    /**
     * Get disciplinary cases grouped by employee.
     */
    public function getGroupedByEmployee(): JsonResponse
    {
        $casesGroupedByEmployee = DisciplinaryCase::with('employee:id,first_name,middle_name,last_name')
            ->get()
            ->groupBy('employee_id')
            ->map(function ($cases, $employeeId) {
                return [
                    'employee' => $cases->first()->employee,
                    'total_cases' => $cases->count(),
                    'cases' => $cases->map(function ($case) {
                        return [
                            'id' => $case->id,
                            'action_type' => $case->action_type,
                            'description' => $case->description,
                            'incident_date' => $case->incident_date,
                            'reason' => $case->reason,
                            'status' => $case->status,
                            'resolution_taken' => $case->resolution_taken,
                            'attachment' => $case->attachment,
                            'created_at' => $case->created_at,
                            'updated_at' => $case->updated_at
                        ];
                    })->sortByDesc('incident_date')->values()
                ];
            })
            ->sortBy('employee.name')
            ->values();

        return response()->json($casesGroupedByEmployee);
    }

    /**
     * Get cases statistics.
     */
    public function getStatistics(): JsonResponse
    {
        $stats = [
            'total_cases' => DisciplinaryCase::count(),
            'by_status' => DisciplinaryCase::select('status')
                ->selectRaw('count(*) as count')
                ->groupBy('status')
                ->pluck('count', 'status'),
            'by_action_type' => DisciplinaryCase::select('action_type')
                ->selectRaw('count(*) as count')
                ->groupBy('action_type')
                ->pluck('count', 'action_type'),
            'recent_cases' => DisciplinaryCase::with('employee:id,first_name,middle_name,last_name')
                ->orderBy('created_at', 'desc')
                ->limit(5)
                ->get()
        ];

        return response()->json($stats);
    }
}
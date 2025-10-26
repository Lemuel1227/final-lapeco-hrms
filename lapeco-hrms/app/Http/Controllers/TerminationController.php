<?php

namespace App\Http\Controllers;

use App\Models\Termination;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use App\Traits\LogsActivity;

class TerminationController extends Controller
{
    use LogsActivity;
    /**
     * Display a listing of the resource.
     */
    public function index(): JsonResponse
    {
        $terminations = Termination::with(['employee', 'terminatedBy'])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($terminations);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'employee_id' => 'required|exists:users,id',
            'type' => 'required|in:voluntary,involuntary',
            'reason' => 'required|string',
            'termination_date' => 'required|date',
            'last_working_day' => 'required|date',
            'notes' => 'nullable|string'
        ]);

        // Set the terminated_by to the authenticated user
        $validated['terminated_by'] = Auth::id();

        $termination = Termination::create($validated);
        
        // Update employee status to terminated
        $employee = User::find($validated['employee_id']);
        if ($employee) {
            $employee->employment_status = 'terminated';
            $employee->account_status = 'Deactivated';
            $employee->save();
        }

        $termination->load(['employee', 'terminatedBy']);
        
        // Log activity
        $employeeName = $employee ? trim($employee->first_name . ' ' . $employee->last_name) : 'Employee';
        $this->logCreate('termination', $termination->id, "Terminated {$employeeName}");

        return response()->json([
            'message' => 'Employee terminated successfully',
            'termination' => $termination
        ], 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Termination $termination): JsonResponse
    {
        $termination->load(['employee', 'terminatedBy']);
        return response()->json($termination);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Termination $termination): JsonResponse
    {
        $validated = $request->validate([
            'type' => 'sometimes|in:voluntary,involuntary',
            'reason' => 'sometimes|string',
            'termination_date' => 'sometimes|date',
            'last_working_day' => 'sometimes|date',
            'notes' => 'nullable|string'
        ]);

        $termination->update($validated);
        $termination->load(['employee', 'terminatedBy']);
        
        // Log activity
        $this->logUpdate('termination', $termination->id, "Termination #{$termination->id}");

        return response()->json([
            'message' => 'Termination updated successfully',
            'termination' => $termination
        ]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Termination $termination): JsonResponse
    {
        // Reactivate employee if termination is deleted
        $employee = $termination->employee;
        if ($employee && $employee->employment_status === 'terminated') {
            $employee->employment_status = 'active';
            $employee->save();
        }

        $terminationId = $termination->id;
        $termination->delete();
        
        // Log activity
        $this->logDelete('termination', $terminationId, "Termination #{$terminationId}");

        return response()->json([
            'message' => 'Termination record deleted successfully'
        ]);
    }

    /**
     * Get terminations by employee
     */
    public function getByEmployee(User $employee): JsonResponse
    {
        $terminations = Termination::with(['terminatedBy'])
            ->where('employee_id', $employee->id)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($terminations);
    }

    /**
     * Get termination statistics
     */
    public function getStatistics(): JsonResponse
    {
        $stats = [
            'total_terminations' => Termination::count(),
            'voluntary_terminations' => Termination::where('type', 'voluntary')->count(),
            'involuntary_terminations' => Termination::where('type', 'involuntary')->count(),
            'recent_terminations' => Termination::where('created_at', '>=', now()->subDays(30))->count(),
        ];

        return response()->json($stats);
    }
}
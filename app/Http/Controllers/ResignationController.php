<?php

namespace App\Http\Controllers;

use App\Models\Resignation;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

class ResignationController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(): JsonResponse
    {
        $resignations = Resignation::with(['employee', 'approver'])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($resignations);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'employee_id' => 'required|exists:users,id',
            'reason' => 'required|string',
            'submission_date' => 'required|date',
            'effective_date' => 'required|date|after:submission_date',
            'notes' => 'nullable|string'
        ]);

        $resignation = Resignation::create($validated);
        $resignation->load(['employee', 'approver']);

        return response()->json($resignation, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Resignation $resignation): JsonResponse
    {
        $resignation->load(['employee', 'approver']);
        return response()->json($resignation);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Resignation $resignation): JsonResponse
    {
        $validated = $request->validate([
            'reason' => 'sometimes|string',
            'submission_date' => 'sometimes|date',
            'effective_date' => 'sometimes|date|after:submission_date',
            'status' => ['sometimes', Rule::in(['pending', 'approved', 'rejected', 'withdrawn'])],
            'notes' => 'nullable|string',
            'approved_by' => 'nullable|exists:users,id',
            'approved_at' => 'nullable|date'
        ]);

        $resignation->update($validated);
        $resignation->load(['employee', 'approver']);

        // Update employee status if resignation is approved
        if (isset($validated['status']) && $validated['status'] === 'approved') {
            $resignation->employee->update([
                'employment_status' => 'resigned',
                'account_status' => 'Deactivated'
            ]);
        }

        return response()->json($resignation);
    }

    /**
     * Update resignation status
     */
    public function updateStatus(Request $request, Resignation $resignation): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['required', Rule::in(['pending', 'approved', 'rejected', 'withdrawn'])],
            'notes' => 'nullable|string'
        ]);

        $updateData = $validated;
        
        if ($validated['status'] === 'approved') {
            $updateData['approved_by'] = Auth::id();
            $updateData['approved_at'] = now();
            
            // Update employee status
            $resignation->employee->update([
                'employment_status' => 'resigned',
                'account_status' => 'Deactivated'
            ]);
        }

        $resignation->update($updateData);
        $resignation->load(['employee', 'approver']);

        return response()->json($resignation);
    }

    /**
     * Update effective date
     */
    public function updateEffectiveDate(Request $request, Resignation $resignation): JsonResponse
    {
        $validated = $request->validate([
            'effective_date' => 'required|date|after:submission_date'
        ]);

        $resignation->update($validated);
        $resignation->load(['employee', 'approver']);

        return response()->json($resignation);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Resignation $resignation): JsonResponse
    {
        $resignation->delete();
        return response()->json(['message' => 'Resignation deleted successfully']);
    }
}

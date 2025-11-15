<?php

namespace App\Http\Controllers;

use App\Models\Resignation;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use App\Traits\LogsActivity;

class ResignationController extends Controller
{
    use LogsActivity;
    /**
     * Display a listing of the resource.
     */
    public function index(): JsonResponse
    {
        $resignations = Resignation::with([
                'employee' => function ($query) {
                    $query->select('id', 'first_name', 'middle_name', 'last_name', 'position_id');
                },
                'employee.position' => function ($query) {
                    $query->select('id', 'name');
                },
                'approver' => function ($query) {
                    $query->select('id', 'first_name', 'middle_name', 'last_name');
                },
            ])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json(
            $resignations->map(fn (Resignation $resignation) => $this->transformResignation($resignation))
        );
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
        $resignation->loadMissing([
            'employee' => function ($query) {
                $query->select('id', 'first_name', 'middle_name', 'last_name', 'position_id');
            },
            'employee.position' => function ($query) {
                $query->select('id', 'name');
            },
            'approver' => function ($query) {
                $query->select('id', 'first_name', 'middle_name', 'last_name');
            },
        ]);
        
        // Log activity
        $employeeName = $resignation->employee ? 
            trim($resignation->employee->first_name . ' ' . $resignation->employee->last_name) : 
            'Employee';
        $this->logCreate('resignation', $resignation->id, "Resignation for {$employeeName}");

        return response()->json($this->transformResignation($resignation), 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Resignation $resignation): JsonResponse
    {
        $resignation->loadMissing([
            'employee' => function ($query) {
                $query->select('id', 'first_name', 'middle_name', 'last_name', 'position_id');
            },
            'employee.position' => function ($query) {
                $query->select('id', 'name');
            },
            'approver' => function ($query) {
                $query->select('id', 'first_name', 'middle_name', 'last_name');
            },
        ]);

        return response()->json($this->transformResignation($resignation));
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
            'status' => ['sometimes', Rule::in(['pending', 'approved', 'withdrawn'])],
            'notes' => 'nullable|string',
            'approved_by' => 'nullable|exists:users,id',
            'approved_at' => 'nullable|date'
        ]);

        // Load employee relationship
        $resignation->load('employee');

        // Update employee status if resignation is approved or withdrawn
        if (isset($validated['status']) && $resignation->employee) {
            if ($validated['status'] === 'approved') {
                $resignation->employee->update([
                    'employment_status' => 'resigned',
                ]);

                if ($resignation->effective_date) {
                    $effective = \Carbon\Carbon::parse($resignation->effective_date);
                    if ($effective->lte(\Carbon\Carbon::today())) {
                        $resignation->employee->update([
                            'account_status' => 'Deactivated',
                            'position_id' => null,
                        ]);
                    }
                }
            } elseif ($validated['status'] === 'withdrawn') {
                // When resignation is withdrawn, revert employee status back to active
                // Only if they haven't been deactivated yet
                if ($resignation->employee->account_status !== 'Deactivated') {
                    $resignation->employee->update([
                        'employment_status' => 'active',
                    ]);
                }
            }
        }

        $resignation->update($validated);
        $resignation->loadMissing([
            'employee' => function ($query) {
                $query->select('id', 'first_name', 'middle_name', 'last_name', 'position_id');
            },
            'employee.position' => function ($query) {
                $query->select('id', 'name');
            },
            'approver' => function ($query) {
                $query->select('id', 'first_name', 'middle_name', 'last_name');
            },
        ]);

        // Log activity
        $this->logUpdate('resignation', $resignation->id, "Resignation #{$resignation->id}");

        return response()->json($this->transformResignation($resignation));
    }

    /**
     * Allow employees to withdraw their own resignation
     */
    public function withdrawOwn(Request $request, Resignation $resignation): JsonResponse
    {
        $currentUser = Auth::user();
        
        // Verify this resignation belongs to the current user
        if ($resignation->employee_id !== $currentUser->id) {
            return response()->json([
                'message' => 'You can only withdraw your own resignation.'
            ], 403);
        }
        
        // Only allow withdrawal if status has not been approved yet
        if ($resignation->status === 'approved') {
            return response()->json([
                'message' => 'Approved resignations cannot be withdrawn.'
            ], 422);
        }
        
        // Don't allow re-withdrawing already withdrawn resignations
        if ($resignation->status === 'withdrawn') {
            return response()->json([
                'message' => 'This resignation has already been withdrawn.'
            ], 422);
        }
        
        // Load employee relationship
        $resignation->load('employee');
        
        // Update status to withdrawn
        $resignation->update(['status' => 'withdrawn']);
        
        // Revert employee status back to active
        if ($resignation->employee && $resignation->employee->account_status !== 'Deactivated') {
            $resignation->employee->update([
                'employment_status' => 'active',
            ]);
        }
        
        // Log withdrawal activity
        $employeeName = $resignation->employee ? 
            trim($resignation->employee->first_name . ' ' . $resignation->employee->last_name) : 
            'Employee';
        $this->logUpdate('resignation', $resignation->id, "Resignation withdrawn by {$employeeName}");
        
        $resignation->loadMissing([
            'employee' => function ($query) {
                $query->select('id', 'first_name', 'middle_name', 'last_name', 'position_id');
            },
            'employee.position' => function ($query) {
                $query->select('id', 'name');
            },
        ]);
        
        return response()->json($this->transformResignation($resignation));
    }

    /**
     * Update resignation status
     */
    public function updateStatus(Request $request, Resignation $resignation): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['required', Rule::in(['pending', 'approved','withdrawn'])],
            'notes' => 'nullable|string'
        ]);

        // Load employee relationship
        $resignation->load('employee');
        
        $updateData = $validated;
        
        if ($validated['status'] === 'approved') {
            $updateData['approved_by'] = Auth::id();
            $updateData['approved_at'] = now();
            
            $resignation->employee->update([
                'employment_status' => 'resigned',
            ]);

            if ($resignation->effective_date) {
                $effective = \Carbon\Carbon::parse($resignation->effective_date);
                if ($effective->lte(\Carbon\Carbon::today())) {
                    $resignation->employee->update([
                        'account_status' => 'Deactivated',
                        'position_id' => null,
                    ]);
                }
            }
        } elseif ($validated['status'] === 'withdrawn') {
            // When resignation is withdrawn, revert employee status back to active
            // Only if they haven't been deactivated yet
            if ($resignation->employee) {
                if ($resignation->employee->account_status !== 'Deactivated') {
                    $resignation->employee->update([
                        'employment_status' => 'active',
                    ]);
                }
                
                // Log withdrawal activity
                $employeeName = trim($resignation->employee->first_name . ' ' . $resignation->employee->last_name);
                $this->logUpdate('resignation', $resignation->id, "Resignation withdrawn by {$employeeName}");
            }
        }

        $resignation->update($updateData);
        $resignation->loadMissing([
            'employee' => function ($query) {
                $query->select('id', 'first_name', 'middle_name', 'last_name', 'position_id');
            },
            'employee.position' => function ($query) {
                $query->select('id', 'name');
            },
            'approver' => function ($query) {
                $query->select('id', 'first_name', 'middle_name', 'last_name');
            },
        ]);

        return response()->json($this->transformResignation($resignation));
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
        $resignation->loadMissing([
            'employee' => function ($query) {
                $query->select('id', 'first_name', 'middle_name', 'last_name', 'position_id');
            },
            'employee.position' => function ($query) {
                $query->select('id', 'name');
            },
            'approver' => function ($query) {
                $query->select('id', 'first_name', 'middle_name', 'last_name');
            },
        ]);

        // If already approved and effective date is today/past, deactivate account
        if ($resignation->status === 'approved' && $resignation->effective_date) {
            $effective = \Carbon\Carbon::parse($resignation->effective_date);
            if ($effective->lte(\Carbon\Carbon::today())) {
                $resignation->employee->update([
                    'account_status' => 'Deactivated'
                ]);
            }
        }

        return response()->json($this->transformResignation($resignation));
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Resignation $resignation): JsonResponse
    {
        $resignation->delete();
        return response()->json(['message' => 'Resignation deleted successfully']);
    }

    private function transformResignation(Resignation $resignation): array
    {
        $employee = $resignation->employee;
        $approver = $resignation->approver;

        return [
            'id' => $resignation->id,
            'employee_id' => $resignation->employee_id,
            'employee_full_name' => $resignation->employee_full_name,
            'position_name' => $employee?->position?->name,
            'status' => match ($resignation->status) {
                'pending' => 'Pending',
                'approved' => 'Approved',
                'withdrawn' => 'Withdrawn',
                default => ucfirst($resignation->status ?? 'Pending'),
            },
            'reason' => $resignation->reason,
            'submission_date' => $resignation->submission_date,
            'effective_date' => $resignation->effective_date,
            'hr_comments' => $resignation->hr_comments ?? $resignation->notes,
            'approved_by' => $resignation->approved_by,
            'approver' => $approver ? [
                'id' => $approver->id,
                'first_name' => $approver->first_name,
                'middle_name' => $approver->middle_name,
                'last_name' => $approver->last_name,
            ] : null,
        ];
    }
}

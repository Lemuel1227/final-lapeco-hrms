<?php

namespace App\Http\Controllers;

use App\Models\Resignation;
use App\Models\Termination;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Traits\LogsActivity;

class OffboardingController extends Controller
{
    use LogsActivity;

    public function index(Request $request): JsonResponse
    {
        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');

        $resignationsQuery = Resignation::with([
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
            ->where('status', 'Approved');

        if ($startDate && $endDate) {
            $resignationsQuery->whereBetween('effective_date', [$startDate, $endDate]);
        }

        $resignations = $resignationsQuery->orderBy('effective_date', 'desc')->get();

        $terminationsQuery = Termination::with([
            'employee' => function ($query) {
                $query->select('id', 'first_name', 'middle_name', 'last_name', 'position_id');
            },
            'employee.position' => function ($query) {
                $query->select('id', 'name');
            },
            'terminatedBy' => function ($query) {
                $query->select('id', 'first_name', 'middle_name', 'last_name');
            },
        ]);

        if ($startDate && $endDate) {
            $terminationsQuery->whereBetween('termination_date', [$startDate, $endDate]);
        }

        $terminations = $terminationsQuery->orderBy('termination_date', 'desc')->get();

        $voluntaryResignations = $resignations->map(function ($resignation) {
            return $this->transformResignation($resignation);
        });

        $involuntaryTerminations = $terminations->map(function ($termination) {
            return $this->transformTermination($termination);
        });

        return response()->json([
            'voluntary_resignations' => $voluntaryResignations,
            'involuntary_terminations' => $involuntaryTerminations,
            'summary' => [
                'total_voluntary' => $voluntaryResignations->count(),
                'total_involuntary' => $involuntaryTerminations->count(),
                'total_offboarding' => $voluntaryResignations->count() + $involuntaryTerminations->count(),
                'date_range' => $startDate && $endDate ? "{$startDate} to {$endDate}" : 'All time'
            ]
        ]);
    }

    private function transformResignation($resignation): array
    {
        $employee = $resignation->employee;
        $approver = $resignation->approver;

        $employeeNameParts = $employee ? array_filter([
            $employee->first_name,
            $employee->middle_name,
            $employee->last_name,
        ]) : [];

        $approverNameParts = $approver ? array_filter([
            $approver->first_name,
            $approver->middle_name,
            $approver->last_name,
        ]) : [];

        return [
            'id' => $resignation->id,
            'type' => 'voluntary_resignation',
            'employee_id' => $resignation->employee_id,
            'employee_name' => $employeeNameParts ? implode(' ', $employeeNameParts) : 'Unknown Employee',
            'position' => $employee?->position?->name ?? 'Unassigned',
            'effective_date' => $resignation->effective_date,
            'submission_date' => $resignation->submission_date,
            'reason' => $resignation->reason,
            'status' => $resignation->status,
            'hr_comments' => $resignation->hr_comments,
            'approved_by' => $approverNameParts ? implode(' ', $approverNameParts) : null,
            'created_at' => $resignation->created_at,
            'updated_at' => $resignation->updated_at,
        ];
    }

    private function transformTermination($termination): array
    {
        $employee = $termination->employee;
        $terminatedBy = $termination->terminatedBy;

        $employeeNameParts = $employee ? array_filter([
            $employee->first_name,
            $employee->middle_name,
            $employee->last_name,
        ]) : [];

        $terminatedByNameParts = $terminatedBy ? array_filter([
            $terminatedBy->first_name,
            $terminatedBy->middle_name,
            $terminatedBy->last_name,
        ]) : [];

        return [
            'id' => $termination->id,
            'type' => 'involuntary_termination',
            'employee_id' => $termination->employee_id,
            'employee_name' => $employeeNameParts ? implode(' ', $employeeNameParts) : 'Unknown Employee',
            'position' => $employee?->position?->name ?? 'Unassigned',
            'termination_date' => $termination->termination_date,
            'last_working_day' => $termination->last_working_day,
            'reason' => $termination->reason,
            'type_detail' => $termination->type,
            'notes' => $termination->notes,
            'terminated_by' => $terminatedByNameParts ? implode(' ', $terminatedByNameParts) : null,
            'created_at' => $termination->created_at,
            'updated_at' => $termination->updated_at,
        ];
    }

    public function statistics(Request $request): JsonResponse
    {
        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');

        $resignationsCount = Resignation::where('status', 'Approved')
            ->when($startDate && $endDate, function ($query) use ($startDate, $endDate) {
                return $query->whereBetween('effective_date', [$startDate, $endDate]);
            })
            ->count();

        $terminationsCount = Termination::when($startDate && $endDate, function ($query) use ($startDate, $endDate) {
            return $query->whereBetween('termination_date', [$startDate, $endDate]);
        })
            ->count();

        return response()->json([
            'voluntary_resignations' => $resignationsCount,
            'involuntary_terminations' => $terminationsCount,
            'total_offboarding' => $resignationsCount + $terminationsCount
        ]);
    }
}

<?php

namespace App\Http\Controllers;

use App\Models\EmployeePayroll;
use App\Models\PayrollPeriod;
use App\Models\User;
use App\Models\FinalizedContribution;
use Illuminate\Http\Request;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;

class ContributionController extends Controller
{
    /**
     * Calculate SSS contribution based on monthly salary
     */
    private function calculateSssContribution($monthlySalary)
    {
        // Cap at maximum MSC of ₱30,000
        $msc = min($monthlySalary, 30000);
        
        // Minimum MSC is ₱4,000
        if ($msc < 4000) {
            $msc = 4000;
        }

        // Round MSC to nearest ₱500 bracket
        if ($msc < 30000) {
            $remainder = $msc % 500;
            if ($remainder < 250) {
                $msc = $msc - $remainder;
            } else {
                $msc = $msc - $remainder + 500;
            }
        }
        
        // Calculate shares: Employee 4.5%, Employer 9.5%
        $employeeShare = $msc * 0.045; // Max: ₱1,350
        $employerShare = $msc * 0.095;

        return [
            'employeeShare' => round($employeeShare, 2),
            'employerShare' => round($employerShare, 2),
            'total' => round($employeeShare + $employerShare, 2),
        ];
    }

    /**
     * Calculate PhilHealth contribution based on monthly salary
     */
    private function calculatePhilhealthContribution($monthlySalary)
    {
        $rate = 0.05; // 5% total premium
        $incomeFloor = 10000; // Minimum ₱10,000
        $incomeCeiling = 100000; // Maximum ₱100,000

        // Apply floor and ceiling
        $baseSalary = max($monthlySalary, $incomeFloor);
        $baseSalary = min($baseSalary, $incomeCeiling);

        // Total premium is 5% of base salary
        $totalPremium = $baseSalary * $rate;

        return [
            'employeeShare' => round($totalPremium / 2, 2), // 2.5% (₱250 to ₱2,500)
            'employerShare' => round($totalPremium / 2, 2), // 2.5%
            'total' => round($totalPremium, 2),
        ];
    }

    /**
     * Calculate Pag-IBIG contribution based on monthly salary
     */
    private function calculatePagibigContribution($monthlySalary)
    {
        // Employee rate: 1% if ≤₱1,500, otherwise 2%
        if ($monthlySalary <= 1500) {
            $employeeShare = $monthlySalary * 0.01; // 1%
        } else {
            $employeeShare = $monthlySalary * 0.02; // 2%
        }
        
        // Cap employee share at ₱100/month
        $employeeShare = min($employeeShare, 100);
        
        // Employer always contributes 2%, capped at ₱100/month
        $employerShare = min($monthlySalary * 0.02, 100);

        return [
            'employeeShare' => round($employeeShare, 2),
            'employerShare' => round($employerShare, 2),
            'total' => round($employeeShare + $employerShare, 2),
        ];
    }

    /**
     * Get contribution report for a specific month
     */
    public function getMonthlyContributions(Request $request)
    {
        $validated = $request->validate([
            'year' => 'required|integer',
            'month' => 'required|integer|min:0|max:11', // 0-11 (JavaScript month format)
            'type' => 'required|in:sss,philhealth,pagibig,tin',
        ]);

        $year = $validated['year'];
        $month = $validated['month'] + 1; // Convert to 1-12

        // Get both payroll periods for this month
        $startOfMonth = Carbon::create($year, $month, 1)->startOfDay();
        $endOfMonth = Carbon::create($year, $month, 1)->endOfMonth()->endOfDay();

        $periods = PayrollPeriod::whereBetween('period_start', [$startOfMonth, $endOfMonth])
            ->orWhereBetween('period_end', [$startOfMonth, $endOfMonth])
            ->get();

        if ($periods->isEmpty()) {
            return response()->json([
                'message' => 'No payroll data found for this month',
                'data' => [],
                'isProvisional' => false,
                'missingPeriod' => null,
            ]);
        }

        // Check if we have both payroll periods (should be 2 for a complete month)
        $isProvisional = $periods->count() < 2;
        $missingPeriod = null;
        
        if ($isProvisional) {
            // Determine which period is missing
            $prevMonth = $month === 1 ? 12 : $month - 1;
            $prevMonthYear = $month === 1 ? $year - 1 : $year;
            
            $firstHalfStart = Carbon::create($prevMonthYear, $prevMonth, 26)->format('Y-m-d');
            $firstHalfEnd = Carbon::create($year, $month, 10)->format('Y-m-d');
            $firstHalfCutoff = "$firstHalfStart to $firstHalfEnd";
            
            $secondHalfStart = Carbon::create($year, $month, 11)->format('Y-m-d');
            $secondHalfEnd = Carbon::create($year, $month, 25)->format('Y-m-d');
            $secondHalfCutoff = "$secondHalfStart to $secondHalfEnd";
            
            $hasFirstHalf = $periods->contains(function ($period) use ($firstHalfStart, $firstHalfEnd) {
                return $period->period_start->format('Y-m-d') === $firstHalfStart 
                    && $period->period_end->format('Y-m-d') === $firstHalfEnd;
            });
            
            $missingPeriod = $hasFirstHalf ? $secondHalfCutoff : $firstHalfCutoff;
        }

        // Aggregate payroll data for the month
        $employeeData = [];
        
        foreach ($periods as $period) {
            $payrolls = EmployeePayroll::where('period_id', $period->id)
                ->with('employee')
                ->get();

            foreach ($payrolls as $payroll) {
                $empId = $payroll->employee_id;
                
                if (!isset($employeeData[$empId])) {
                    $employeeData[$empId] = [
                        'employee' => $payroll->employee,
                        'totalGross' => 0,
                        'totalTax' => 0,
                    ];
                }
                
                $employeeData[$empId]['totalGross'] += (float) $payroll->gross_earning;
                
                // Calculate tax from deductions if stored
                $deductions = $payroll->deductions;
                if ($deductions) {
                    foreach ($deductions as $deduction) {
                        if ($deduction->deduction_type === 'Withholding Tax') {
                            $employeeData[$empId]['totalTax'] += (float) $deduction->deduction_pay;
                        }
                    }
                }
            }
        }

        // Calculate contributions based on type
        $rows = [];
        $index = 1;

        foreach ($employeeData as $empId => $data) {
            $employee = $data['employee'];
            $monthlyGross = $data['totalGross']; // Already aggregated from both periods

            $contribution = null;
            $govtId = '';

            switch ($validated['type']) {
                case 'sss':
                    $contribution = $this->calculateSssContribution($monthlyGross);
                    $govtId = $employee->sss_no ?? '';
                    break;
                case 'philhealth':
                    $contribution = $this->calculatePhilhealthContribution($monthlyGross);
                    $govtId = $employee->philhealth_no ?? '';
                    break;
                case 'pagibig':
                    $contribution = $this->calculatePagibigContribution($monthlyGross);
                    $govtId = $employee->pag_ibig_no ?? '';
                    break;
                case 'tin':
                    $govtId = $employee->tin_no ?? '';
                    break;
            }

            $nameParts = array_filter([
                trim((string) $employee->first_name),
                trim((string) $employee->middle_name),
                trim((string) $employee->last_name),
            ]);

            $rows[] = [
                'no' => $index++,
                'empId' => (string) $employee->id,
                'govtId' => $govtId,
                'lastName' => $employee->last_name ?? '',
                'firstName' => $employee->first_name ?? '',
                'middleName' => $employee->middle_name ?? '',
                'fullName' => implode(' ', $nameParts),
                'employeeContribution' => $contribution['employeeShare'] ?? 0,
                'employerContribution' => $contribution['employerShare'] ?? 0,
                'totalContribution' => $contribution['total'] ?? 0,
                'grossCompensation' => $validated['type'] === 'tin' ? round($monthlyGross, 2) : null,
                'taxWithheld' => $validated['type'] === 'tin' ? round($data['totalTax'], 2) : null,
            ];
        }

        return response()->json([
            'data' => $rows,
            'period' => [
                'year' => $year,
                'month' => $month,
                'monthName' => $startOfMonth->format('F Y'),
            ],
            'isProvisional' => $isProvisional,
            'missingPeriod' => $missingPeriod,
        ]);
    }

    /**
     * Finalize a contribution report
     */
    public function finalizeContribution(Request $request)
    {
        $validated = $request->validate([
            'type' => 'required|in:sss,philhealth,pagibig,tin',
            'year' => 'required|integer',
            'month' => 'required|integer|min:1|max:12',
            'payPeriod' => 'required|string',
            'headerData' => 'required|array',
            'columns' => 'required|array',
            'rows' => 'required|array',
        ]);

        $user = Auth::user();
        $generatedBy = $user ? $user->name : 'System';

        // Create or update finalized contribution
        $finalized = FinalizedContribution::updateOrCreate(
            [
                'type' => strtoupper($validated['type']),
                'year' => $validated['year'],
                'month' => $validated['month'],
            ],
            [
                'pay_period' => $validated['payPeriod'],
                'header_data' => $validated['headerData'],
                'columns' => $validated['columns'],
                'rows' => $validated['rows'],
                'generated_by' => $generatedBy,
            ]
        );

        return response()->json([
            'message' => 'Contribution report finalized successfully',
            'data' => $finalized,
        ]);
    }

    /**
     * Get all finalized contributions
     */
    public function getFinalizedContributions(Request $request)
    {
        $query = FinalizedContribution::query();

        // Optional filters
        if ($request->has('year')) {
            $query->where('year', $request->year);
        }
        if ($request->has('month')) {
            $query->where('month', $request->month);
        }
        if ($request->has('type')) {
            $query->where('type', strtoupper($request->type));
        }

        $finalized = $query->orderBy('year', 'desc')
            ->orderBy('month', 'desc')
            ->orderBy('type')
            ->get();

        return response()->json([
            'data' => $finalized,
        ]);
    }

    /**
     * Delete a finalized contribution
     */
    public function deleteFinalizedContribution($id)
    {
        $finalized = FinalizedContribution::findOrFail($id);
        $finalized->delete();

        return response()->json([
            'message' => 'Finalized contribution deleted successfully',
        ]);
    }
}

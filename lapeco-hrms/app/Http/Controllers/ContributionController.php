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
        if ($monthlySalary < 5000) {
            return [ 'employeeShare' => 0.0, 'employerShare' => 0.0, 'total' => 0.0 ];
        }
        $msc = min($monthlySalary, 30000);
        if ($msc < 30000) {
            $remainder = $msc % 500;
            $msc = $remainder < 250 ? $msc - $remainder : $msc - $remainder + 500;
        }
        $employeeShare = $msc * 0.05;
        $employerShare = $msc * 0.10;
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
        if ($monthlySalary < 10000) {
            return [ 'employeeShare' => 0.0, 'employerShare' => 0.0, 'total' => 0.0 ];
        }
        $rate = 0.05;
        $incomeCeiling = 100000;
        $baseSalary = min($monthlySalary, $incomeCeiling);
        $totalPremium = $baseSalary * $rate;
        return [
            'employeeShare' => round($totalPremium / 2, 2),
            'employerShare' => round($totalPremium / 2, 2),
            'total' => round($totalPremium, 2),
        ];
    }

    /**
     * Calculate Pag-IBIG contribution based on monthly salary
     */
    private function calculatePagibigContribution($monthlySalary)
    {
        if ($monthlySalary < 1500) {
            return [ 'employeeShare' => 0.0, 'employerShare' => 0.0, 'total' => 0.0 ];
        }
        $employeeShare = 100.0;
        $employerShare = 200.0;
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
            'month' => 'required|integer|min:0|max:11', 
            'type' => 'required|in:sss,philhealth,pagibig,tin',
        ]);

        $year = $validated['year'];
        $month = $validated['month'] + 1;

        // Get both payroll periods for this month
        $startOfMonth = Carbon::create($year, $month, 1)->startOfDay();
        $endOfMonth = Carbon::create($year, $month, 1)->endOfMonth()->endOfDay();

        $periods = PayrollPeriod::whereBetween('period_end', [$startOfMonth, $endOfMonth])->get();

        if ($periods->isEmpty()) {
            return response()->json([
                'message' => 'No payroll data found for this month. Generate the payroll first to view contributions.',
                'data' => [],
                'isProvisional' => false,
                'missingPeriod' => null,
            ], 404);
        }

        // Check if we have both payroll periods (should be 2 for a complete month)
        $isProvisional = $periods->count() < 2;
        $missingPeriod = null;

        if ($isProvisional) {
            $prevMonth = $month === 1 ? 12 : $month - 1;
            $prevMonthYear = $month === 1 ? $year - 1 : $year;

            $firstHalfStart = Carbon::create($prevMonthYear, $prevMonth, 26);
            $firstHalfEnd = Carbon::create($year, $month, 10);
            $secondHalfStart = Carbon::create($year, $month, 11);
            $secondHalfEnd = Carbon::create($year, $month, 25);

            $hasFirstHalf = $periods->contains(function ($period) use ($firstHalfEnd) {
                return Carbon::parse($period->period_end)->isSameDay($firstHalfEnd);
            });

            $hasSecondHalf = $periods->contains(function ($period) use ($secondHalfEnd) {
                return Carbon::parse($period->period_end)->isSameDay($secondHalfEnd);
            });

            if (!$hasFirstHalf) {
                $missingPeriod = $firstHalfStart->format('Y-m-d') . ' to ' . $firstHalfEnd->format('Y-m-d');
            } elseif (!$hasSecondHalf) {
                $missingPeriod = $secondHalfStart->format('Y-m-d') . ' to ' . $secondHalfEnd->format('Y-m-d');
            }
        }

        // Aggregate payroll data for the month
        $employeeData = [];
        
        foreach ($periods as $period) {
            $payrolls = EmployeePayroll::where('period_id', $period->id)
                ->with(['employee.position', 'statutoryRequirements'])
                ->get();

            foreach ($payrolls as $payroll) {
                $empId = $payroll->employee_id;
                
                if (!isset($employeeData[$empId])) {
                    // Resolve monthly salary for consistent statutory computation
                    $position = $payroll->employee?->position;
                    $monthlySalary = 0.0;
                    if ($position) {
                        if (!is_null($position->monthly_salary)) {
                            $monthlySalary = (float) $position->monthly_salary;
                        } elseif (!is_null($position->base_rate_per_hour)) {
                            $monthlySalary = (float) $position->base_rate_per_hour * 22 * 8;
                        }
                    }

                    $employeeData[$empId] = [
                        'employee' => $payroll->employee,
                        'monthlySalary' => $monthlySalary,
                        'totalGross' => 0.0,
                        'totalTax' => 0.0,
                        'sssEe' => 0.0,
                        'philEe' => 0.0,
                        'pagEe' => 0.0,
                    ];
                }
                
                // Sum actual gross earnings (for TIN and reference only)
                $semiGross = (float) $payroll->gross_earning;
                $employeeData[$empId]['totalGross'] += $semiGross;

                // Compute semi-monthly statutory from period earned gross so report matches modal
                $sss = $this->calculateSssContribution($semiGross * 2);
                $employeeData[$empId]['sssEe'] += round(($sss['employeeShare'] ?? 0.0) / 2, 2);

                $phil = $this->calculatePhilhealthContribution($semiGross * 2);
                $employeeData[$empId]['philEe'] += round(($phil['employeeShare'] ?? 0.0) / 2, 2);

                $pag = $this->calculatePagibigContribution($semiGross * 2);
                $employeeData[$empId]['pagEe'] += round(($pag['employeeShare'] ?? 0.0) / 2, 2);

                // Tax withheld from statutory requirements if present
                foreach ($payroll->statutoryRequirements as $req) {
                    if (strtolower($req->requirement_type) === 'tax') {
                        $employeeData[$empId]['totalTax'] += (float) $req->requirement_amount;
                    }
                }
            }
        }

        // Calculate contributions based on type
        $rows = [];
        $index = 1;

        foreach ($employeeData as $empId => $data) {
            $employee = $data['employee'];
            $monthlyGross = $data['totalGross'];
            $monthlyTax = $data['totalTax'];

            if ($isProvisional) {
                $monthlyGross *= 2;
                $monthlyTax *= 2;
            }

            $contribution = null;
            $govtId = '';

            switch ($validated['type']) {
                case 'sss':
                    // Reflect actual employee deductions from payroll; derive employer share via rule (10% vs 5%).
                    $ee = round($data['sssEe'], 2);
                    $contribution = [
                        'employeeShare' => $ee,
                        'employerShare' => round($ee * 2, 2),
                        'total' => round($ee * 3, 2),
                    ];
                    $govtId = $employee->sss_no ?? '';
                    break;
                case 'philhealth':
                    $ee = round($data['philEe'], 2);
                    $contribution = [
                        'employeeShare' => $ee,
                        'employerShare' => $ee,
                        'total' => round($ee * 2, 2),
                    ];
                    $govtId = $employee->philhealth_no ?? '';
                    break;
                case 'pagibig':
                    $ee = round($data['pagEe'], 2);
                    $contribution = [
                        'employeeShare' => $ee,
                        'employerShare' => round($ee * 2, 2),
                        'total' => round($ee * 3, 2),
                    ];
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
                'employeeContribution' => $contribution['employeeShare'] ?? 0.0,
                'employerContribution' => $contribution['employerShare'] ?? 0.0,
                'totalContribution' => $contribution['total'] ?? 0.0,
                'grossCompensation' => $validated['type'] === 'tin' ? round($monthlyGross, 2) : null,
                'taxWithheld' => $validated['type'] === 'tin' ? round($monthlyTax, 2) : null,
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

<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\PayrollPeriod;
use App\Models\EmployeePayroll;
use App\Models\PayrollEarning;
use App\Models\PayrollDeduction;
use App\Models\PayrollStatutoryRequirement;
use App\Models\User;
use App\Models\Resignation;
use Carbon\Carbon;

class PayrollSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $now = Carbon::now();

        // Generate payroll periods for the last three years (two periods per month)
        $periods = collect();
        for ($monthOffset = 0; $monthOffset < 36; $monthOffset++) {
            $baseDate = $now->copy()->subMonths($monthOffset)->startOfMonth();
            $periodYear = (int) $baseDate->year;

            $firstStart = $baseDate->copy()->toDateString();
            $firstEnd = $baseDate->copy()->addDays(14)->toDateString();
            $secondStart = $baseDate->copy()->addDays(15)->toDateString();
            $secondEnd = $baseDate->copy()->endOfMonth()->toDateString();

            $periods->push(
                PayrollPeriod::firstOrCreate(
                    ['period_start' => $firstStart, 'period_end' => $firstEnd],
                    ['period_year' => $periodYear]
                )
            );

            $periods->push(
                PayrollPeriod::firstOrCreate(
                    ['period_start' => $secondStart, 'period_end' => $secondEnd],
                    ['period_year' => $periodYear]
                )
            );
        }

        // Target employees with approved resignations effective today or earlier
        $resignedIds = Resignation::where('status', 'approved')
            ->whereDate('effective_date', '<=', Carbon::today())
            ->pluck('employee_id')
            ->unique()
            ->values();

        $targetEmployees = User::whereIn('id', $resignedIds)->get();
        if ($targetEmployees->isEmpty()) {
            // Fallback: seed a small sample of active employees
            $targetEmployees = User::where('account_status', 'Active')
                ->whereIn('employment_status', ['active', null])
                ->limit(10)
                ->get();
        }

        foreach ($periods as $period) {
            foreach ($targetEmployees as $employee) {
                $position = $employee->position;
                // Basic gross estimate: half-month of salary or 10 work days * base rate * 8 hours
                $baseRate = (float) ($position?->base_rate_per_hour ?? 0);
                $monthlySalary = (float) ($position?->monthly_salary ?? 0);
                $estimatedGross = $monthlySalary > 0
                    ? round($monthlySalary / 2, 2)
                    : round($baseRate * 8 * 10, 2);

                $statusOptions = ['Paid', 'Pending'];
                $paidStatus = $statusOptions[array_rand($statusOptions)];

                $payDate = Carbon::parse($period->period_end)->addDays(rand(0, 5));

                $payroll = EmployeePayroll::create([
                    'period_id' => $period->id,
                    'employee_id' => $employee->id,
                    'paid_status' => $paidStatus,
                    'pay_date' => $paidStatus === 'Paid' ? $payDate : null,
                    'gross_earning' => $estimatedGross,
                    'total_deductions' => 0, // will update after creating deductions
                    'absences_summary' => [],
                    'leave_balances_summary' => [],
                    'leave_earnings_summary' => [],
                ]);

                // Create a simple earning line
                $regularHours = $monthlySalary > 0 ? 0 : 80; // 10 days * 8 hours if hourly
                PayrollEarning::create([
                    'employees_payroll_id' => $payroll->id,
                    'earning_type' => $monthlySalary > 0 ? 'Regular Salary (Half-Month)' : 'Regular Hours',
                    'earning_hours' => $regularHours,
                    'earning_pay' => $estimatedGross,
                ]);

                $monthlyEquivalent = $monthlySalary > 0 ? $monthlySalary : ($baseRate * 22 * 8);
                $sssSemi = 0.0;
                if ($monthlyEquivalent >= 5000) {
                    $msc = min($monthlyEquivalent, 30000);
                    if ($msc < 30000) {
                        $remainder = $msc % 500;
                        $msc = $remainder < 250 ? $msc - $remainder : $msc - $remainder + 500;
                    }
                    $sssSemi = ($msc * 0.045) / 2;
                }

                $philSemi = 0.0;
                if ($monthlyEquivalent >= 10000) {
                    $base = min($monthlyEquivalent, 100000);
                    $totalPremium = $base * 0.05;
                    $philSemi = ($totalPremium / 2) / 2;
                }

                $pagibigSemi = $monthlyEquivalent >= 1500 ? 100.0 / 2 : 0.0;

                $taxableSemi = max(0, $estimatedGross - ($sssSemi + $philSemi + $pagibigSemi));
                $taxSemi = 0.0;
                if ($taxableSemi <= 10417) {
                    $taxSemi = 0.0;
                } elseif ($taxableSemi <= 16666) {
                    $taxSemi = ($taxableSemi - 10417) * 0.15;
                } elseif ($taxableSemi <= 33332) {
                    $taxSemi = 937.50 + ($taxableSemi - 16667) * 0.20;
                } elseif ($taxableSemi <= 83332) {
                    $taxSemi = 4270.70 + ($taxableSemi - 33333) * 0.25;
                } elseif ($taxableSemi <= 333332) {
                    $taxSemi = 16770.70 + ($taxableSemi - 83333) * 0.30;
                } else {
                    $taxSemi = 91770.70 + ($taxableSemi - 333333) * 0.35;
                }

                $statutory = [
                    'SSS' => round($sssSemi, 2),
                    'PhilHealth' => round($philSemi, 2),
                    'Pag-IBIG' => round($pagibigSemi, 2),
                    'Tax' => round(max(0, $taxSemi), 2),
                ];
                $totalStatutory = 0;
                foreach ($statutory as $type => $amount) {
                    PayrollStatutoryRequirement::create([
                        'employees_payroll_id' => $payroll->id,
                        'requirement_type' => $type,
                        'requirement_amount' => $amount,
                    ]);
                    $totalStatutory += $amount;
                }

                // Other deductions
                $otherDeductions = [
                    ['type' => 'Late', 'amount' => 150.00],
                    ['type' => 'Uniform', 'amount' => 0.00],
                ];
                $totalOther = 0;
                foreach ($otherDeductions as $d) {
                    if ($d['amount'] > 0) {
                        PayrollDeduction::create([
                            'employees_payroll_id' => $payroll->id,
                            'deduction_type' => $d['type'],
                            'deduction_pay' => $d['amount'],
                        ]);
                        $totalOther += $d['amount'];
                    }
                }

                // Update totals on payroll
                $payroll->total_deductions = round($totalStatutory + $totalOther, 2);
                $payroll->save();
            }
        }

        $this->command?->info('Payroll periods and records seeded for final pay display.');
    }
}
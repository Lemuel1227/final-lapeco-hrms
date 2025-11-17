<?php

namespace App\Http\Controllers;

use App\Models\EmployeePayroll;
use App\Models\Holiday;
use App\Models\Leave;
use App\Models\LeaveCredit;
use App\Models\Notification;
use App\Models\PayrollDeduction;
use App\Models\PayrollEarning;
use App\Models\PayrollPeriod;
use App\Models\PayrollStatutoryRequirement;
use App\Models\ScheduleAssignment;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Traits\LogsActivity;

class PayrollController extends Controller
{
    use LogsActivity;
    public function index()
    {
        // Lightweight summary endpoint - only basic period info
        $periods = PayrollPeriod::withCount('employeePayrolls')
            ->orderByDesc('period_start')
            ->get();
        
        $runs = $periods->map(function (PayrollPeriod $period) {
            // Load payroll records to decrypt and calculate totals
            // Note: Can't use SQL SUM() on encrypted fields
            $payrolls = EmployeePayroll::where('period_id', $period->id)
                ->select('gross_earning', 'total_deductions')
                ->get();

            // Calculate totals after decryption
            $totalGross = $payrolls->sum(function ($payroll) {
                return (float) ($payroll->gross_earning ?? 0);
            });
            
            $totalDeductions = $payrolls->sum(function ($payroll) {
                return (float) ($payroll->total_deductions ?? 0);
            });
            
            $totalNet = $totalGross - $totalDeductions;

            // Check if all are paid
            $isPaid = EmployeePayroll::where('period_id', $period->id)
                ->where('paid_status', '!=', 'Paid')
                ->count() === 0;

            return [
                'runId' => sprintf('PR-%05d', $period->id),
                'periodId' => $period->id,
                'cutOff' => $period->period_start->toDateString() . ' to ' . $period->period_end->toDateString(),
                'periodStart' => $period->period_start->toDateString(),
                'periodEnd' => $period->period_end->toDateString(),
                'totalNet' => round($totalNet, 2),
                'totalGross' => round($totalGross, 2),
                'totalDeductions' => round($totalDeductions, 2),
                'employeeCount' => $period->employee_payrolls_count,
                'isPaid' => $isPaid,
            ];
        })->values();

        return response()->json([
            'payroll_runs' => $runs,
        ]);
    }

    public function show($periodId)
    {
        $periods = PayrollPeriod::with([
            'employeePayrolls.employee.position',
            'employeePayrolls.earnings',
            'employeePayrolls.deductions',
        ])->orderByDesc('period_start')->get();

        $runs = $periods->map(function (PayrollPeriod $period) {
            $records = $period->employeePayrolls->map(function (EmployeePayroll $payroll) {
                $employee = $payroll->employee;

                $employeeName = $employee?->name;
                if (!$employeeName && $employee) {
                    $parts = array_filter([trim((string) $employee->first_name), trim((string) $employee->middle_name), trim((string) $employee->last_name)]);
                    $employeeName = trim(implode(' ', $parts)) ?: 'Unnamed Employee';
                }

                $earnings = $payroll->earnings->map(function (PayrollEarning $earning) {
                    return [
                        'description' => $earning->earning_type,
                        'hours' => (int) floor((float) $earning->earning_hours),
                        'amount' => (float) $earning->earning_pay,
                    ];
                })->values()->all();

                $deductions = [];
                foreach ($payroll->deductions as $deduction) {
                    $type = $deduction->deduction_type ?: 'Other';
                    $deductions[$type] = ($deductions[$type] ?? 0) + (float) $deduction->deduction_pay;
                }

                $grossFromEarnings = array_sum(array_column($earnings, 'amount'));
                $totalDeductions = array_sum($deductions);
                $netPay = round($grossFromEarnings - $totalDeductions, 2);

                return [
                    'payrollId' => $payroll->id,
                    'empId' => $employee->employee_id ?? (string) $employee?->id,
                    'employeeName' => $employeeName ?? 'Unknown Employee',
                    'position' => $employee?->position?->name,
                    'earnings' => $earnings,
                    'deductions' => $deductions,
                    'otherDeductions' => [],
                    'status' => $payroll->paid_status,
                    'paymentDate' => $payroll->pay_date?->toDateString(),
                    'grossEarning' => (float) $payroll->gross_earning,
                    'totalDeductionsAmount' => (float) $payroll->total_deductions,
                    'netPay' => $netPay,
                    'absences' => $payroll->absences_summary ?? [],
                    'leaveBalances' => $payroll->leave_balances_summary ?? [],
                    'leaveEarnings' => $payroll->leave_earnings_summary ?? [],
                ];
            })->values();

            $totalNet = $records->sum('netPay');
            $totalGross = $records->sum('grossEarning');

            return [
                'runId' => sprintf('PR-%05d', $period->id),
                'periodId' => $period->id,
                'cutOff' => $period->period_start->toDateString() . ' to ' . $period->period_end->toDateString(),
                'periodStart' => $period->period_start->toDateString(),
                'periodEnd' => $period->period_end->toDateString(),
                'records' => $records->all(),
                'totalNet' => round($totalNet, 2),
                'totalGross' => round($totalGross, 2),
            ];
        })->values();

        return response()->json([
            'payroll_runs' => $runs,
        ]);
    }

    public function showRunDetails($periodId)
    {
        // Eager-load all necessary relationships for efficiency
        $period = PayrollPeriod::with([
            'employeePayrolls.employee:id,first_name,middle_name,last_name',
        ])->findOrFail($periodId);

        $records = $period->employeePayrolls->map(function (EmployeePayroll $payroll) {
            $employee = $payroll->employee;
            $employeeName = $employee?->name;
            if (!$employeeName && $employee) {
                $parts = array_filter([trim((string) $employee->first_name), trim((string) $employee->middle_name), trim((string) $employee->last_name)]);
                $employeeName = trim(implode(' ', $parts)) ?: 'Unnamed Employee';
            }

            $gross = (float) $payroll->gross_earning;
            $deductions = (float) $payroll->total_deductions;
            $netPay = $gross - $deductions;

            return [
                'payrollId' => $payroll->id,
                'empId' => (string) $employee?->id,
                'employeeName' => $employeeName ?? 'Unknown Employee',
                'grossEarning' => $gross,
                'totalDeductionsAmount' => $deductions,
                'netPay' => round($netPay, 2),
                'status' => $payroll->paid_status,
                // For consistency, we can add empty arrays if details aren't stored directly
                'earnings' => $payroll->earnings_summary ?? [],
                'deductions' => $payroll->deductions_summary ?? [],
                'otherDeductions' => $payroll->other_deductions_summary ?? [],
            ];
        })->values();

        return response()->json([
            'runId' => sprintf('PR-%05d', $period->id),
            'periodId' => $period->id,
            'cutOff' => $period->period_start->toDateString() . ' to ' . $period->period_end->toDateString(),
            'records' => $records,
        ]);
    }

    public function showPayrollRecord($payrollId)
    {
        // Load full payroll details for adjustment modal
        $payroll = EmployeePayroll::with([
            'employee.position',
            'earnings',
            'deductions',
            'statutoryRequirements',
        ])->findOrFail($payrollId);

        $employee = $payroll->employee;
        $employeeName = $employee?->name;
        if (!$employeeName && $employee) {
            $parts = array_filter([trim((string) $employee->first_name), trim((string) $employee->middle_name), trim((string) $employee->last_name)]);
            $employeeName = trim(implode(' ', $parts)) ?: 'Unnamed Employee';
        }

        $earnings = $payroll->earnings->map(function (PayrollEarning $earning) {
            return [
                'description' => $earning->earning_type,
                'hours' => (int) floor((float) $earning->earning_hours),
                'amount' => (float) $earning->earning_pay,
            ];
        })->values()->all();

        // Separate statutory deductions from other deductions
        $statutoryDeductions = [
            'sss' => 0,
            'philhealth' => 0,
            'pagibig' => 0,
            'tax' => 0,
        ];
        
        $otherDeductions = [];
        
        // Get statutory requirements
        foreach ($payroll->statutoryRequirements as $requirement) {
            $type = strtolower($requirement->requirement_type);
            if ($type === 'sss') {
                $statutoryDeductions['sss'] = (float) $requirement->requirement_amount;
            } elseif ($type === 'philhealth') {
                $statutoryDeductions['philhealth'] = (float) $requirement->requirement_amount;
            } elseif ($type === 'pag-ibig') {
                $statutoryDeductions['pagibig'] = (float) $requirement->requirement_amount;
            } elseif ($type === 'tax') {
                $statutoryDeductions['tax'] = (float) $requirement->requirement_amount;
            }
        }
        
        // Get other deductions (non-statutory)
        foreach ($payroll->deductions as $deduction) {
            $otherDeductions[] = [
                'description' => $deduction->deduction_type,
                'amount' => (float) $deduction->deduction_pay,
            ];
        }

        $grossFromEarnings = array_sum(array_column($earnings, 'amount'));
        $totalDeductions = array_sum($statutoryDeductions) + array_sum(array_column($otherDeductions, 'amount'));
        $netPay = round($grossFromEarnings - $totalDeductions, 2);

        $period = $payroll->period;

        return response()->json([
            'payrollId' => $payroll->id,
            'empId' => (string) $employee?->id,
            'employeeName' => $employeeName ?? 'Unknown Employee',
            'position' => $employee?->position?->name,
            'positionId' => $employee?->position_id,
            'earnings' => $earnings,
            'deductions' => $statutoryDeductions,
            'otherDeductions' => $otherDeductions,
            'status' => $payroll->paid_status,
            'paymentDate' => $payroll->pay_date?->toDateString(),
            'grossEarning' => (float) $payroll->gross_earning,
            'totalDeductionsAmount' => (float) $payroll->total_deductions,
            'netPay' => $netPay,
            'absences' => $payroll->absences_summary ?? [],
            'leaveBalances' => $payroll->leave_balances_summary ?? [],
            'leaveEarnings' => $payroll->leave_earnings_summary ?? [],
            'cutOff' => $period->period_start->toDateString() . ' to ' . $period->period_end->toDateString(),
            // Employee details for Employee Info tab
            'employeeDetails' => [
                'id' => $employee?->id,
                'name' => $employeeName ?? 'Unknown Employee',
                'email' => $employee?->email,
                'tinNo' => $employee?->tin_no,
                'sssNo' => $employee?->sss_no,
                'philhealthNo' => $employee?->philhealth_no,
                'pagIbigNo' => $employee?->pag_ibig_no,
                'positionId' => $employee?->position_id,
                'position' => $employee?->position?->name,
                'status' => $employee?->account_status,
            ],
        ]);
    }

    public function generate(Request $request)
    {
        [$periodStart, $periodEnd, $label] = $this->resolvePayrollPeriod($request);

        $startDate = $periodStart->toDateString();
        $endDate = $periodEnd->toDateString();
        // Prevent regenerating the same payroll period unless it was deleted
        $existingPeriod = PayrollPeriod::where('period_start', $startDate)
            ->where('period_end', $endDate)
            ->first();

        if ($existingPeriod) {
            return response()->json([
                'message' => 'A payroll period for these dates already exists. Delete the period before generating again.',
                'period' => [
                    'id' => $existingPeriod->id,
                    'start' => $existingPeriod->period_start->toDateString(),
                    'end' => $existingPeriod->period_end->toDateString(),
                ],
            ], 409);
        }

        $result = DB::transaction(function () use ($periodStart, $startDate, $endDate) {
            $payrollPeriod = PayrollPeriod::create([
                'period_start' => $startDate,
                'period_end' => $endDate,
                'period_year' => $periodStart->year,
            ]);

            $assignments = ScheduleAssignment::with(['schedule', 'attendance', 'user.position'])
                ->whereHas('schedule', function ($query) use ($startDate, $endDate) {
                    $query->whereBetween('date', [$startDate, $endDate]);
                })
                ->get();

            $holidayMap = Holiday::whereBetween('date', [$startDate, $endDate])
                ->get()
                ->keyBy(function ($holiday) {
                    return Carbon::parse($holiday->date)->toDateString();
                });

            $grouped = $assignments->groupBy('user_id');

            $employeesProcessed = 0;
            $totalGross = 0;
            $totalDeductions = 0;

            foreach ($grouped as $employeeAssignments) {
                $summary = $this->processEmployeePayroll($payrollPeriod, $employeeAssignments, $holidayMap);

                if (!$summary) {
                    continue;
                }

                $employeesProcessed++;
                $totalGross += $summary['gross'];
                $totalDeductions += $summary['deductions'];
            }

            return [
                'period' => $payrollPeriod,
                'employees_processed' => $employeesProcessed,
                'total_gross' => $totalGross,
                'total_deductions' => $totalDeductions,
            ];
        });

        // Log activity
        $this->logCustomActivity('generate', "Generated payroll for {$label}", 'payroll', $result['period']->id, [
            'employees_processed' => $result['employees_processed'],
            'period_start' => $startDate,
            'period_end' => $endDate
        ]);
        
        return response()->json([
            'message' => 'Payroll generated successfully.',
            'period' => [
                'id' => $result['period']->id,
                'start' => $result['period']->period_start->toDateString(),
                'end' => $result['period']->period_end->toDateString(),
                'label' => $label,
            ],
            'totals' => [
                'employees' => $result['employees_processed'],
                'gross' => round($result['total_gross'], 2),
                'deductions' => round($result['total_deductions'], 2),
            ],
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $payroll = EmployeePayroll::findOrFail($id);
        
        $validated = $request->validate([
            'status' => 'sometimes|string|in:Pending,Paid,Failed',
            'earnings' => 'sometimes|array',
            'earnings.*.description' => 'required|string',
            'earnings.*.hours' => 'nullable',
            'earnings.*.amount' => 'required|numeric',
            'otherDeductions' => 'sometimes|array',
            'otherDeductions.*.description' => 'required|string',
            'otherDeductions.*.amount' => 'required|numeric',
            'deductions' => 'sometimes|array',
            'deductions.sss' => 'nullable|numeric',
            'deductions.philhealth' => 'nullable|numeric',
            'deductions.pagibig' => 'nullable|numeric',
            'deductions.tax' => 'nullable|numeric',
            'absences' => 'sometimes|array',
            'netPay' => 'sometimes|numeric',
        ]);

        // Update status if provided
        if (isset($validated['status'])) {
            $payroll->paid_status = $validated['status'];
            if ($validated['status'] === 'Paid' && !$payroll->pay_date) {
                $payroll->pay_date = now();
            }
        }

        // Calculate totals
        $grossEarning = 0;
        $totalDeductions = 0;

        // Update earnings
        if (isset($validated['earnings'])) {
            // Delete existing earnings
            $payroll->earnings()->delete();
            
            // Create new earnings
            foreach ($validated['earnings'] as $earning) {
                $payroll->earnings()->create([
                    'earning_type' => $earning['description'],
                    'earning_hours' => is_numeric($earning['hours']) ? $earning['hours'] : 0,
                    'earning_pay' => $earning['amount'],
                ]);
                $grossEarning += $earning['amount'];
            }
        }

        // Update other deductions
        if (isset($validated['otherDeductions'])) {
            // Delete existing non-statutory deductions
            $payroll->deductions()
                ->whereNotIn('deduction_type', ['SSS', 'PhilHealth', 'Pag-IBIG', 'Tax'])
                ->delete();
            
            // Create new other deductions
            foreach ($validated['otherDeductions'] as $deduction) {
                $payroll->deductions()->create([
                    'deduction_type' => $deduction['description'],
                    'deduction_pay' => $deduction['amount'],
                ]);
                $totalDeductions += $deduction['amount'];
            }
        }

        // Update statutory deductions
        if (isset($validated['deductions'])) {
            $statutoryTypes = [
                'sss' => 'SSS',
                'philhealth' => 'PhilHealth',
                'pagibig' => 'Pag-IBIG',
                'tax' => 'Tax',
            ];

            foreach ($statutoryTypes as $key => $type) {
                if (isset($validated['deductions'][$key])) {
                    $amount = $validated['deductions'][$key];
                    
                    // Update or create statutory requirement
                    $payroll->statutoryRequirements()->updateOrCreate(
                        ['requirement_type' => $type],
                        ['requirement_amount' => $amount]
                    );
                    
                    $totalDeductions += $amount;
                }
            }
        }

        // Update gross earning and total deductions
        if (isset($validated['earnings']) || isset($validated['otherDeductions']) || isset($validated['deductions'])) {
            // Recalculate from database if not all provided
            if (!isset($validated['earnings'])) {
                $grossEarning = $payroll->earnings()->get()->sum(function($e) {
                    return (float) $e->earning_pay;
                });
            }
            
            if (!isset($validated['otherDeductions']) || !isset($validated['deductions'])) {
                $totalDeductions = 0;
                $totalDeductions += $payroll->deductions()->get()->sum(function($d) {
                    return (float) $d->deduction_pay;
                });
                $totalDeductions += $payroll->statutoryRequirements()->get()->sum(function($s) {
                    return (float) $s->requirement_amount;
                });
            }

            $payroll->gross_earning = $grossEarning;
            $payroll->total_deductions = $totalDeductions;
        }

        // Update absences summary if provided
        if (isset($validated['absences'])) {
            $payroll->absences_summary = $validated['absences'];
        }

        $payroll->save();

        return response()->json([
            'message' => 'Payroll updated successfully',
            'payroll' => $payroll->load(['earnings', 'deductions', 'statutoryRequirements'])
        ]);
    }

    public function markPeriodAsPaid($periodId)
    {
        $period = PayrollPeriod::findOrFail($periodId);
        
        // Update all pending payroll records in this period to Paid
        $updated = EmployeePayroll::where('period_id', $periodId)
            ->where('paid_status', '!=', 'Paid')
            ->update([
                'paid_status' => 'Paid',
                'pay_date' => now(),
            ]);

        return response()->json([
            'message' => "Successfully marked {$updated} payroll records as paid",
            'updated_count' => $updated,
            'period' => [
                'id' => $period->id,
                'period_start' => $period->period_start->toDateString(),
                'period_end' => $period->period_end->toDateString(),
            ]
        ]);
    }

    public function backfillStatutoryForPeriod($periodId)
    {
        $period = PayrollPeriod::findOrFail($periodId);

        $payrolls = EmployeePayroll::where('period_id', $periodId)
            ->with(['employee.position', 'deductions', 'statutoryRequirements'])
            ->get();

        $updated = [];
        foreach ($payrolls as $payroll) {
            $position = $payroll->employee?->position;
            $monthlySalary = 0.0;
            if ($position) {
                if (!is_null($position->monthly_salary)) {
                    $monthlySalary = (float) $position->monthly_salary;
                } elseif (!is_null($position->base_rate_per_hour)) {
                    $monthlySalary = (float) $position->base_rate_per_hour * 22 * 8;
                }
            }

            if ($monthlySalary <= 0) {
                $updated[] = [
                    'payrollId' => $payroll->id,
                    'status' => 'skipped',
                    'reason' => 'missing_monthly_salary',
                ];
                continue;
            }

            $sssEe = 0.0;
            if ($monthlySalary >= 5000) {
                $msc = min($monthlySalary, 30000);
                if ($msc < 30000) {
                    $remainder = $msc % 500;
                    $msc = $remainder < 250 ? $msc - $remainder : $msc - $remainder + 500;
                }
                $sssEe = ($msc * 0.045) / 2;
            }

            $philEe = 0.0;
            if ($monthlySalary >= 10000) {
                $philBase = min($monthlySalary, 100000);
                $philTotal = $philBase * 0.05;
                $philEe = ($philTotal / 2) / 2;
            }

            $pagEe = 0.0;
            if ($monthlySalary >= 1500) {
                $pagEe = 100.0 / 2;
            }

            $taxableSemi = max(0, (float) $payroll->gross_earning - ($sssEe + $philEe + $pagEe));
            $tax = 0.0;
            if ($taxableSemi <= 10417) {
                $tax = 0.0;
            } elseif ($taxableSemi <= 16666) {
                $tax = ($taxableSemi - 10417) * 0.15;
            } elseif ($taxableSemi <= 33332) {
                $tax = 937.50 + ($taxableSemi - 16667) * 0.20;
            } elseif ($taxableSemi <= 83332) {
                $tax = 4270.70 + ($taxableSemi - 33333) * 0.25;
            } elseif ($taxableSemi <= 333332) {
                $tax = 16770.70 + ($taxableSemi - 83333) * 0.30;
            } else {
                $tax = 91770.70 + ($taxableSemi - 333333) * 0.35;
            }

            $payroll->statutoryRequirements()->updateOrCreate(
                ['requirement_type' => 'SSS'],
                ['requirement_amount' => round($sssEe, 2)]
            );
            $payroll->statutoryRequirements()->updateOrCreate(
                ['requirement_type' => 'PhilHealth'],
                ['requirement_amount' => round($philEe, 2)]
            );
            $payroll->statutoryRequirements()->updateOrCreate(
                ['requirement_type' => 'Pag-IBIG'],
                ['requirement_amount' => round($pagEe, 2)]
            );
            $payroll->statutoryRequirements()->updateOrCreate(
                ['requirement_type' => 'Tax'],
                ['requirement_amount' => round(max(0, $tax), 2)]
            );

            $other = $payroll->deductions()->get()->sum(function ($d) {
                return (float) $d->deduction_pay;
            });
            $statutory = $payroll->statutoryRequirements()->get()->sum(function ($s) {
                return (float) $s->requirement_amount;
            });
            $payroll->total_deductions = round($other + $statutory, 2);
            $payroll->save();

            $updated[] = [
                'payrollId' => $payroll->id,
                'status' => 'updated',
                'sss' => round($sssEe, 2),
                'philhealth' => round($philEe, 2),
                'pagibig' => round($pagEe, 2),
                'tax' => round(max(0, $tax), 2),
                'totalDeductions' => $payroll->total_deductions,
            ];
        }

        return response()->json([
            'message' => 'Backfill complete',
            'period' => [
                'id' => $period->id,
                'period_start' => $period->period_start->toDateString(),
                'period_end' => $period->period_end->toDateString(),
            ],
            'results' => $updated,
        ]);
    }
    public function deletePeriod($periodId)
    {
        $period = PayrollPeriod::findOrFail($periodId);
        
        // Delete all related payroll records first
        $employeePayrolls = EmployeePayroll::where('period_id', $periodId)->get();
        
        foreach ($employeePayrolls as $payroll) {
            // Delete related earnings
            PayrollEarning::where('employees_payroll_id', $payroll->id)->delete();
            
            // Delete related deductions
            PayrollDeduction::where('employees_payroll_id', $payroll->id)->delete();
            
            // Delete related statutory requirements
            PayrollStatutoryRequirement::where('employees_payroll_id', $payroll->id)->delete();
            
            // Delete the employee payroll record
            $payroll->delete();
        }
        
        // Delete the period itself
        $period->delete();
        
        // Log activity
        $this->logDelete('payroll_period', $periodId, "Payroll period {$period->period_start->toDateString()} to {$period->period_end->toDateString()}");

        return response()->json([
            'message' => 'Payroll period deleted successfully',
        ]);
    }

    public function compute(Request $request): JsonResponse
    {
        [$periodStart, $periodEnd, $label] = $this->resolvePayrollPeriod($request);

        $startDate = $periodStart->toDateString();
        $endDate = $periodEnd->toDateString();

        $assignments = ScheduleAssignment::with(['schedule', 'attendance', 'user.position'])
            ->whereHas('schedule', function ($query) use ($startDate, $endDate) {
                $query->whereBetween('date', [$startDate, $endDate]);
            })
            ->get();

        $employees = $assignments
            ->groupBy('user_id')
            ->map(function ($employeeAssignments) {
                $firstAssignment = $employeeAssignments->first();
                $user = $firstAssignment->user;
                $position = $user?->position;
                $baseRate = $this->resolveBaseHourlyRate($position);
                $overtimeRate = $this->resolveOvertimeRate($position, $baseRate);

                $gross = 0;
                $breakdown = [];

                $sortedAssignments = $employeeAssignments->sortBy(function ($assignment) {
                    $date = $assignment->schedule?->date;
                    if ($date instanceof Carbon) {
                        return $date->timestamp;
                    }

                    return Carbon::parse($date)->timestamp;
                });

                foreach ($sortedAssignments as $assignment) {
                    $schedule = $assignment->schedule;
                    if (!$schedule) {
                        continue;
                    }

                    $scheduleDate = $schedule->date instanceof Carbon ? $schedule->date->copy() : Carbon::parse($schedule->date);
                    $scheduledHours = $this->calculateScheduledHours($assignment->start_time, $assignment->end_time);
                    $attendance = $assignment->attendance;
                    $status = $this->determineAttendanceStatus($attendance, $scheduleDate);
                    $attendedHours = $this->calculateAttendanceHours($attendance);
                    $overtimeHours = $this->calculateOvertimeHours($assignment->ot_hours, $attendedHours, $scheduledHours);
                    $regularHours = min($attendedHours, $scheduledHours);

                    $dailyPay = 0;
                    $regularPay = 0;
                    $overtimePay = 0;

                    // Only calculate pay for Present or Late statuses
                    if (in_array($status, ['Present', 'Late'])) {
                        $regularPay = $baseRate * $regularHours;
                        $overtimePay = $overtimeRate * $overtimeHours;
                        $dailyPay = round($regularPay + $overtimePay, 2);
                        $gross += $dailyPay;
                    }

                    $breakdown[] = [
                        'date' => $scheduleDate->toDateString(),
                        'status' => $status,
                        'scheduled_hours' => max((int) floor($scheduledHours), 0),
                        'attended_hours' => max((int) floor($attendedHours), 0),
                        'overtime_hours' => max((int) floor($overtimeHours), 0),
                        'pay' => $dailyPay,
                        'base_rate' => $baseRate,
                        'overtime_rate' => $overtimeRate,
                        'regular_pay' => $regularPay,
                        'overtime_pay' => $overtimePay
                    ];
                }

                return [
                    'employee_id' => $user->id,
                    'employee_name' => $user->name,
                    'position' => $position?->name,
                    'gross_pay' => round($gross, 2),
                    'daily_breakdown' => $breakdown,
                ];
            })
            ->values();

        $payload = [
            'period' => [
                'start' => $startDate,
                'end' => $endDate,
                'label' => $label,
            ],
            'employees' => $employees,
            'total_gross' => round($employees->sum('gross_pay'), 2),
        ];

        return response()->json($payload);
    }

    public function myProjection(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user) {
            abort(401, 'Unauthenticated.');
        }

        $year = (int) $request->input('year', now()->year);
        $month = (int) $request->input('month', now()->month - 1);
        $periodCode = (string) $request->input('period', '1');

        [$start, $end, $label] = $this->resolveProjectionPeriod($year, $month, $periodCode);

        $position = $user->position;

        if (!$position) {
            return response()->json([
                'period' => [
                    'year' => $year,
                    'month' => $month,
                    'period' => $periodCode,
                    'start' => $start->toDateString(),
                    'end' => $end->toDateString(),
                    'label' => $label,
                ],
                'projection' => null,
            ]);
        }

        $assignments = ScheduleAssignment::with(['schedule', 'attendance'])
            ->where('user_id', $user->id)
            ->whereNotNull('schedule_id')
            ->whereHas('schedule', function ($query) use ($start, $end) {
                $query->whereBetween('date', [$start->toDateString(), $end->toDateString()]);
            })
            ->get();

        $holidayMap = Holiday::whereBetween('date', [$start->toDateString(), $end->toDateString()])
            ->get()
            ->keyBy(fn ($holiday) => Carbon::parse($holiday->date)->toDateString());

        $baseRate = $this->resolveBaseHourlyRate($position);
        $overtimeRate = $this->resolveOvertimeRate($position, $baseRate);
        $today = now()->endOfDay();

        $totalGross = 0.0;
        $breakdown = [];

        $sortedAssignments = $assignments->sortBy(function ($assignment) {
            $date = $assignment->schedule?->date;

            if ($date instanceof Carbon) {
                return $date->timestamp;
            }

            return Carbon::parse($date)->timestamp;
        })->values();

        foreach ($sortedAssignments as $assignment) {
            $schedule = $assignment->schedule;

            if (!$schedule) {
                continue;
            }

            $scheduleDate = $schedule->date instanceof Carbon ? $schedule->date->copy() : Carbon::parse($schedule->date);

            if ($scheduleDate->greaterThan($today)) {
                continue;
            }

            $attendance = $assignment->attendance;
            $scheduledHours = $this->calculateScheduledHours($assignment->start_time, $assignment->end_time);
            $attendedHours = $this->calculateAttendanceHours($attendance);
            $overtimeHours = $this->calculateOvertimeHours($assignment->ot_hours, $attendedHours, $scheduledHours);
            $regularHours = max(min($attendedHours, $scheduledHours), 0);

            [$regularMultiplier, $overtimeMultiplier] = $this->resolveEarningConfiguration($scheduleDate, $holidayMap);

            $regularPay = $regularHours > 0 ? round($regularHours * $baseRate * $regularMultiplier, 2) : 0.0;
            $overtimePay = $overtimeHours > 0 ? round($overtimeHours * $overtimeRate * $overtimeMultiplier, 2) : 0.0;
            $nightHours = $this->calculateNightDifferentialHours($scheduleDate, $attendance);
            $nightPay = $nightHours > 0 ? round($nightHours * $baseRate * 0.10, 2) : 0.0;

            $dailyPay = $regularPay + $overtimePay + $nightPay;
            $totalGross += $dailyPay;

            $holiday = $holidayMap->get($scheduleDate->toDateString());
            $status = $this->determineAttendanceStatus($attendance, $scheduleDate);

            $breakdown[] = [
                'date' => $scheduleDate->toDateString(),
                'status' => $status,
                'pay' => round($dailyPay, 2),
                'scheduledHours' => max((int) floor($scheduledHours), 0),
                'attendedHours' => max((int) floor($attendedHours), 0),
                'overtimeHours' => max((int) floor($overtimeHours), 0),
                'holidayType' => $holiday?->type,
            ];
        }

        $breakdown = collect($breakdown)->sortBy('date')->values()->all();

        return response()->json([
            'period' => [
                'year' => $year,
                'month' => $month,
                'period' => $periodCode,
                'start' => $start->toDateString(),
                'end' => $end->toDateString(),
                'label' => $label,
            ],
            'projection' => [
                'totalGross' => round($totalGross, 2),
                'breakdown' => $breakdown,
                'cutOff' => $label,
            ],
        ]);
    }

    protected function resolveProjectionPeriod(int $year, int $zeroBasedMonth, string $periodCode): array
    {
        $normalizedMonth = max(0, min(11, $zeroBasedMonth));

        $reference = Carbon::create($year, $normalizedMonth + 1, 1, 0, 0, 0)->startOfDay();

        if ($periodCode === '1') {
            $start = $reference->copy()->subMonthNoOverflow()->day(26)->startOfDay();
            $end = $reference->copy()->day(10)->endOfDay();
        } else {
            $start = $reference->copy()->day(11)->startOfDay();
            $end = $reference->copy()->day(25)->endOfDay();
        }

        if ($end->lessThan($start)) {
            abort(422, 'Unable to resolve projection period.');
        }

        return [$start, $end, $start->toDateString() . ' to ' . $end->toDateString()];
    }

    protected function resolvePayrollPeriod(Request $request): array
    {
        if ($request->filled('start_date') && $request->filled('end_date')) {
            $start = Carbon::parse($request->input('start_date'))->startOfDay();
            $end = Carbon::parse($request->input('end_date'))->endOfDay();

            if ($end->lessThan($start)) {
                abort(422, 'The end date must be after the start date.');
            }

            return [$start, $end, $start->toDateString() . ' to ' . $end->toDateString()];
        }

        $reference = $request->filled('reference_date') ? Carbon::parse($request->input('reference_date'))->startOfDay() : now()->startOfDay();
        $periodType = $request->input('period_type');

        if ($periodType === 'first') {
            $start = $reference->copy()->startOfMonth()->day(11);
            $end = $reference->copy()->startOfMonth()->day(15);
        } elseif ($periodType === 'second') {
            if ($reference->day <= 10) {
                $start = $reference->copy()->subMonthNoOverflow()->day(26);
                $end = $reference->copy()->day(10);
            } else {
                $start = $reference->copy()->day(26);
                $end = $reference->copy()->addMonthNoOverflow()->day(10);
            }
        } else {
            if ($reference->day >= 26 || $reference->day <= 10) {
                if ($reference->day <= 10) {
                    $start = $reference->copy()->subMonthNoOverflow()->day(26);
                    $end = $reference->copy()->day(10);
                } else {
                    $start = $reference->copy()->day(26);
                    $end = $reference->copy()->addMonthNoOverflow()->day(10);
                }
            } else {
                $start = $reference->copy()->startOfMonth()->day(11);
                $end = $reference->copy()->startOfMonth()->day(15);
            }
        }

        $start = $start->startOfDay();
        $end = $end->endOfDay();

        if ($end->lessThan($start)) {
            abort(422, 'Unable to resolve payroll period.');
        }

        return [$start, $end, $start->toDateString() . ' to ' . $end->toDateString()];
    }

    protected function resolveBaseHourlyRate($position): float
    {
        if (!$position) {
            return 0.0;
        }

        if (!is_null($position->base_rate_per_hour)) {
            return (float) $position->base_rate_per_hour;
        }

        if (!is_null($position->monthly_salary)) {
            return round((float) $position->monthly_salary / (22 * 8), 2);
        }

        return 0.0;
    }

    protected function resolveOvertimeRate($position, float $baseRate): float
    {
        if ($position && !is_null($position->overtime_rate_per_hour)) {
            return (float) $position->overtime_rate_per_hour;
        }

        return round($baseRate, 2);
    }

    protected function calculateScheduledHours(?string $start, ?string $end): float
    {
        $startTime = $this->parseTime($start);
        $endTime = $this->parseTime($end);

        if (!$startTime || !$endTime) {
            return 0.0;
        }

        if ($endTime->lessThanOrEqualTo($startTime)) {
            $endTime->addDay();
        }

        return round($startTime->diffInMinutes($endTime) / 60, 2);
    }

    protected function calculateAttendanceHours($attendance): float
    {
        if (!$attendance || !$attendance->sign_in || !$attendance->sign_out) {
            return 0.0;
        }

        $signIn = $this->combineDateWithTime($attendance->sign_in, $attendance->scheduleAssignment?->schedule?->date);
        $signOut = $this->combineDateWithTime($attendance->sign_out, $attendance->scheduleAssignment?->schedule?->date);

        if (!$signIn || !$signOut) {
            return 0.0;
        }

        if ($signOut->lessThanOrEqualTo($signIn)) {
            $signOut->addDay();
        }

        $minutes = $signIn->diffInMinutes($signOut);

        return max(round($minutes / 60, 2), 0);
    }

    protected function calculateOvertimeHours($recordedOvertime, float $attendedHours, float $scheduledHours): float
    {
        $overtime = is_null($recordedOvertime) ? 0.0 : (float) $recordedOvertime;

        if ($attendedHours <= 0) {
            return 0.0;
        }

        if ($attendedHours > $scheduledHours && $scheduledHours > 0) {
            $overtime += $attendedHours - $scheduledHours;
        }

        return max(round($overtime, 2), 0);
    }

    protected function determineAttendanceStatus($attendance, Carbon $scheduleDate): string
    {
        if ($attendance && $attendance->sign_in) {
            $status = $attendance->calculated_status ?? $attendance->status ?? 'Present';
            return ucfirst($status);
        }

        $today = now()->toDateString();

        if ($scheduleDate->toDateString() > $today) {
            return 'Scheduled';
        }

        return 'Absent';
    }

    protected function parseTime($value): ?Carbon
    {
        if (!$value) {
            return null;
        }

        if ($value instanceof Carbon) {
            return $value->copy();
        }

        if ($value instanceof \DateTimeInterface) {
            return Carbon::instance($value);
        }

        foreach (['H:i:s', 'H:i'] as $format) {
            try {
                return Carbon::createFromFormat($format, (string) $value);
            } catch (\Throwable $exception) {
            }
        }

        try {
            return Carbon::parse((string) $value);
        } catch (\Throwable $exception) {
            return null;
        }
    }

    protected function processEmployeePayroll(PayrollPeriod $period, $employeeAssignments, $holidayMap): ?array
    {
        $employeeAssignments = $employeeAssignments->filter(function ($assignment) {
            return $assignment->user !== null;
        });

        if ($employeeAssignments->isEmpty()) {
            return null;
        }

        $firstAssignment = $employeeAssignments->first();
        $user = $firstAssignment->user;
        $position = $user?->position;

        $baseRate = $this->resolveBaseHourlyRate($position);
        $overtimeRate = $this->resolveOvertimeRate($position, $baseRate);

        $earnings = [];
        $gross = 0.0;
        $totalLateMinutes = 0;
        $absencesSummary = [];

        $sortedAssignments = $employeeAssignments->sortBy(function ($assignment) {
            $date = $assignment->schedule?->date;

            if ($date instanceof Carbon) {
                return $date->timestamp;
            }

            return Carbon::parse($date)->timestamp;
        });

        foreach ($sortedAssignments as $assignment) {
            $schedule = $assignment->schedule;

            if (!$schedule) {
                continue;
            }

            $attendance = $assignment->attendance;
            $scheduledHours = $this->calculateScheduledHours($assignment->start_time, $assignment->end_time);
            $attendedHours = $this->calculateAttendanceHours($attendance);
            $overtimeHours = $this->calculateOvertimeHours($assignment->ot_hours, $attendedHours, $scheduledHours);
            $regularHours = max(min($attendedHours, $scheduledHours), 0);

            $scheduleDate = $schedule->date instanceof Carbon ? $schedule->date->copy() : Carbon::parse($schedule->date);

            // Track absences
            if ($regularHours <= 0 && $overtimeHours <= 0) {
                $absencesSummary[] = [
                    'description' => 'Unexcused',
                    'startDate' => $scheduleDate->toDateString(),
                    'endDate' => $scheduleDate->toDateString(),
                    'totalDays' => 1,
                ];
                continue;
            }

            [$regularMultiplier, $overtimeMultiplier, $regularType, $overtimeType] = $this->resolveEarningConfiguration($scheduleDate, $holidayMap);

            if ($regularHours > 0) {
                $regularPay = round($regularHours * $baseRate * $regularMultiplier, 2);
                $this->addEarning($earnings, $regularType, $regularHours, $regularPay);
                $gross += $regularPay;
            }

            if ($overtimeHours > 0) {
                $overtimePay = round($overtimeHours * $overtimeRate * $overtimeMultiplier, 2);
                $this->addEarning($earnings, $overtimeType, $overtimeHours, $overtimePay);
                $gross += $overtimePay;
            }

            $nightHours = $this->calculateNightDifferentialHours($scheduleDate, $attendance);
            if ($nightHours > 0) {
                $nightPay = round($nightHours * $baseRate * 0.10, 2);
                $this->addEarning($earnings, 'Night Differential Pay', $nightHours, $nightPay);
                $gross += $nightPay;
            }

            $totalLateMinutes += $this->calculateLateMinutes($scheduleDate, $assignment->start_time, $attendance);
        }

        if ($totalLateMinutes < 0) {
            $totalLateMinutes = 0;
        }

        if ($gross <= 0 && $totalLateMinutes <= 0) {
            return null;
        }

        // Fetch approved paid leaves for this period
        $approvedLeaves = Leave::where('user_id', $user->id)
            ->where('status', 'Approved')
            ->whereBetween('date_from', [$period->period_start, $period->period_end])
            ->get();

        // Fetch leave credits for the current year
        $currentYear = $period->period_start->year;
        $leaveCredits = LeaveCredit::where('user_id', $user->id)
            ->where('year', $currentYear)
            ->get()
            ->keyBy('leave_type');

        $leaveBalancesSummary = [];
        foreach (['Vacation Leave', 'Sick Leave'] as $leaveType) {
            $credit = $leaveCredits->get($leaveType);
            $totalCredits = $credit ? $credit->total_credits : 0;
            $usedCredits = $credit ? $credit->used_credits : 0;
            $leaveBalancesSummary[$leaveType] = [
                'total' => $totalCredits,
                'used' => $usedCredits,
                'remaining' => max(0, $totalCredits - $usedCredits),
            ];
        }

        // Compute leave earnings from approved leaves
        $leaveEarningsSummary = [];
        $leavePay = 0.0;
        $dailyRate = $baseRate * 8; // 8 hours per day

        foreach ($approvedLeaves as $leave) {
            if (in_array($leave->type, ['Unpaid Leave', 'Paternity Leave'])) {
                continue;
            }

            $leaveDays = $leave->days ?? 1;
            $leaveAmount = round($leaveDays * $dailyRate, 2);
            $leavePay += $leaveAmount;
            $leavePayHours = $leaveDays * 8;

            $leaveEarningsSummary[] = [
                'type' => $leave->type,
                'days' => $leaveDays,
                'amount' => $leaveAmount,
            ];
        }

        // Add leave pay to earnings if any
        if ($leavePay > 0) {
            $this->addEarning($earnings, 'Leave Pay', $leavePayHours, $leavePay);
            $gross += $leavePay;
        }

        $lateRate = $position?->late_deduction_per_minute ?? 0;
        $lateDeduction = round($totalLateMinutes * abs((float) $lateRate), 2);

        $totalDeductions = $lateDeduction;

        $employeePayroll = EmployeePayroll::create([
            'period_id' => $period->id,
            'employee_id' => $user->id,
            'paid_status' => 'Pending',
            'pay_date' => null,
            'gross_earning' => round($gross, 2),
            'total_deductions' => round($totalDeductions, 2),
            'absences_summary' => $absencesSummary,
            'leave_balances_summary' => $leaveBalancesSummary,
            'leave_earnings_summary' => $leaveEarningsSummary,
        ]);

        foreach ($earnings as $type => $data) {
            PayrollEarning::create([
                'employees_payroll_id' => $employeePayroll->id,
                'earning_type' => $type,
                'earning_hours' => round($data['hours'], 2),
                'earning_pay' => round($data['pay'], 2),
            ]);
        }

        if ($lateDeduction > 0) {
            PayrollDeduction::create([
                'employees_payroll_id' => $employeePayroll->id,
                'deduction_type' => 'Late',
                'deduction_pay' => $lateDeduction,
            ]);
        }

        $monthlySalary = (float) ($position?->monthly_salary ?? 0);
        if ($monthlySalary > 0) {
            $sssEe = 0.0;
            if ($monthlySalary >= 5000) {
                $msc = min($monthlySalary, 30000);
                if ($msc < 30000) {
                    $remainder = $msc % 500;
                    $msc = $remainder < 250 ? $msc - $remainder : $msc - $remainder + 500;
                }
                $sssEe = ($msc * 0.045) / 2;
            }
            $philEe = 0.0;
            if ($monthlySalary >= 10000) {
                $philBase = min($monthlySalary, 100000);
                $philTotal = $philBase * 0.05;
                $philEe = ($philTotal / 2) / 2;
            }
            $pagEe = 0.0;
            if ($monthlySalary >= 1500) {
                $pagEe = 100.0 / 2;
            }
            $taxableSemi = max(0, $gross - ($sssEe + $philEe + $pagEe));
            $tax = 0.0;
            if ($taxableSemi <= 10417) {
                $tax = 0.0;
            } elseif ($taxableSemi <= 16666) {
                $tax = ($taxableSemi - 10417) * 0.15;
            } elseif ($taxableSemi <= 33332) {
                $tax = 937.50 + ($taxableSemi - 16667) * 0.20;
            } elseif ($taxableSemi <= 83332) {
                $tax = 4270.70 + ($taxableSemi - 33333) * 0.25;
            } elseif ($taxableSemi <= 333332) {
                $tax = 16770.70 + ($taxableSemi - 83333) * 0.30;
            } else {
                $tax = 91770.70 + ($taxableSemi - 333333) * 0.35;
            }
            PayrollStatutoryRequirement::updateOrCreate(
                ['employees_payroll_id' => $employeePayroll->id, 'requirement_type' => 'SSS'],
                ['requirement_amount' => round($sssEe, 2)]
            );
            PayrollStatutoryRequirement::updateOrCreate(
                ['employees_payroll_id' => $employeePayroll->id, 'requirement_type' => 'PhilHealth'],
                ['requirement_amount' => round($philEe, 2)]
            );
            PayrollStatutoryRequirement::updateOrCreate(
                ['employees_payroll_id' => $employeePayroll->id, 'requirement_type' => 'Pag-IBIG'],
                ['requirement_amount' => round($pagEe, 2)]
            );
            PayrollStatutoryRequirement::updateOrCreate(
                ['employees_payroll_id' => $employeePayroll->id, 'requirement_type' => 'Tax'],
                ['requirement_amount' => round(max(0, $tax), 2)]
            );
            $totalDeductions += round($sssEe + $philEe + $pagEe + max(0, $tax), 2);
            $employeePayroll->total_deductions = round($totalDeductions, 2);
            $employeePayroll->save();
        }

        // Create notification for the employee
        $netPay = round($gross - $totalDeductions, 2);
        Notification::createForUser(
            $user->id,
            'payroll_generated',
            'Payroll Generated',
            sprintf(
                'Your payroll for the period %s to %s has been generated. Net Pay: ₱%s',
                $period->period_start->format('M d, Y'),
                $period->period_end->format('M d, Y'),
                number_format($netPay, 2)
            ),
            [
                'period_id' => $period->id,
                'payroll_id' => $employeePayroll->id,
                'period_start' => $period->period_start->toDateString(),
                'period_end' => $period->period_end->toDateString(),
                'gross_earning' => round($gross, 2),
                'total_deductions' => round($totalDeductions, 2),
                'net_pay' => $netPay,
                'action_url' => '/dashboard/my-payroll/history'
            ]
        );

        return [
            'employee_id' => $user->id,
            'gross' => $gross,
            'deductions' => $totalDeductions,
        ];
    }

    protected function resolveEarningConfiguration(Carbon $scheduleDate, $holidayMap): array
    {
        $key = $scheduleDate->toDateString();

        if ($holidayMap->has($key)) {
            $holiday = $holidayMap->get($key);
            $type = strtoupper((string) $holiday->type);

            if ($type === 'REGULAR') {
                return [2.0, 2.0, 'Regular Holiday Pay', 'Regular Holiday Pay OT'];
            }

            return [1.3, 1.3, 'Special Holiday Pay', 'Special Holiday Pay OT'];
        }

        return [1.0, 1.0, 'Regular Hours', 'Overtime Pay'];
    }

    protected function calculateNightDifferentialHours(Carbon $scheduleDate, $attendance): float
    {
        if (!$attendance || !$attendance->sign_in || !$attendance->sign_out) {
            return 0.0;
        }

        $workStart = $this->combineDateWithTime($attendance->sign_in, $scheduleDate);
        $workEnd = $this->combineDateWithTime($attendance->sign_out, $scheduleDate);

        if (!$workStart || !$workEnd) {
            return 0.0;
        }

        // Handle overnight shifts (e.g., 10 PM to 6 AM)
        if ($workEnd->lessThanOrEqualTo($workStart)) {
            $workEnd->addDay();
        }

        // Create night period (10 PM to 6 AM)
        $nightStart = Carbon::parse($scheduleDate->toDateString() . ' 22:00');
        $nightEnd = Carbon::parse($scheduleDate->toDateString() . ' 06:00')->addDay();

        // Calculate total work duration in minutes
        $totalWorkMinutes = $workStart->diffInMinutes($workEnd);
        
        // If shift is entirely within night hours, return full duration
        if ($workStart->greaterThanOrEqualTo($nightStart) && $workEnd->lessThanOrEqualTo($nightEnd)) {
            return round($totalWorkMinutes / 60, 2);
        }

        // Calculate overlap between work hours and night hours
        $overlapStart = $workStart->copy()->max($nightStart);
        $overlapEnd = $workEnd->copy()->min($nightEnd);
        
        // If there's an overlap, calculate the minutes
        $nightMinutes = 0;
        if ($overlapStart->lessThan($overlapEnd)) {
            $nightMinutes = $overlapStart->diffInMinutes($overlapEnd);
        }

        // Handle break time if it exists
        if ($attendance->break_out && $attendance->break_in) {
            $breakStart = $this->combineDateWithTime($attendance->break_out, $scheduleDate);
            $breakEnd = $this->combineDateWithTime($attendance->break_in, $scheduleDate);

            if ($breakStart && $breakEnd) {
                if ($breakEnd->lessThanOrEqualTo($breakStart)) {
                    $breakEnd->addDay();
                }
                
                // Calculate break overlap with night hours
                $breakOverlapStart = $breakStart->copy()->max($nightStart);
                $breakOverlapEnd = $breakEnd->copy()->min($nightEnd);
                
                if ($breakOverlapStart->lessThan($breakOverlapEnd)) {
                    $nightMinutes -= $breakOverlapStart->diffInMinutes($breakOverlapEnd);
                }
            }
        }

        $nightMinutes = max(min($nightMinutes, $totalWorkMinutes), 0);

        return round($nightMinutes / 60, 2);
    }

    protected function calculateLateMinutes(Carbon $scheduleDate, ?string $scheduledStart, $attendance): int
    {
        if (!$scheduledStart || !$attendance || !$attendance->sign_in) {
            return 0;
        }

        $scheduledTime = Carbon::parse($scheduleDate->toDateString() . ' ' . $scheduledStart);
        $signInTime = $this->combineDateWithTime($attendance->sign_in, $scheduleDate) ?? $scheduledTime;

        $diffMinutes = $scheduledTime->diffInMinutes($signInTime, false);

        if ($diffMinutes <= 0) {
            return 0;
        }

        return $diffMinutes;
    }

    protected function addEarning(array &$earnings, string $type, float $hours, float $pay): void
    {
        if (isset($earnings[$type])) {
            $earnings[$type]['hours'] += $hours;
            $earnings[$type]['pay'] += $pay;
            return;
        }

        if (!isset($earnings[$type])) {
            $earnings[$type] = ['hours' => 0.0, 'pay' => 0.0];
        }

        $earnings[$type]['hours'] += $hours;
        $earnings[$type]['pay'] += $pay;
    }

    protected function extractTimeComponent($value): ?string
    {
        if (!$value) {
            return null;
        }

        if ($value instanceof Carbon) {
            return $value->format('H:i:s');
        }

        if ($value instanceof \DateTimeInterface) {
            return Carbon::instance($value)->format('H:i:s');
        }

        $stringValue = trim((string) $value);

        if (preg_match('/^\d{4}-\d{2}-\d{2}\s+(.+)$/', $stringValue, $matches)) {
            $stringValue = $matches[1];
        }

        if (preg_match('/^(.+)\s+\d{4}-\d{2}-\d{2}$/', $stringValue, $matches)) {
            $stringValue = $matches[1];
        }

        foreach (['H:i:s', 'H:i'] as $format) {
            $parsed = Carbon::createFromFormat($format, $stringValue, 'UTC');
            if ($parsed !== false) {
                return $parsed->format('H:i:s');
            }
        }

        try {
            return Carbon::parse($stringValue)->format('H:i:s');
        } catch (\Throwable $exception) {
            return null;
        }
    }

    protected function combineDateWithTime($value, $date): ?Carbon
    {
        $timeString = $this->extractTimeComponent($value);

        if (!$timeString) {
            return null;
        }

        if ($date instanceof Carbon) {
            $baseDate = $date->copy();
        } elseif ($date instanceof \DateTimeInterface) {
            $baseDate = Carbon::instance($date);
        } elseif ($date) {
            $baseDate = Carbon::parse((string) $date);
        } else {
            $baseDate = Carbon::today();
        }

        try {
            return Carbon::parse($baseDate->toDateString() . ' ' . $timeString);
        } catch (\Throwable $exception) {
            return null;
        }
    }
}

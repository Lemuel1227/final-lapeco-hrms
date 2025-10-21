<?php

namespace App\Http\Controllers;

use App\Models\EmployeePayroll;
use App\Models\Holiday;
use App\Models\PayrollDeduction;
use App\Models\PayrollEarning;
use App\Models\PayrollPeriod;
use App\Models\PayrollStatutoryRequirement;
use App\Models\ScheduleAssignment;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PayrollController extends Controller
{
    public function index()
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

    public function generate(Request $request)
    {
        [$periodStart, $periodEnd, $label] = $this->resolvePayrollPeriod($request);

        $startDate = $periodStart->toDateString();
        $endDate = $periodEnd->toDateString();

        $result = DB::transaction(function () use ($periodStart, $startDate, $endDate) {
            $payrollPeriod = PayrollPeriod::firstOrCreate(
                [
                    'period_start' => $startDate,
                    'period_end' => $endDate,
                ],
                [
                    'period_year' => $periodStart->year,
                ]
            );

            $existingPayrolls = EmployeePayroll::where('period_id', $payrollPeriod->id)->get();
            foreach ($existingPayrolls as $payroll) {
                $payroll->earnings()->delete();
                $payroll->deductions()->delete();
                $payroll->statutoryRequirements()->delete();
                $payroll->delete();
            }

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
        // TODO: Implement payroll update
        return response()->json(['message' => 'Payroll updated']);
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
                    $attendedHours = $this->calculateAttendanceHours($attendance);
                    $overtimeHours = $this->calculateOvertimeHours($assignment->ot_hours, $attendedHours, $scheduledHours);
                    $regularHours = min($attendedHours, $scheduledHours);

                    $regularPay = $baseRate * $regularHours;
                    $overtimePay = $overtimeRate * $overtimeHours;
                    $dailyPay = round($regularPay + $overtimePay, 2);

                    $gross += $dailyPay;

                    $breakdown[] = [
                        'date' => $scheduleDate->toDateString(),
                        'status' => $this->determineAttendanceStatus($attendance, $scheduleDate),
                        'scheduled_hours' => max((int) floor($scheduledHours), 0),
                        'attended_hours' => max((int) floor($attendedHours), 0),
                        'overtime_hours' => max((int) floor($overtimeHours), 0),
                        'pay' => $dailyPay,
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

            if ($regularHours <= 0 && $overtimeHours <= 0) {
                continue;
            }

            $scheduleDate = $schedule->date instanceof Carbon ? $schedule->date->copy() : Carbon::parse($schedule->date);
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

        if ($gross <= 0 && $totalLateMinutes <= 0) {
            return null;
        }

        $lateRate = $position?->late_deduction_per_minute ?? 0;
        $lateDeduction = round($totalLateMinutes * (float) $lateRate, 2);
        $totalDeductions = $lateDeduction;

        $employeePayroll = EmployeePayroll::create([
            'period_id' => $period->id,
            'employee_id' => $user->id,
            'paid_status' => 'Pending',
            'pay_date' => null,
            'gross_earning' => round($gross, 2),
            'total_deductions' => round($totalDeductions, 2),
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
                return [2.0, 2.0, 'Holiday Pay Reg', 'Holiday Pay OT'];
            }

            return [1.3, 1.3, 'Special Rate Pay Reg', 'Special Rate Pay OT'];
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

        if ($workEnd->lessThanOrEqualTo($workStart)) {
            $workEnd->addDay();
        }

        $nightStart = Carbon::parse($scheduleDate->toDateString() . ' 22:00');
        $nightEnd = Carbon::parse($scheduleDate->toDateString() . ' 06:00')->addDay();

        $start = $workStart->greaterThan($nightStart) ? $workStart : $nightStart;
        $end = $workEnd->lessThan($nightEnd) ? $workEnd : $nightEnd;

        if ($start->gte($end)) {
            return 0.0;
        }

        $minutes = $start->diffInMinutes($end);

        if ($attendance->break_out && $attendance->break_in) {
            $breakStart = $this->combineDateWithTime($attendance->break_out, $scheduleDate);
            $breakEnd = $this->combineDateWithTime($attendance->break_in, $scheduleDate);

            if (!$breakStart || !$breakEnd) {
                return round(max($minutes, 0) / 60, 2);
            }

            if ($breakEnd->lessThanOrEqualTo($breakStart)) {
                $breakEnd->addDay();
            }

            $breakStart = $breakStart->greaterThan($nightStart) ? $breakStart : $nightStart;
            $breakEnd = $breakEnd->lessThan($nightEnd) ? $breakEnd : $nightEnd;

            if ($breakStart->lt($breakEnd)) {
                $minutes -= $breakStart->diffInMinutes($breakEnd);
            }
        }

        return round(max($minutes, 0) / 60, 2);
    }

    protected function calculateLateMinutes(Carbon $scheduleDate, ?string $scheduledStart, $attendance): int
    {
        if (!$scheduledStart || !$attendance || !$attendance->sign_in) {
            return 0;
        }

        $scheduledTime = Carbon::parse($scheduleDate->toDateString() . ' ' . $scheduledStart);
        $signInTime = $this->combineDateWithTime($attendance->sign_in, $scheduleDate) ?? $scheduledTime;

        if ($signInTime->lessThanOrEqualTo($scheduledTime)) {
            return 0;
        }

        return $signInTime->diffInMinutes($scheduledTime);
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

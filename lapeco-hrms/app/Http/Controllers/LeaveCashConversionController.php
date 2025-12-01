<?php

namespace App\Http\Controllers;

use App\Models\LeaveCashConversion;
use App\Models\LeaveCredit;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Traits\LogsActivity;

class LeaveCashConversionController extends Controller
{
    use LogsActivity;

    public function index(Request $request)
    {
        $year = (int) $request->query('year', now()->year);

        $conversions = LeaveCashConversion::with(['user.position'])
            ->forYear($year)
            ->orderByDesc('total_amount')
            ->get();

        if ($conversions->isEmpty()) {
            [$payloads, $records] = $this->computeConversions($year);
            $source = 'preview';
        } else {
            $records = $conversions->map(function (LeaveCashConversion $conversion) {
                $user = $conversion->user;
                $position = $user?->position;

                return [
                    'id' => $conversion->id,
                    'userId' => $user?->id,
                    'employeeId' => $user?->employee_id ?? $user?->id,
                    'name' => $user?->name ?? $this->formatUserName($user),
                    'position' => $position?->name,
                    'vacationDays' => (int) $conversion->vacation_days,
                    'sickDays' => (int) $conversion->sick_days,
                    'totalDays' => (int) $conversion->vacation_days + (int) $conversion->sick_days,
                    'conversionRate' => (float) $conversion->conversion_rate,
                    'totalAmount' => (float) $conversion->total_amount,
                    'status' => $conversion->status,
                    'processedAt' => optional($conversion->processed_at)->toIso8601String(),
                    'paidAt' => optional($conversion->paid_at)->toIso8601String(),
                    'details' => $conversion->details ?? [],
                ];
            })->values();
            $payloads = collect();
            $source = 'stored';
        }

        $totalPayout = round($records->sum(fn ($record) => $record['totalAmount']), 2);
        $eligibleCount = $records->count();

        return response()->json([
            'year' => $year,
            'source' => $source,
            'summary' => [
                'totalPayout' => $totalPayout,
                'eligibleCount' => $eligibleCount,
            ],
            'records' => $records,
        ]);
    }

    public function generate(Request $request)
    {
        $year = (int) $request->input('year', now()->year);

        [$payloads, $records] = $this->computeConversions($year);

        $userIds = $payloads->pluck('user_id')->all();

        DB::transaction(function () use ($payloads, $year, $userIds) {
            foreach ($payloads as $payload) {
                $existing = LeaveCashConversion::where('user_id', $payload['user_id'])
                    ->where('year', $year)
                    ->first();

                if ($existing) {
                    $preserved = [
                        'status' => $existing->status,
                        'processed_by' => $existing->processed_by,
                        'processed_at' => $existing->processed_at,
                        'paid_by' => $existing->paid_by,
                        'paid_at' => $existing->paid_at,
                    ];
                    $existing->fill(array_merge($payload, $preserved))->save();
                } else {
                    LeaveCashConversion::create(array_merge($payload, [
                        'status' => 'Pending',
                    ]));
                }
            }

            LeaveCashConversion::where('year', $year)
                ->whereNotIn('user_id', $userIds)
                ->delete();
        });

        $this->logCustomActivity(
            'generate',
            "Generated leave cash conversion records for {$year}",
            'leave_cash_conversion',
            null,
            ['year' => $year, 'records' => $records->count()]
        );

        $conversions = LeaveCashConversion::with('user.position')
            ->forYear($year)
            ->orderByDesc('total_amount')
            ->get();

        $responseRecords = $conversions->map(function (LeaveCashConversion $conversion) {
            $user = $conversion->user;
            $position = $user?->position;

            return [
                'id' => $conversion->id,
                'userId' => $user?->id,
                'employeeId' => $user?->employee_id ?? $user?->id,
                'name' => $user?->name ?? $this->formatUserName($user),
                'position' => $position?->name,
                'vacationDays' => (int) $conversion->vacation_days,
                'sickDays' => (int) $conversion->sick_days,
                'totalDays' => (int) $conversion->vacation_days + (int) $conversion->sick_days,
                'conversionRate' => (float) $conversion->conversion_rate,
                'totalAmount' => (float) $conversion->total_amount,
                'status' => $conversion->status,
                'processedAt' => optional($conversion->processed_at)->toIso8601String(),
                'paidAt' => optional($conversion->paid_at)->toIso8601String(),
                'details' => $conversion->details ?? [],
            ];
        })->values();

        return response()->json([
            'year' => $year,
            'source' => 'stored',
            'summary' => [
                'totalPayout' => round($responseRecords->sum(fn ($record) => $record['totalAmount']), 2),
                'eligibleCount' => $responseRecords->count(),
            ],
            'records' => $responseRecords,
        ]);
    }

    public function updateStatus(Request $request, LeaveCashConversion $conversion)
    {
        $validated = $request->validate([
            'status' => 'required|in:Pending,Paid',
        ]);

        $status = $validated['status'];
        $userId = optional($request->user())->id;

        if ($status === 'Pending') {
            $conversion->fill([
                'status' => $status,
                'processed_by' => null,
                'processed_at' => null,
                'paid_by' => null,
                'paid_at' => null,
            ]);
        } else { // Paid
            $conversion->fill([
                'status' => $status,
                'processed_by' => $conversion->processed_by ?? $userId,
                'processed_at' => $conversion->processed_at ?? Carbon::now(),
                'paid_by' => $userId,
                'paid_at' => Carbon::now(),
            ]);
        }

        $conversion->save();

        $this->logUpdate(
            'leave_cash_conversion',
            $conversion->id,
            "Status updated to {$status}"
        );

        return response()->json([
            'id' => $conversion->id,
            'status' => $conversion->status,
            'processedAt' => optional($conversion->processed_at)->toIso8601String(),
            'paidAt' => optional($conversion->paid_at)->toIso8601String(),
        ]);
    }

    public function markAll(Request $request)
    {
        $validated = $request->validate([
            'year' => 'required|integer|min:1900|max:9999',
            'status' => 'required|in:Pending,Paid',
        ]);

        $year = $validated['year'];
        $status = $validated['status'];
        $userId = optional($request->user())->id;

        $updates = [
            'status' => $status,
        ];

        if ($status === 'Pending') {
            $updates['processed_by'] = null;
            $updates['processed_at'] = null;
            $updates['paid_by'] = null;
            $updates['paid_at'] = null;
        } else {
            $updates['processed_by'] = $userId;
            $updates['processed_at'] = Carbon::now();
            $updates['paid_by'] = $userId;
            $updates['paid_at'] = Carbon::now();
        }

        LeaveCashConversion::where('year', $year)->update($updates);

        $this->logCustomActivity(
            'bulk_update',
            "Marked all leave cash conversions for {$year} as {$status}",
            'leave_cash_conversion',
            null,
            ['year' => $year, 'status' => $status]
        );

        return response()->json(['success' => true]);
    }

    private function computeConversions(int $year): array
    {
        $leaveCredits = LeaveCredit::where('year', $year)->get()->groupBy('user_id');

        if ($leaveCredits->isEmpty()) {
            return [collect(), collect()];
        }

        $userIds = $leaveCredits->keys()->all();
        $users = User::with('position')
            ->whereIn('id', $userIds)
            ->where('account_status', 'Active')
            ->get()
            ->keyBy('id');

        $payloads = collect();
        $records = collect();

        foreach ($users as $userId => $user) {
            $credits = $leaveCredits->get($userId, collect());

            $vacationRemaining = $this->remainingCreditsFor($credits, 'Vacation Leave');
            $sickRemaining = $this->remainingCreditsFor($credits, 'Sick Leave');
            $totalDays = $vacationRemaining + $sickRemaining;

            if ($totalDays <= 0) {
                continue;
            }

            $dailyRate = $this->resolveDailyRate($user);
            if ($dailyRate <= 0) {
                continue;
            }

            $conversionRate = round($dailyRate, 2);
            $vacationAmount = round($vacationRemaining * $conversionRate, 2);
            $sickAmount = round($sickRemaining * $conversionRate, 2);
            $totalAmount = round($vacationAmount + $sickAmount, 2);

            if ($totalAmount <= 0) {
                continue;
            }

            $details = [
                'vacation' => [
                    'days' => $vacationRemaining,
                    'amount' => $vacationAmount,
                ],
                'sick' => [
                    'days' => $sickRemaining,
                    'amount' => $sickAmount,
                ],
                'total_days' => $totalDays,
            ];

            $payload = [
                'user_id' => $user->id,
                'year' => $year,
                'vacation_days' => $vacationRemaining,
                'sick_days' => $sickRemaining,
                'conversion_rate' => $conversionRate,
                'total_amount' => $totalAmount,
                'details' => $details,
            ];

            $payloads->push($payload);

            $records->push([
                'id' => null,
                'userId' => $user->id,
                'employeeId' => $user->employee_id ?? $user->id,
                'name' => $user->name ?? $this->formatUserName($user),
                'position' => optional($user->position)->name,
                'vacationDays' => $vacationRemaining,
                'sickDays' => $sickRemaining,
                'totalDays' => $totalDays,
                'conversionRate' => $conversionRate,
                'totalAmount' => $totalAmount,
                'status' => 'Pending',
                'processedAt' => null,
                'paidAt' => null,
                'details' => $details,
            ]);
        }

        return [$payloads, $records];
    }

    private function remainingCreditsFor($credits, string $type): int
    {
        $credit = $credits->firstWhere('leave_type', $type);
        if (!$credit) {
            return 0;
        }

        $remaining = (int) ($credit->total_credits - $credit->used_credits);
        return $remaining > 0 ? $remaining : 0;
    }

    private function resolveDailyRate(User $user): float
    {
        $position = $user->position;
        if (!$position) {
            return 0.0;
        }

        $hourlyRate = (float) ($position->base_rate_per_hour ?? 0);
        if ($hourlyRate > 0) {
            return $hourlyRate * 8;
        }

        $monthlySalary = (float) ($position->monthly_salary ?? 0);
        if ($monthlySalary > 0) {
            return $monthlySalary / 22;
        }

        return 0.0;
    }

    private function formatUserName(?User $user): ?string
    {
        if (!$user) {
            return null;
        }

        $parts = array_filter([
            trim((string) $user->first_name),
            trim((string) $user->middle_name),
            trim((string) $user->last_name),
        ]);

        return $parts ? implode(' ', $parts) : null;
    }
}

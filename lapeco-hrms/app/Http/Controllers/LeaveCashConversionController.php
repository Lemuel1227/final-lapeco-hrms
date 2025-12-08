<?php

namespace App\Http\Controllers;

use App\Models\LeaveCashConversion;
use App\Models\LeaveCredit;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Traits\LogsActivity;

class LeaveCashConversionController extends Controller
{
    use LogsActivity;

    public function index(Request $request)
    {
        $year = (int) $request->query('year', now()->year);
        $user = $request->user();
        
        Log::info("LeaveCashConversionController::index - User: {$user->id} ({$user->name}), Year: {$year}, Scope: " . $request->query('scope'));

        $isSuperAdmin = $user->role === 'SUPER_ADMIN';
        $hasModule = $this->hasModule($user, 'leave_management');
        $isSelf = $request->query('scope') === 'self';

        $query = LeaveCashConversion::with(['user.position'])
            ->forYear($year)
            ->orderByDesc('total_amount');

        if ($isSelf || (!$isSuperAdmin && !$hasModule)) {
            $query->where('user_id', $user->id);
        }

        $conversions = $query->get();

        if ($conversions->isEmpty()) {
            if (!$isSelf && ($isSuperAdmin || $hasModule)) {
                [$payloads, $records] = $this->computeConversions($year);
                $source = 'preview';
            } else {
                // If checking for self, checking credits specifically for self
                if ($isSelf) {
                     [$payloads, $records] = $this->computeConversions($year, $user->id);
                     if ($records->isNotEmpty()) {
                         $source = 'preview'; // Preview for self
                     } else {
                         $records = collect();
                         $source = 'none';
                     }
                } else {
                    $records = collect();
                    $source = 'none';
                }
            }
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
        $user = $request->user();
        
        Log::info("LeaveCashConversionController::generate - User: {$user->id}, Year: {$year}, Scope: " . $request->input('scope'));

        $isSuperAdmin = $user->role === 'SUPER_ADMIN';
        $hasModule = $this->hasModule($user, 'leave_management');
        $isSelf = $request->input('scope') === 'self';

        $limitUserId = ($isSelf || (!$isSuperAdmin && !$hasModule)) ? $user->id : null;

        [$payloads, $records] = $this->computeConversions($year, $limitUserId);

        $userIds = $payloads->pluck('user_id')->all();

        DB::transaction(function () use ($payloads, $year, $userIds, $limitUserId) {
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

            // Only delete records that were part of the computation scope
            $deleteQuery = LeaveCashConversion::where('year', $year)
                ->whereNotIn('user_id', $userIds);
            
            if ($limitUserId) {
                $deleteQuery->where('user_id', $limitUserId);
            }
                
            $deleteQuery->delete();
        });

        $this->logCustomActivity(
            'generate',
            "Generated leave cash conversion records for {$year}",
            'leave_cash_conversion',
            null,
            ['year' => $year, 'records' => $records->count()]
        );

        $query = LeaveCashConversion::with('user.position')
            ->forYear($year)
            ->orderByDesc('total_amount');

        if ($limitUserId) {
            $query->where('user_id', $limitUserId);
        }

        $conversions = $query->get();

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
            'status' => 'required|in:Pending,Submitted,Approved,Declined,Paid',
        ]);

        $status = $validated['status'];
        $user = $request->user();
        $isSuperAdmin = $user->role === 'SUPER_ADMIN';
        $hasModule = $this->hasModule($user, 'leave_management');
        $isOwner = $conversion->user_id === $user->id;

        if (!$isSuperAdmin && !$hasModule && !$isOwner) {
            return response()->json(['message' => 'Unauthorized action.'], 403);
        }

        if (!$isSuperAdmin && !$hasModule && $isOwner) {
             // Regular employee restrictions
             if (!in_array($status, ['Pending', 'Submitted'])) {
                 return response()->json(['message' => 'You can only submit or revert your request.'], 403);
             }
             // Can only change OWN status
             // Pending -> Submitted
             if ($conversion->status === 'Pending' && $status === 'Submitted') {
                 // Allowed
             }
             // Submitted -> Pending
             elseif ($conversion->status === 'Submitted' && $status === 'Pending') {
                 // Allowed
             }
             else {
                 return response()->json(['message' => 'Invalid status transition.'], 403);
             }
        }

        if (!$isSuperAdmin && $hasModule && !$isOwner) {
            // Assigned employees (not super admin) permissions...
            // Kept from original logic
            
            $allowed = false;

            // 1. Pending -> Submitted
            if ($conversion->status === 'Pending' && $status === 'Submitted') {
                $allowed = true;
            }
            // 2. Submitted -> Pending
            elseif ($conversion->status === 'Submitted' && $status === 'Pending') {
                $allowed = true;
            }
            // 3. Approved -> Paid
            elseif ($conversion->status === 'Approved' && $status === 'Paid') {
                $allowed = true;
            }
            // 4. Paid -> Approved (Revert payment)
            elseif ($conversion->status === 'Paid' && $status === 'Approved') {
                $allowed = true;
            }

            if (!$allowed) {
                return response()->json(['message' => 'You are not authorized to perform this status change.'], 403);
            }
        }

        $updates = ['status' => $status];

        if ($status === 'Pending' || $status === 'Submitted') {
            $updates['processed_by'] = null;
            $updates['processed_at'] = null;
            $updates['paid_by'] = null;
            $updates['paid_at'] = null;
        } elseif ($status === 'Paid') {
            $updates['paid_by'] = $user->id;
            $updates['paid_at'] = Carbon::now();
            // If jumping to Paid, ensure processed fields are set if empty?
            if (!$conversion->processed_by) {
                $updates['processed_by'] = $user->id;
                $updates['processed_at'] = Carbon::now();
            }
        } else { // Approved or Declined
            if ($conversion->status === 'Paid' && $status === 'Approved') {
                 // Reverting payment, clear paid info but keep processed info
                 $updates['paid_by'] = null;
                 $updates['paid_at'] = null;
            } else {
                 $updates['processed_by'] = $user->id;
                 $updates['processed_at'] = Carbon::now();
            }
        }

        $conversion->fill($updates)->save();

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
            'status' => 'required|in:Pending,Submitted,Approved,Declined,Paid',
        ]);

        $year = $validated['year'];
        $status = $validated['status'];
        $user = $request->user();
        $isSuperAdmin = $user->role === 'SUPER_ADMIN';
        $hasModule = $this->hasModule($user, 'leave_management');

        if (!$isSuperAdmin && !$hasModule) {
             // Allow for own records only if submitting/reverting
             if (!in_array($status, ['Pending', 'Submitted'])) {
                 return response()->json(['message' => 'Unauthorized action.'], 403);
             }
        }

        if (!$isSuperAdmin && $hasModule) {
            if ($status !== 'Submitted' && $status !== 'Pending') {
                return response()->json(['message' => 'You can only submit requests.'], 403);
            }
        }

        $updates = [
            'status' => $status,
        ];

        if ($status === 'Pending' || $status === 'Submitted') {
            $updates['processed_by'] = null;
            $updates['processed_at'] = null;
            $updates['paid_by'] = null;
            $updates['paid_at'] = null;
        } elseif ($status === 'Paid') {
            $updates['paid_by'] = $user->id;
            $updates['paid_at'] = Carbon::now();
            $updates['processed_by'] = $user->id;
            $updates['processed_at'] = Carbon::now();
        } else { // Approved, Declined
            $updates['processed_by'] = $user->id;
            $updates['processed_at'] = Carbon::now();
        }

        $query = LeaveCashConversion::where('year', $year);

        if (!$isSuperAdmin && !$hasModule) {
            $query->where('user_id', $user->id);
            if ($status === 'Submitted') {
                 $query->where('status', 'Pending');
            } elseif ($status === 'Pending') {
                 $query->where('status', 'Submitted');
            }
        }
        elseif (!$isSuperAdmin && $hasModule && $status === 'Submitted') {
             $query->where('status', 'Pending');
        }

        $query->update($updates);

        $this->logCustomActivity(
            'bulk_update',
            "Marked leave cash conversions for {$year} as {$status}",
            'leave_cash_conversion',
            null,
            ['year' => $year, 'status' => $status]
        );

        return response()->json(['success' => true]);
    }

    private function hasModule($user, string $moduleKey): bool
    {
        try {
            $aliases = [
                'leave' => 'leave_management',
            ];
            $normalized = $aliases[$moduleKey] ?? $moduleKey;
            $mods = is_array($user?->position?->allowed_modules) ? $user->position->allowed_modules : [];
            return in_array($normalized, $mods);
        } catch (\Throwable $e) {
            return false;
        }
    }

    private function computeConversions(int $year, ?int $limitUserId = null): array
    {
        Log::info("computeConversions - Year: {$year}, LimitUserId: " . ($limitUserId ?? 'All'));

        $query = LeaveCredit::where('year', $year);
        if ($limitUserId) {
            $query->where('user_id', $limitUserId);
        }
        $leaveCredits = $query->get()->groupBy('user_id');

        if ($leaveCredits->isEmpty()) {
            return [collect(), collect()];
        }

        $userIds = $leaveCredits->keys()->all();
        Log::info("computeConversions - Found credits for User IDs: " . implode(', ', $userIds));
        
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

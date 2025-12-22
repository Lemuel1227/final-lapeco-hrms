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
        $isAdminOrManager = !$isSelf && ($isSuperAdmin || $hasModule);

        // Fetch stored conversions
        $query = LeaveCashConversion::with(['user.position'])
            ->forYear($year)
            ->orderByDesc('total_amount');

        if (!$isAdminOrManager) {
            $query->where('user_id', $user->id);
        }

        $conversions = $query->get();
        $storedRecords = $conversions->map(fn($c) => $this->transformConversion($c));

        // If regular user or self-scope, just return what we found (or generate preview if empty)
        if (!$isAdminOrManager) {
             if ($storedRecords->isEmpty()) {
                 if ($isSelf) {
                     [$payloads, $records] = $this->computeConversions($year, $user->id);
                     if ($records->isNotEmpty()) {
                         return response()->json([
                             'year' => $year,
                             'source' => 'preview',
                             'summary' => [
                                 'totalPayout' => round($records->sum('totalAmount'), 2),
                                 'eligibleCount' => $records->count(),
                             ],
                             'records' => $records,
                         ]);
                     }
                 }
                 return response()->json([
                     'year' => $year,
                     'source' => 'none',
                     'summary' => ['totalPayout' => 0, 'eligibleCount' => 0],
                     'records' => [],
                 ]);
             } else {
                 return response()->json([
                     'year' => $year,
                     'source' => 'stored',
                     'summary' => [
                         'totalPayout' => round($storedRecords->sum('totalAmount'), 2),
                         'eligibleCount' => $storedRecords->count(),
                     ],
                     'records' => $storedRecords,
                 ]);
             }
        }

        // Admin/Manager View: Merge Stored + Preview
        // 1. Compute all potential records
        [$payloads, $previewRecords] = $this->computeConversions($year);
        
        // 2. Map stored records by userId
        $storedMap = $storedRecords->keyBy('userId');
        
        // 3. Merge: Start with Preview, overlay Stored
        $finalRecords = $previewRecords->map(function ($preview) use ($storedMap) {
            $userId = $preview['userId'];
            if ($storedMap->has($userId)) {
                return $storedMap->get($userId);
            }
            return $preview;
        });
        
        // 4. Add any Stored records that weren't in Preview (e.g. no longer eligible but has record)
        $previewUserIds = $previewRecords->pluck('userId')->flip();
        $extraStored = $storedRecords->filter(function ($record) use ($previewUserIds) {
            return !$previewUserIds->has($record['userId']);
        });
        
        $finalRecords = $finalRecords->merge($extraStored)->sortByDesc('totalAmount')->values();

        return response()->json([
            'year' => $year,
            'source' => 'mixed',
            'summary' => [
                'totalPayout' => round($finalRecords->sum('totalAmount'), 2),
                'eligibleCount' => $finalRecords->count(),
            ],
            'records' => $finalRecords,
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
        $targetUserId = $request->input('user_id');

        $limitUserId = null;

        if ($isSelf) {
            $limitUserId = $user->id;
        } elseif ($targetUserId && ($isSuperAdmin || $hasModule)) {
            $limitUserId = $targetUserId;
        } elseif (!$isSuperAdmin && !$hasModule) {
            $limitUserId = $user->id;
        }

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

        if ($isSuperAdmin) {
            // Super Admin can perform any status change
        } else {
            // Non-Super Admin Restrictions

            // 1. Strictly block setting status to 'Approved' or 'Declined'
            // Unless reverting 'Paid' -> 'Approved' (if we allow that for assigned employees)
            // But 'Declined' is strictly Super Admin.
            // 'Approved' from 'Submitted'/'Pending' is strictly Super Admin.
            
            if ($status === 'Declined') {
                return response()->json(['message' => 'Only Super Admin can decline requests.'], 403);
            }

            if ($status === 'Approved' && $conversion->status !== 'Paid') {
                return response()->json(['message' => 'Only Super Admin can approve requests.'], 403);
            }

            // 2. Check general authorization (Module access or Owner)
            if (!$hasModule && !$isOwner) {
                return response()->json(['message' => 'Unauthorized action.'], 403);
            }

            $allowed = false;

            // 3. Define allowed transitions
            
            // Pending <-> Submitted
            if (($conversion->status === 'Pending' && $status === 'Submitted') ||
                ($conversion->status === 'Submitted' && $status === 'Pending')) {
                // Allowed for Owner and Assigned Employee
                $allowed = true;
            }
            
            // Approved <-> Paid
            // Only for Assigned Employee (hasModule)
            elseif (($conversion->status === 'Approved' && $status === 'Paid') ||
                    ($conversion->status === 'Paid' && $status === 'Approved')) {
                if ($hasModule) {
                    $allowed = true;
                }
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
            if ($status !== 'Submitted' && $status !== 'Pending' && $status !== 'Paid') {
                return response()->json(['message' => 'You can only submit or pay requests.'], 403);
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
            // Ensure processed fields are set if missing (legacy/edge case)
            // Ideally should be set during Approval
        } else { // Approved, Declined
            $updates['processed_by'] = $user->id;
            $updates['processed_at'] = Carbon::now();
        }

        $query = LeaveCashConversion::where('year', $year);

        // Safety: When marking as Paid, only affect Approved records
        if ($status === 'Paid') {
            $query->where('status', 'Approved');
        }

        if (!$isSuperAdmin && !$hasModule) {
            $query->where('user_id', $user->id);
            if ($status === 'Submitted') {
                 $query->where('status', 'Pending');
            } elseif ($status === 'Pending') {
                 $query->where('status', 'Submitted');
            }
        }
        elseif (!$isSuperAdmin && $hasModule) {
             if ($status === 'Submitted') {
                 $query->where('status', 'Pending');
             }
             // For Paid, we already added the Approved filter above
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
            $totalDays = $vacationRemaining;

            if ($totalDays <= 0) {
                continue;
            }

            $dailyRate = $this->resolveDailyRate($user);
            if ($dailyRate <= 0) {
                continue;
            }

            $conversionRate = round($dailyRate, 2);
            $vacationAmount = round($vacationRemaining * $conversionRate, 2);
            $totalAmount = round($vacationAmount, 2);

            if ($totalAmount <= 0) {
                continue;
            }

            $details = [
                'vacation' => [
                    'days' => $vacationRemaining,
                    'amount' => $vacationAmount,
                ],
                'total_days' => $totalDays,
            ];

            $payload = [
                'user_id' => $user->id,
                'year' => $year,
                'vacation_days' => $vacationRemaining,
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

    private function transformConversion(LeaveCashConversion $conversion): array
    {
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
    }
}

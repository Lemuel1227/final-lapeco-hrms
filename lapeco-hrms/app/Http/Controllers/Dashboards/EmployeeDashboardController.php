<?php

namespace App\Http\Controllers;

use App\Models\Attendance;
use App\Models\Holiday;
use App\Models\Leave;
use App\Models\LeaveCredit;
use App\Models\ScheduleAssignment;
use App\Models\User;
use App\Models\PerformanceEvaluatorResponse;
use Carbon\Carbon;
use Carbon\CarbonInterface;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EmployeeDashboardController extends Controller
{
    public function summary(Request $request): JsonResponse
    {
        $employee = $request->user();

        if (!$employee || !in_array($employee->role, ['TEAM_LEADER', 'REGULAR_EMPLOYEE'])) {
            return response()->json([
                'message' => 'Employee dashboard is only available for team members.'
            ], 403);
        }

        $today = Carbon::today();
        $startOfMonth = Carbon::today()->startOfMonth();
        $endOfMonth = Carbon::today()->endOfMonth();

        $scheduleAssignments = ScheduleAssignment::query()
            ->with(['schedule:id,date', 'attendance'])
            ->whereHas('schedule', function ($query) use ($startOfMonth, $endOfMonth) {
                $query->whereBetween('date', [$startOfMonth, $endOfMonth]);
            })
            ->where('user_id', $employee->id)
            ->get()
            ->sortByDesc(function ($assignment) {
                return optional($assignment->schedule)->date;
            })
            ->values();

        $attendanceLogs = Attendance::query()
            ->with(['scheduleAssignment.schedule'])
            ->whereHas('scheduleAssignment', function ($query) use ($employee, $startOfMonth, $endOfMonth) {
                $query->where('user_id', $employee->id)
                    ->whereHas('schedule', function ($subQuery) use ($startOfMonth, $endOfMonth) {
                        $subQuery->whereBetween('date', [$startOfMonth, $endOfMonth]);
                    });
            })
            ->get();

        $teamMembers = User::query()
            ->where('position_id', $employee->position_id)
            ->where('id', '!=', $employee->id)
            ->whereNotIn('employment_status', ['terminated', 'resigned'])
            ->get(['id', 'first_name', 'last_name', 'image_url']);

        $leader = User::query()
            ->where('position_id', $employee->position_id)
            ->where('is_team_leader', true)
            ->first(['id', 'first_name','last_name', 'image_url']);

        $leaderEvaluationDue = false;
        if ($leader) {
            $leaderEvaluationDue = $this->isLeaderEvaluationDue($employee->id, $leader->id);
        }

        $leaveCredits = LeaveCredit::query()
            ->where('user_id', $employee->id)
            ->where('year', $today->year)
            ->get();

        $leaveBalances = [
            'vl' => $this->formatRemainingCredits($leaveCredits->firstWhere('leave_type', 'Vacation Leave')),
            'sl' => $this->formatRemainingCredits($leaveCredits->firstWhere('leave_type', 'Sick Leave')),
        ];

        $myScheduleToday = $scheduleAssignments
            ->first(function ($assignment) use ($today) {
                $scheduleDate = optional($assignment->schedule)->date;

                if ($scheduleDate instanceof CarbonInterface) {
                    return $scheduleDate->isSameDay($today);
                }

                if (!$scheduleDate) {
                    return false;
                }

                return Carbon::parse($scheduleDate)->isSameDay($today);
            });

        $recentActivity = $scheduleAssignments
            ->map(function ($assignment) use ($today) {
                $scheduleDate = optional($assignment->schedule)->date;
                if (!$scheduleDate) {
                    return null;
                }

                $attendance = $assignment->attendance;
                $status = 'Scheduled';
                $statusClass = 'scheduled';
                $details = 'Shift: ' . ($assignment->start_time && $assignment->end_time
                    ? Carbon::parse($assignment->start_time)->format('H:i') . ' - ' . Carbon::parse($assignment->end_time)->format('H:i')
                    : 'N/A');

                if ($attendance && $attendance->sign_in) {
                    $status = ucfirst($attendance->calculated_status ?? $attendance->status ?? 'Present');
                    $statusClass = strtolower($status);
                    $details = 'Clocked In: ' . Carbon::parse($attendance->sign_in)->format('H:i');
                } elseif (Carbon::parse($scheduleDate)->lt($today)) {
                    $status = 'Absent';
                    $statusClass = 'absent';
                    $details = 'No attendance recorded.';
                }

                return [
                    'date' => $scheduleDate,
                    'status' => $status,
                    'statusClass' => $statusClass,
                    'details' => $details,
                ];
            })
            ->filter()
            ->sortByDesc('date')
            ->values()
            ->take(5);

        $upcomingHolidays = Holiday::query()
            ->whereDate('date', '>', $today)
            ->orderBy('date')
            ->limit(3)
            ->get(['id', 'title', 'date'])
            ->map(function ($holiday) {
                return [
                    'id' => $holiday->id,
                    'name' => $holiday->title,
                    'date' => $holiday->date,
                ];
            });

        $upcomingLeaveRequests = Leave::query()
            ->where('user_id', $employee->id)
            ->where('status', 'approved')
            ->where(function ($query) use ($today) {
                $query->where('date_from', '>=', $today)
                    ->orWhere('date_to', '>=', $today);
            })
            ->orderBy('date_from')
            ->limit(5)
            ->get(['id', 'type', 'date_from', 'date_to']);

        $currentUserName = trim(($employee->first_name ?? '') . ' ' . ($employee->last_name ?? '')) ?: $employee->username ?? 'Employee';

        return response()->json([
            'currentUser' => [
                'id' => $employee->id,
                'name' => $currentUserName,
                'positionId' => $employee->position_id,
                'avatarUrl' => $employee->image_url ? asset('storage/' . $employee->image_url) : null,
            ],
            'scheduleToday' => $myScheduleToday ? [
                'date' => (function () use ($myScheduleToday) {
                    $scheduleDate = optional($myScheduleToday->schedule)->date;
                    if ($scheduleDate instanceof CarbonInterface) {
                        return $scheduleDate->toDateString();
                    }
                    return $scheduleDate ? Carbon::parse($scheduleDate)->toDateString() : null;
                })(),
                'shift' => $myScheduleToday->start_time && $myScheduleToday->end_time
                    ? Carbon::parse($myScheduleToday->start_time)->format('H:i') . ' - ' . Carbon::parse($myScheduleToday->end_time)->format('H:i')
                    : null,
            ] : null,
            'teamMembers' => $teamMembers->map(function ($member) {
                $name = trim(($member->first_name ?? '') . ' ' . ($member->last_name ?? '')) ?: $member->username ?? 'Employee';
                return [
                    'id' => $member->id,
                    'name' => $name,
                    'avatarUrl' => $member->image_url ? asset('storage/' . $member->image_url) : null,
                ];
            })->values(),
            'leaderEvaluation' => [
                'leader' => $leader ? [
                    'id' => $leader->id,
                    'name' => trim(($leader->first_name ?? '') . ' ' . ($leader->last_name ?? '')) ?: $leader->username ?? 'Leader',
                    'avatarUrl' => $leader->image_url ? asset('storage/' . $leader->image_url) : null,
                ] : null,
                'isDue' => $leaderEvaluationDue,
            ],
            'leaveBalances' => $leaveBalances,
            'recentActivity' => $recentActivity,
            'upcomingHolidays' => $upcomingHolidays,
            'upcomingLeaveRequests' => $upcomingLeaveRequests,
        ]);
    }

    private function isLeaderEvaluationDue(int $employeeId, int $leaderId): bool
    {
        // Pending integration with performance evaluation records.
        // For now, default to true so employees are prompted to evaluate their leader.
        return true;
    }

    private function formatRemainingCredits(?LeaveCredit $credit): int
    {
        if (!$credit) {
            return 0;
        }

        $remaining = $credit->remaining_credits;

        if ($remaining === 'Unlimited') {
            return 0;
        }

        return (int) $remaining;
    }
}

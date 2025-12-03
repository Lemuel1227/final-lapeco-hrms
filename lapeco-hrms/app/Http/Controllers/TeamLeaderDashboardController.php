<?php

namespace App\Http\Controllers;

use App\Models\Leave;
use App\Models\ScheduleAssignment;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TeamLeaderDashboardController extends Controller
{
    public function summary(Request $request): JsonResponse
    {
        $leader = $request->user();

        if (!$leader || !$leader->is_team_leader || !$leader->position_id) {
            return response()->json([
                'message' => 'Only team leaders with an assigned position can access this endpoint.'
            ], 403);
        }

        $today = Carbon::today();
        $leaveWindowEnd = Carbon::today()->addDays(7);

        $teamMembers = User::query()
            ->where('position_id', $leader->position_id)
            ->where('id', '!=', $leader->id)
            ->whereNotIn('employment_status', ['terminated', 'resigned'])
            ->orderBy('first_name')
            ->orderBy('last_name')
            ->get(['id', 'first_name', 'last_name', 'email', 'contact_number', 'image_url', 'role']);

        $attendanceAssignments = ScheduleAssignment::query()
            ->with(['user:id,first_name,last_name,email,image_url,position_id', 'schedule:id,date', 'attendance'])
            ->whereHas('schedule', fn ($q) => $q->whereDate('date', $today))
            ->whereHas('user', fn ($q) => $q->where('position_id', $leader->position_id))
            ->get();

        $attendanceToday = $attendanceAssignments->map(function ($assignment) use ($today) {
            $attendance = $assignment->attendance;

            $status = 'Scheduled';
            $signIn = null;
            $signOut = null;
            $breakOut = null;
            $breakIn = null;
            $statusClass = 'scheduled';

            if ($attendance) {
                $status = ucfirst($attendance->calculated_status ?? $attendance->status ?? 'Scheduled');
                $signIn = $attendance->sign_in ? Carbon::parse($attendance->sign_in)->format('H:i') : null;
                $signOut = $attendance->sign_out ? Carbon::parse($attendance->sign_out)->format('H:i') : null;
                $breakOut = $attendance->break_out ? Carbon::parse($attendance->break_out)->format('H:i') : null;
                $breakIn = $attendance->break_in ? Carbon::parse($attendance->break_in)->format('H:i') : null;
                $statusClass = strtolower($status);
            }

            if (!$attendance && $assignment->schedule && Carbon::parse($assignment->schedule->date)->lt($today)) {
                $status = 'Absent';
                $statusClass = 'absent';
            }

            $shift = null;
            if ($assignment->start_time && $assignment->end_time) {
                $shift = Carbon::parse($assignment->start_time)->format('H:i') . ' - ' . Carbon::parse($assignment->end_time)->format('H:i');
            }

            $user = $assignment->user;
            $displayName = trim(($user->first_name ?? '') . ' ' . ($user->last_name ?? '')) ?: $user->email;

            return [
                'id' => $assignment->id,
                'empId' => $assignment->user_id,
                'name' => $displayName,
                'avatarUrl' => $user->image_url ? asset('storage/' . $user->image_url) : null,
                'date' => optional($assignment->schedule)->date,
                'shift' => $shift,
                'signIn' => $signIn,
                'signOut' => $signOut,
                'breakOut' => $breakOut,
                'breakIn' => $breakIn,
                'status' => $status,
                'statusClass' => $statusClass,
            ];
        })->values();

        $approvedLeavesBaseQuery = Leave::query()
            ->with(['user:id,first_name,last_name,position_id,image_url'])
            ->where('status', 'approved')
            ->whereHas('user', fn ($q) => $q->where('position_id', $leader->position_id))
            ->where(function ($query) use ($today, $leaveWindowEnd) {
                $query->whereBetween('date_from', [$today, $leaveWindowEnd])
                    ->orWhereBetween('date_to', [$today, $leaveWindowEnd])
                    ->orWhere(function ($nested) use ($today, $leaveWindowEnd) {
                        $nested->where('date_from', '<=', $today)
                            ->where('date_to', '>=', $leaveWindowEnd);
                    });
            })
            ->orderBy('date_from');

        $onLeaveTodayCount = (clone $approvedLeavesBaseQuery)
            ->get()
            ->filter(function ($leave) use ($today) {
                $dateFrom = Carbon::parse($leave->date_from);
                $dateTo = Carbon::parse($leave->date_to);
                return $today->between($dateFrom, $dateTo);
            })
            ->count();

        $upcomingLeaves = (clone $approvedLeavesBaseQuery)
            ->limit(5)
            ->get()
            ->map(function ($leave) {
                $user = $leave->user;
                $displayName = $user
                    ? trim(($user->first_name ?? '') . ' ' . ($user->last_name ?? '')) ?: $user->email
                    : 'Employee';

                $dateFrom = Carbon::parse($leave->date_from);
                $dateTo = Carbon::parse($leave->date_to);
                $dayCount = $dateFrom->diffInDays($dateTo) + 1;
                $isMultiDay = $dayCount > 1;

                return [
                    'leaveId' => $leave->id,
                    'employeeId' => $leave->user_id,
                    'employeeName' => $displayName,
                    'type' => $leave->type,
                    'leaveType' => $leave->type,
                    'dateFrom' => $dateFrom->toDateString(),
                    'dateTo' => $dateTo->toDateString(),
                    'dayCount' => $dayCount,
                    'isMultiDay' => $isMultiDay,
                    'avatarUrl' => $user && $user->image_url ? asset('storage/' . $user->image_url) : null,
                ];
            })
            ->values();

        $pendingRequestsCount = Leave::query()
            ->where('status', 'pending')
            ->whereHas('user', fn ($q) => $q->where('position_id', $leader->position_id))
            ->count();

        $teamRoster = $teamMembers->map(function ($member) {
            $displayName = trim(($member->first_name ?? '') . ' ' . ($member->last_name ?? '')) ?: $member->email;
            return [
                'id' => $member->id,
                'name' => $displayName,
                'email' => $member->email,
                'contactNumber' => $member->contact_number,
                'isTeamLeader' => $member->is_team_leader,
                'avatarUrl' => $member->image_url ? asset('storage/' . $member->image_url) : null,
            ];
        })->values();

        return response()->json([
            'teamRoster' => $teamRoster,
            'attendanceToday' => $attendanceToday,
            'upcomingLeaves' => $upcomingLeaves,
            'stats' => [
                'totalMembers' => $teamRoster->count(),
                'onLeaveToday' => $onLeaveTodayCount,
                'pendingRequests' => $pendingRequestsCount,
            ],
        ]);
    }
}

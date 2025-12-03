<?php

namespace App\Http\Controllers;

use App\Models\Leave;
use App\Models\Position;
use App\Models\ScheduleAssignment;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LeaderboardController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $startDateParam = $request->query('start_date');
        $endDateParam = $request->query('end_date');
        $positionFilter = $request->query('position');

        $start = $startDateParam
            ? Carbon::parse($startDateParam)->startOfDay()
            : Carbon::now()->subDays(89)->startOfDay();
        $end = $endDateParam
            ? Carbon::parse($endDateParam)->endOfDay()
            : Carbon::now()->endOfDay();

        if ($start->greaterThan($end)) {
            [$start, $end] = [$end->copy()->startOfDay(), $start->copy()->endOfDay()];
        }

        $positions = Position::query()
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(fn ($position) => [
                'id' => $position->id,
                'name' => $position->name,
            ]);

        $employeesQuery = User::query()
            ->with('position:id,name')
            ->whereNotIn('employment_status', ['terminated', 'resigned']);

        if ($positionFilter) {
            $employeesQuery->whereHas('position', function ($query) use ($positionFilter) {
                $query->where('name', $positionFilter);
            });
        }

        $employees = $employeesQuery->get([
            'id',
            'first_name',
            'middle_name',
            'last_name',
            'email',
            'position_id',
            'role',
            'is_team_leader',
            'employment_status',
            'image_url',
        ]);

        $employeeIds = $employees->pluck('id');

        if ($employeeIds->isEmpty()) {
            return response()->json([
                'filters' => [
                    'positions' => $positions,
                ],
                'summary' => [
                    'totalPresentDays' => 0,
                    'totalAbsences' => 0,
                    'totalLates' => 0,
                    'totalOvertime' => 0,
                    'totalLeaveDays' => 0,
                ],
                'leaderboards' => [
                    'overall' => [],
                    'teamLeader' => [],
                    'presence' => [],
                    'tardiness' => [],
                    'overtime' => [],
                    'leave' => [],
                ],
            ]);
        }

        $now = Carbon::now();

        $employeeStats = [];
        foreach ($employees as $employee) {
            $displayName = trim(($employee->first_name ?? '') . ' ' . ($employee->last_name ?? ''));
            if ($displayName === '') {
                $displayName = $employee->email;
            }

            $avatarUrl = $employee->image_url ? asset('storage/' . $employee->image_url) : null;

            $employeeStats[$employee->id] = [
                'id' => $employee->id,
                'name' => $displayName,
                'email' => $employee->email,
                'positionTitle' => optional($employee->position)->name ?? 'Unassigned',
                'presentDays' => 0,
                'absences' => 0,
                'lates' => 0,
                'overtimeHours' => 0.0,
                'leaveDays' => 0,
                'attendanceScore' => 0,
                'overallScore' => 0,
                'avatarUrl' => $avatarUrl,
                'isTeamLeader' => $employee->is_team_leader,
                'position_id' => $employee->position_id,
            ];
        }

        $assignments = ScheduleAssignment::query()
            ->with([
                'attendance',
                'schedule:id,date',
            ])
            ->whereIn('user_id', $employeeIds)
            ->whereHas('schedule', function ($query) use ($start, $end) {
                $query->whereBetween('date', [$start->toDateString(), $end->toDateString()]);
            })
            ->get([
                'id',
                'schedule_id',
                'user_id',
                'start_time',
                'end_time',
                'ot_hours',
            ]);

        foreach ($assignments as $assignment) {
            $employeeId = $assignment->user_id;
            if (!isset($employeeStats[$employeeId])) {
                continue;
            }

            $scheduleDate = optional($assignment->schedule)->date;
            if ($scheduleDate === null) {
                continue;
            }

            $assignmentDate = $scheduleDate instanceof Carbon
                ? $scheduleDate
                : Carbon::parse($scheduleDate);

            if ($assignmentDate->lt($start) || $assignmentDate->gt($end)) {
                continue;
            }

            $attendance = $assignment->attendance;
            $status = $attendance?->calculated_status ?? $attendance?->status;
            $normalizedStatus = $status ? strtolower($status) : null;

            if ($attendance === null) {
                if ($assignmentDate->lt($now)) {
                    $employeeStats[$employeeId]['absences']++;
                }
            } else {
                switch ($normalizedStatus) {
                    case 'late':
                        $employeeStats[$employeeId]['presentDays']++;
                        $employeeStats[$employeeId]['lates']++;
                        break;
                    case 'present':
                        $employeeStats[$employeeId]['presentDays']++;
                        break;
                    case 'absent':
                        $employeeStats[$employeeId]['absences']++;
                        break;
                    default:
                        if ($assignmentDate->lt($now)) {
                            $employeeStats[$employeeId]['absences']++;
                        }
                        break;
                }
            }

            $overtime = $assignment->ot_hours;
            if (is_numeric($overtime)) {
                $employeeStats[$employeeId]['overtimeHours'] += (float) $overtime;
            }
        }

        $approvedLeaves = Leave::query()
            ->whereIn('user_id', $employeeIds)
            ->where('status', 'Approved')
            ->where(function ($query) use ($start, $end) {
                $query
                    ->whereBetween('date_from', [$start->toDateString(), $end->toDateString()])
                    ->orWhereBetween('date_to', [$start->toDateString(), $end->toDateString()])
                    ->orWhere(function ($nested) use ($start, $end) {
                        $nested
                            ->where('date_from', '<=', $start->toDateString())
                            ->where('date_to', '>=', $end->toDateString());
                    });
            })
            ->get(['user_id', 'date_from', 'date_to']);

        foreach ($approvedLeaves as $leave) {
            if (!isset($employeeStats[$leave->user_id])) {
                continue;
            }

            $leaveStart = Carbon::parse($leave->date_from)->startOfDay();
            $leaveEnd = Carbon::parse($leave->date_to)->endOfDay();

            $overlapStart = $leaveStart->greaterThan($start) ? $leaveStart : $start;
            $overlapEnd = $leaveEnd->lessThan($end) ? $leaveEnd : $end;

            if ($overlapStart->gt($overlapEnd)) {
                continue;
            }

            $days = $overlapStart->diffInDays($overlapEnd) + 1;
            $employeeStats[$leave->user_id]['leaveDays'] += $days;
        }

        foreach ($employeeStats as &$stat) {
            $attendanceScore = 100 - ($stat['absences'] * 5) - ($stat['lates'] * 2);
            $stat['attendanceScore'] = round(max(0, $attendanceScore), 2);
            $stat['overallScore'] = $stat['attendanceScore'];
            $stat['overtimeHours'] = round($stat['overtimeHours'], 2);
            $stat['leaveDays'] = round($stat['leaveDays'], 2);
        }
        unset($stat);

        $statsCollection = collect($employeeStats)->values();

        $overallLeaderboard = $statsCollection
            ->sortByDesc('overallScore')
            ->values()
            ->map(fn ($stat) => $this->formatEmployeeEntry($stat));

        $presenceLeaderboard = $statsCollection
            ->sortByDesc('presentDays')
            ->values()
            ->map(fn ($stat) => $this->formatEmployeeEntry($stat));

        $tardinessLeaderboard = $statsCollection
            ->sortByDesc('lates')
            ->values()
            ->map(fn ($stat) => $this->formatEmployeeEntry($stat));

        $overtimeLeaderboard = $statsCollection
            ->sortByDesc('overtimeHours')
            ->values()
            ->map(fn ($stat) => $this->formatEmployeeEntry($stat));

        $leaveLeaderboard = $statsCollection
            ->sortByDesc('leaveDays')
            ->values()
            ->map(fn ($stat) => $this->formatEmployeeEntry($stat));

        $teamLeaderLeaderboard = $this->buildTeamLeaderLeaderboard($employees, $employeeStats);

        $summary = [
            'totalPresentDays' => round($statsCollection->sum('presentDays'), 2),
            'totalAbsences' => round($statsCollection->sum('absences'), 2),
            'totalLates' => round($statsCollection->sum('lates'), 2),
            'totalOvertime' => round($statsCollection->sum('overtimeHours'), 2),
            'totalLeaveDays' => round($statsCollection->sum('leaveDays'), 2),
        ];

        return response()->json([
            'filters' => [
                'positions' => $positions,
            ],
            'summary' => $summary,
            'leaderboards' => [
                'overall' => $overallLeaderboard,
                'teamLeader' => $teamLeaderLeaderboard,
                'presence' => $presenceLeaderboard,
                'tardiness' => $tardinessLeaderboard,
                'overtime' => $overtimeLeaderboard,
                'leave' => $leaveLeaderboard,
            ],
        ]);
    }

    private function formatEmployeeEntry(array $stat): array
    {
        return [
            'id' => $stat['id'],
            'name' => $stat['name'],
            'email' => $stat['email'],
            'positionTitle' => $stat['positionTitle'],
            'presentDays' => $stat['presentDays'],
            'absences' => $stat['absences'],
            'lates' => $stat['lates'],
            'overtimeHours' => $stat['overtimeHours'],
            'leaveDays' => $stat['leaveDays'],
            'attendanceScore' => $stat['attendanceScore'],
            'overallScore' => $stat['overallScore'],
            'avatarUrl' => $stat['avatarUrl'],
            'isTeamLeader' => $stat['isTeamLeader'],
        ];
    }

    private function buildTeamLeaderLeaderboard($employees, array $stats)
    {
        $leaders = $employees->filter(fn ($employee) => $employee->is_team_leader);

        $entries = [];
        foreach ($leaders as $leader) {
            $teamMembers = $employees->filter(function ($employee) use ($leader) {
                if ($employee->id === $leader->id) {
                    return false;
                }

                return $employee->position_id === $leader->position_id && !$employee->is_team_leader;
            });

            if ($teamMembers->isEmpty()) {
                continue;
            }

            $scores = [];
            foreach ($teamMembers as $member) {
                if (isset($stats[$member->id])) {
                    $scores[] = $stats[$member->id]['overallScore'];
                }
            }

            if (count($scores) === 0) {
                continue;
            }

            $displayName = trim(($leader->first_name ?? '') . ' ' . ($leader->last_name ?? ''));
            if ($displayName === '') {
                $displayName = $leader->email;
            }

            $avatarUrl = $leader->image_url ? asset('storage/' . $leader->image_url) : null;

            $entries[] = [
                'id' => $leader->id,
                'name' => $displayName,
                'email' => $leader->email,
                'positionTitle' => optional($leader->position)->name ?? 'Unassigned',
                'averageTeamScore' => round(array_sum($scores) / count($scores), 2),
                'teamSize' => count($scores),
                'avatarUrl' => $avatarUrl,
            ];
        }

        usort($entries, fn ($a, $b) => $b['averageTeamScore'] <=> $a['averageTeamScore']);

        return $entries;
    }
}

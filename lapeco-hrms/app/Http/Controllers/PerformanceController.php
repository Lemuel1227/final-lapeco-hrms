<?php

namespace App\Http\Controllers;

use App\Models\PerformanceEvaluation;
use App\Models\PerformanceEvaluationPeriod;
use App\Models\PerformanceEvaluatorResponse;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class PerformanceController extends Controller
{
    public function index(Request $request)
    {
        $periods = PerformanceEvaluationPeriod::with([
            'creator:id,first_name,last_name,email',
            'updater:id,first_name,last_name,email',
            'evaluations' => function ($query) {
                $query->with([
                    'employee:id,first_name,middle_name,last_name,email,role,position_id',
                    'responses.evaluator:id,first_name,middle_name,last_name,email,role,position_id',
                ])->orderBy('employee_id');
            },
        ])->orderByDesc('evaluation_start')->get();

        $data = $periods->map(function (PerformanceEvaluationPeriod $period) {
            return [
                'id' => $period->id,
                'name' => $period->name,
                'evaluationStart' => $period->evaluation_start?->toDateString(),
                'evaluationEnd' => $period->evaluation_end?->toDateString(),
                'openDate' => $period->open_date?->toDateString(),
                'closeDate' => $period->close_date?->toDateString(),
                'status' => $period->status,
                'overallScore' => $period->overall_score ? (float) $period->overall_score : null,
                'createdBy' => $period->creator?->only(['id', 'first_name', 'middle_name', 'last_name', 'email']),
                'updatedBy' => $period->updater?->only(['id', 'first_name', 'middle_name', 'last_name', 'email']),
                'createdAt' => $period->created_at?->toIso8601String(),
                'updatedAt' => $period->updated_at?->toIso8601String(),
                'evaluations' => $period->evaluations->map(function (PerformanceEvaluation $evaluation) {
                    return [
                        'id' => $evaluation->id,
                        'periodId' => $evaluation->period_id,
                        'employeeId' => $evaluation->employee_id,
                        'employee' => $evaluation->employee?->only(['id', 'first_name', 'middle_name', 'last_name', 'email', 'role', 'position_id']),
                        'averageScore' => $evaluation->average_score ? (float) $evaluation->average_score : null,
                        'responsesCount' => $evaluation->responses_count,
                        'completedAt' => $evaluation->completed_at?->toIso8601String(),
                        'responses' => $evaluation->responses->map(function (PerformanceEvaluatorResponse $response) {
                            return [
                                'id' => $response->id,
                                'evaluationId' => $response->evaluation_id,
                                'evaluatorId' => $response->evaluator_id,
                                'evaluator' => $response->evaluator?->only(['id', 'first_name', 'middle_name', 'last_name', 'email', 'role', 'position_id']),
                                'evaluatedOn' => $response->evaluated_on?->toIso8601String(),
                                'scores' => collect(PerformanceEvaluatorResponse::SCORE_FIELDS)
                                    ->mapWithKeys(fn ($field) => [$field => (int) $response->{$field}])
                                    ->all(),
                                'overallScore' => $response->overall_score,
                                'commentSummary' => $response->evaluators_comment_summary,
                                'commentDevelopment' => $response->evaluators_comment_development,
                                'createdAt' => $response->created_at?->toIso8601String(),
                                'updatedAt' => $response->updated_at?->toIso8601String(),
                            ];
                        }),
                    ];
                }),
            ];
        });

        return response()->json([
            'evaluationPeriods' => $data,
        ]);
    }

    /**
     * Get optimized performance overview data for active employees
     * Returns only employee name, position, and combined average score
     */
    public function overview(Request $request)
    {
        // Get all active employees with their position information
        $activeEmployees = User::query()
            ->whereNotIn('employment_status', ['terminated', 'resigned'])
            ->with(['position:id,name'])
            ->select('id', 'first_name', 'middle_name', 'last_name', 'position_id', 'image_url')
            ->get();

        // Get all evaluations with their average scores
        $evaluations = PerformanceEvaluation::query()
            ->select('employee_id', 'average_score')
            ->whereNotNull('average_score')
            ->get();

        // Group evaluations by employee and calculate combined average
        $employeeScores = $evaluations->groupBy('employee_id')
            ->map(function ($employeeEvaluations) {
                $validScores = $employeeEvaluations->pluck('average_score')->filter();
                return $validScores->isNotEmpty() ? $validScores->avg() : null;
            });

        // Build the response data
        $performanceOverview = $activeEmployees->map(function ($employee) use ($employeeScores) {
            return [
                'id' => $employee->id,
                'name' => trim($employee->first_name . ' ' . ($employee->middle_name ?? '') . ' ' . $employee->last_name),
                'position' => $employee->position?->name ?? 'Unassigned',
                'combinedAverageScore' => $employeeScores->get($employee->id) ? round($employeeScores->get($employee->id), 2) : null,
                'profilePictureUrl' => $employee->image_url ? asset('storage/' . $employee->image_url) : null,
            ];
        });

        return response()->json([
            'employees' => $performanceOverview,
        ]);
    }

    /**
     * Get evaluation history for a specific employee, including periods and response counts.
     */
    public function employeeHistory(Request $request, User $employee)
    {
        $employee->load(['position:id,name']);

        $evaluations = PerformanceEvaluation::query()
            ->with([
                'period:id,name,evaluation_start,evaluation_end,status,open_date,close_date',
                'responses' => function ($query) {
                    $query->with([
                        'evaluator:id,first_name,middle_name,last_name,email,role,position_id',
                    ])->orderBy('evaluated_on');
                },
            ])
            ->where('employee_id', $employee->id)
            ->orderByDesc('id')
            ->get();

        $history = $evaluations->map(function (PerformanceEvaluation $evaluation) {
            $period = $evaluation->period;

            return [
                'evaluationId' => $evaluation->id,
                'periodId' => $evaluation->period_id,
                'periodName' => $period?->name,
                'periodStart' => $period?->evaluation_start?->toDateString(),
                'periodEnd' => $period?->evaluation_end?->toDateString(),
                'openDate' => $period?->open_date?->toDateString(),
                'closeDate' => $period?->close_date?->toDateString(),
                'status' => $period?->status,
                'averageScore' => $evaluation->average_score ? (float) $evaluation->average_score : null,
                'responsesCount' => $evaluation->responses_count ?? $evaluation->responses->count(),
                'responses' => $evaluation->responses->map(function (PerformanceEvaluatorResponse $response) {
                    return [
                        'id' => $response->id,
                        'evaluationId' => $response->evaluation_id,
                        'evaluatorId' => $response->evaluator_id,
                        'evaluator' => $response->evaluator?->only(['id', 'first_name', 'middle_name', 'last_name', 'email', 'role', 'position_id']),
                        'evaluatedOn' => $response->evaluated_on?->toIso8601String(),
                        'scores' => collect(PerformanceEvaluatorResponse::SCORE_FIELDS)
                            ->mapWithKeys(fn ($field) => [$field => (int) $response->{$field}])
                            ->all(),
                        'overallScore' => $response->overall_score ? (float) $response->overall_score : null,
                        'commentSummary' => $response->evaluators_comment_summary,
                        'commentDevelopment' => $response->evaluators_comment_development,
                        'createdAt' => $response->created_at?->toIso8601String(),
                        'updatedAt' => $response->updated_at?->toIso8601String(),
                    ];
                })->values(),
            ];
        })->values();

        return response()->json([
            'employee' => [
                'id' => $employee->id,
                'name' => trim(collect([$employee->first_name, $employee->middle_name, $employee->last_name])->filter()->implode(' ')),
                'position' => $employee->position?->name ?? 'Unassigned',
                'profilePictureUrl' => $employee->image_url ? asset('storage/' . $employee->image_url) : null,
            ],
            'history' => $history,
        ]);
    }

    public function storePeriod(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'evaluation_start' => 'required|date',
            'evaluation_end' => 'required|date|after_or_equal:evaluation_start',
            'status' => 'nullable|string|in:scheduled,active,closed',
            'open_date' => 'nullable|date',
            'close_date' => 'nullable|date|after_or_equal:open_date',
            'overall_score' => 'nullable|numeric|min:0',
        ]);

        return DB::transaction(function () use ($validated, $user) {
            $period = PerformanceEvaluationPeriod::create([
                'name' => $validated['name'],
                'evaluation_start' => $validated['evaluation_start'],
                'evaluation_end' => $validated['evaluation_end'],
                'status' => $validated['status'] ?? 'scheduled',
                'open_date' => $validated['open_date'] ?? null,
                'close_date' => $validated['close_date'] ?? null,
                'overall_score' => $validated['overall_score'] ?? null,
                'created_by' => $user?->id,
                'updated_by' => $user?->id,
            ]);

            $this->seedEvaluationsForPeriod($period);

            return response()->json([
                'message' => 'Evaluation period created successfully.',
                'period' => $period->fresh(['evaluations']),
            ], 201);
        });
    }

    public function updatePeriod(Request $request, PerformanceEvaluationPeriod $period)
    {
        $user = $request->user();

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'evaluation_start' => 'sometimes|date',
            'evaluation_end' => 'sometimes|date|after_or_equal:evaluation_start',
            'status' => 'sometimes|string|in:scheduled,active,closed',
            'open_date' => 'nullable|date',
            'close_date' => 'nullable|date|after_or_equal:open_date',
            'overall_score' => 'nullable|numeric|min:0',
        ]);

        if (isset($validated['evaluation_start']) && !isset($validated['evaluation_end'])) {
            $validated['evaluation_end'] = $period->evaluation_end?->toDateString();
        }

        if (isset($validated['evaluation_end']) && !isset($validated['evaluation_start'])) {
            $validated['evaluation_start'] = $period->evaluation_start?->toDateString();
        }

        if (isset($validated['evaluation_start'], $validated['evaluation_end']) &&
            Carbon::parse($validated['evaluation_end'])->lt(Carbon::parse($validated['evaluation_start']))) {
            return response()->json([
                'message' => 'Evaluation end date must be on or after the start date.',
                'error_type' => 'validation_error',
            ], 422);
        }

        $period->fill($validated);
        $period->updated_by = $user?->id;
        $period->save();

        return response()->json([
            'message' => 'Evaluation period updated successfully.',
            'period' => $period->fresh(['evaluations']),
        ]);
    }

    public function storeEvaluationResponse(Request $request, PerformanceEvaluation $evaluation)
    {
        $user = $request->user();
        $employee = $evaluation->employee;
        $period = $evaluation->period;

        if (!$employee) {
            return response()->json([
                'message' => 'The employee being evaluated could not be found.',
                'error_type' => 'not_found',
            ], 404);
        }

        if (!$period) {
            return response()->json([
                'message' => 'The evaluation period could not be found.',
                'error_type' => 'not_found',
            ], 404);
        }

        $now = now();
        $opensAt = $period->open_date?->startOfDay();
        $closesAt = $period->close_date?->endOfDay();

        if ($opensAt && $now->lt($opensAt)) {
            return response()->json([
                'message' => 'Evaluations are not yet open for this period.',
                'error_type' => 'evaluation_window_closed',
            ], 403);
        }

        if ($closesAt && $now->gt($closesAt)) {
            return response()->json([
                'message' => 'This evaluation period is closed for submissions.',
                'error_type' => 'evaluation_window_closed',
            ], 403);
        }

        if (!$this->canEvaluate($user, $employee)) {
            return response()->json([
                'message' => 'You are not authorized to evaluate this employee.',
                'error_type' => 'authorization_error',
            ], 403);
        }

        $scoreRules = collect(PerformanceEvaluatorResponse::SCORE_FIELDS)
            ->mapWithKeys(fn ($field) => [$field => 'required|integer|min:1|max:5'])
            ->all();

        $validated = $request->validate(array_merge($scoreRules, [
            'evaluators_comment_summary' => 'nullable|string',
            'evaluators_comment_development' => 'nullable|string',
        ]));

        return DB::transaction(function () use ($evaluation, $user, $validated) {
            $payload = array_merge($validated, [
                'evaluation_id' => $evaluation->id,
                'evaluator_id' => $user->id,
                'evaluated_on' => now(),
            ]);

            $response = PerformanceEvaluatorResponse::updateOrCreate(
                [
                    'evaluation_id' => $evaluation->id,
                    'evaluator_id' => $user->id,
                ],
                $payload
            );

            $this->refreshEvaluationAggregate($evaluation);

            return response()->json([
                'message' => 'Evaluation response saved successfully.',
                'response' => $response->fresh(['evaluator']),
            ], 201);
        });
    }

    public function updateEvaluation(Request $request, PerformanceEvaluatorResponse $response)
    {
        $user = $request->user();
        $evaluation = $response->evaluation;
        $period = $evaluation?->period;

        if (!$evaluation) {
            return response()->json([
                'message' => 'Evaluation not found.',
                'error_type' => 'not_found',
            ], 404);
        }

        if (!$period) {
            return response()->json([
                'message' => 'The evaluation period could not be found.',
                'error_type' => 'not_found',
            ], 404);
        }

        $now = now();
        $opensAt = $period->open_date?->startOfDay();
        $closesAt = $period->close_date?->endOfDay();

        if ($opensAt && $now->lt($opensAt)) {
            return response()->json([
                'message' => 'Evaluations are not yet open for this period.',
                'error_type' => 'evaluation_window_closed',
            ], 403);
        }

        if ($closesAt && $now->gt($closesAt)) {
            return response()->json([
                'message' => 'This evaluation period is closed for submissions.',
                'error_type' => 'evaluation_window_closed',
            ], 403);
        }

        if ($response->evaluator_id !== $user->id && $user->role !== 'HR_PERSONNEL') {
            return response()->json([
                'message' => 'You are not authorized to modify this evaluation response.',
                'error_type' => 'authorization_error',
            ], 403);
        }

        $scoreRules = collect(PerformanceEvaluatorResponse::SCORE_FIELDS)
            ->mapWithKeys(fn ($field) => [$field => 'sometimes|integer|min:1|max:5'])
            ->all();

        $validated = $request->validate(array_merge($scoreRules, [
            'evaluators_comment_summary' => 'nullable|string',
            'evaluators_comment_development' => 'nullable|string',
        ]));

        $response->fill($validated);
        $response->evaluated_on = now();
        $response->save();

        $this->refreshEvaluationAggregate($evaluation);

        return response()->json([
            'message' => 'Evaluation response updated successfully.',
            'response' => $response->fresh(['evaluator']),
        ]);
    }

    private function refreshEvaluationAggregate(PerformanceEvaluation $evaluation): void
    {
        $evaluation->load('responses');

        $responses = $evaluation->responses;
        $average = $responses->isEmpty()
            ? null
            : round($responses->avg(fn (PerformanceEvaluatorResponse $response) => $response->overall_score), 2);

        $evaluation->update([
            'average_score' => $average,
            'responses_count' => $responses->count(),
            'completed_at' => $responses->isNotEmpty() ? now() : null,
        ]);
    }

    private function seedEvaluationsForPeriod(PerformanceEvaluationPeriod $period): void
    {
        $activeEmployees = User::query()
            ->whereNotIn('employment_status', ['terminated', 'resigned'])
            ->get(['id', 'role', 'position_id']);

        if ($activeEmployees->isEmpty()) {
            return;
        }

        $leadersByPosition = $activeEmployees
            ->where('role', 'TEAM_LEADER')
            ->groupBy('position_id');

        $employeesByPosition = $activeEmployees
            ->where('role', 'REGULAR_EMPLOYEE')
            ->groupBy('position_id');

        // Leaders evaluating members
        foreach ($leadersByPosition as $positionId => $leaders) {
            $members = $employeesByPosition->get($positionId, collect());

            foreach ($leaders as $leader) {
                foreach ($members as $member) {
                    PerformanceEvaluation::firstOrCreate([
                        'period_id' => $period->id,
                        'employee_id' => $member->id,
                    ]);
                }
            }
        }

        // Members evaluating their leader
        foreach ($employeesByPosition as $positionId => $members) {
            $leader = $leadersByPosition->get($positionId, collect())->first();

            if (!$leader) {
                continue;
            }

            PerformanceEvaluation::firstOrCreate([
                'period_id' => $period->id,
                'employee_id' => $leader->id,
            ]);
        }
    }

    private function canEvaluate(User $evaluator, User $employee): bool
    {
        if ($evaluator->role === 'HR_PERSONNEL') {
            return true;
        }

        if ($employee->role === 'TEAM_LEADER') {
            return $evaluator->role === 'REGULAR_EMPLOYEE'
                && $evaluator->position_id
                && $evaluator->position_id === $employee->position_id;
        }

        if ($employee->role === 'REGULAR_EMPLOYEE') {
            return $evaluator->role === 'TEAM_LEADER'
                && $evaluator->position_id
                && $evaluator->position_id === $employee->position_id;
        }

        return false;
    }
}

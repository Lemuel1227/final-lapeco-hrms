<?php

namespace App\Http\Controllers;

use App\Models\Notification;
use App\Models\PerformanceEvaluation;
use App\Models\PerformanceEvaluationPeriod;
use App\Models\PerformanceEvaluatorResponse;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use App\Traits\LogsActivity;

class PerformanceController extends Controller
{
    use LogsActivity;
    public function index(Request $request)
    {
        $periods = PerformanceEvaluationPeriod::with([
            'creator:id,first_name,last_name,email',
            'updater:id,first_name,last_name,email',
            'evaluations' => function ($query) {
                $query->with([
                    'employee:id,first_name,middle_name,last_name,email,role,is_team_leader,position_id',
                    'responses.evaluator:id,first_name,middle_name,last_name,email,role,is_team_leader,position_id',
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
                    $role = $evaluation->employee ? ($evaluation->employee->is_team_leader ? 'TEAM_LEADER' : $evaluation->employee->role) : null;
                    return [
                        'id' => $evaluation->id,
                        'periodId' => $evaluation->period_id,
                        'employeeId' => $evaluation->employee_id,
                        'employee' => $evaluation->employee ? array_merge(
                            $evaluation->employee->only(['id', 'first_name', 'middle_name', 'last_name', 'email', 'position_id']),
                            ['role' => $role]
                        ) : null,
                        'averageScore' => $evaluation->average_score ? (float) $evaluation->average_score : null,
                        'responsesCount' => $evaluation->responses_count,
                        'completedAt' => $evaluation->completed_at?->toIso8601String(),
                        'responses' => $evaluation->responses->map(function (PerformanceEvaluatorResponse $response) {
                            return [
                                'id' => $response->id,
                                'evaluationId' => $response->evaluation_id,
                                'evaluatorId' => $response->evaluator_id,
                                'evaluator' => $response->evaluator ? array_merge(
                                    $response->evaluator->only(['id', 'first_name', 'middle_name', 'last_name', 'email', 'position_id']),
                                    ['role' => $response->evaluator->is_team_leader ? 'TEAM_LEADER' : $response->evaluator->role]
                                ) : null,
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

    public function showPeriod(Request $request, PerformanceEvaluationPeriod $period)
    {
        $period->load([
            'creator:id,first_name,last_name,email',
            'updater:id,first_name,last_name,email',
            'evaluations' => function ($query) {
                $query->with([
                    'employee:id,first_name,middle_name,last_name,email,role,is_team_leader,position_id,image_url',
                    'responses.evaluator:id,first_name,middle_name,last_name,email,role,is_team_leader,position_id,image_url',
                ])->orderBy('employee_id');
            },
        ]);

        $evaluationsCollection = $period->evaluations;

        $evaluations = $evaluationsCollection->map(function (PerformanceEvaluation $evaluation) {
            $employee = $evaluation->employee;
            $employeeName = $employee ? trim(collect([
                $employee->first_name,
                $employee->middle_name,
                $employee->last_name,
            ])->filter()->implode(' ')) : null;

            return [
                'id' => $evaluation->id,
                'periodId' => $evaluation->period_id,
                'employeeId' => $evaluation->employee_id,
                'employee' => $employee ? [
                    'id' => $employee->id,
                    'firstName' => $employee->first_name,
                    'middleName' => $employee->middle_name,
                    'lastName' => $employee->last_name,
                    'email' => $employee->email,
                    'role' => $employee->is_team_leader ? 'TEAM_LEADER' : $employee->role,
                    'positionId' => $employee->position_id,
                    'profilePictureUrl' => $employee->image_url ? asset('storage/' . $employee->image_url) : null,
                ] : null,
                'employeeName' => $employeeName,
                'averageScore' => $evaluation->average_score ? (float) $evaluation->average_score : null,
                'responsesCount' => $evaluation->responses_count ?? $evaluation->responses?->count() ?? 0,
                'completedAt' => $evaluation->completed_at?->toIso8601String(),
                'responses' => $evaluation->responses->map(function (PerformanceEvaluatorResponse $response) {
                    $evaluator = $response->evaluator;
                    $evaluatorName = $evaluator ? trim(collect([
                        $evaluator->first_name,
                        $evaluator->middle_name,
                        $evaluator->last_name,
                    ])->filter()->implode(' ')) : null;

                    return [
                        'id' => $response->id,
                        'evaluationId' => $response->evaluation_id,
                        'evaluatorId' => $response->evaluator_id,
                        'evaluator' => $evaluator ? [
                            'id' => $evaluator->id,
                            'firstName' => $evaluator->first_name,
                            'middleName' => $evaluator->middle_name,
                            'lastName' => $evaluator->last_name,
                            'email' => $evaluator->email,
                            'role' => $evaluator->is_team_leader ? 'TEAM_LEADER' : $evaluator->role,
                            'positionId' => $evaluator->position_id,
                            'profilePictureUrl' => $evaluator->image_url ? asset('storage/' . $evaluator->image_url) : null,
                        ] : null,
                        'evaluatorName' => $evaluatorName,
                        'evaluatedOn' => $response->evaluated_on?->toIso8601String(),
                        'overallScore' => $response->overall_score ? (float) $response->overall_score : null,
                        'scores' => collect(PerformanceEvaluatorResponse::SCORE_FIELDS)
                            ->mapWithKeys(fn ($field) => [$field => (int) $response->{$field}])
                            ->all(),
                        'commentSummary' => $response->evaluators_comment_summary,
                        'commentDevelopment' => $response->evaluators_comment_development,
                        'createdAt' => $response->created_at?->toIso8601String(),
                        'updatedAt' => $response->updated_at?->toIso8601String(),
                    ];
                })->values(),
            ];
        })->values();

        $totalEvaluations = $evaluationsCollection->count();
        $completedEvaluations = $evaluationsCollection->filter(function (PerformanceEvaluation $evaluation) {
            return $evaluation->completed_at !== null || ($evaluation->responses_count ?? 0) > 0;
        })->count();
        $pendingEvaluations = max($totalEvaluations - $completedEvaluations, 0);

        $periodData = [
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
            'evaluations' => $evaluations,
            'completion' => [
                'totalEvaluations' => $totalEvaluations,
                'completedEvaluations' => $completedEvaluations,
                'pendingEvaluations' => $pendingEvaluations,
                'completionRate' => $totalEvaluations > 0 ? round(($completedEvaluations / $totalEvaluations) * 100, 2) : 0,
            ],
        ];

        return response()->json([
            'period' => $periodData,
        ]);
    }

    /**
     * Return a compact summary of evaluator responses for a given period.
     * Fields: employee name, position, evaluator name, evaluation date, score.
     */
    public function periodEvaluationSummary(Request $request, PerformanceEvaluationPeriod $period)
    {
        $evaluations = PerformanceEvaluation::query()
            ->where('period_id', $period->id)
            ->with([
                'employee:id,first_name,middle_name,last_name,position_id',
                'employee.position:id,name',
                'responses' => function ($query) {
                    $query->select(
                        'id',
                        'evaluation_id',
                        'evaluator_id',
                        'evaluated_on',
                        'attendance',
                        'dedication',
                        'performance_job_knowledge',
                        'performance_work_efficiency_professionalism',
                        'cooperation_task_acceptance',
                        'cooperation_adaptability',
                        'initiative_autonomy',
                        'initiative_under_pressure',
                        'communication',
                        'teamwork',
                        'character',
                        'responsiveness',
                        'personality',
                        'appearance',
                        'work_habits'
                    )->with([
                        'evaluator:id,first_name,middle_name,last_name,position_id',
                        'evaluator.position:id,name'
                    ]);
                },
            ])
            ->get();

        $summary = [];

        foreach ($evaluations as $evaluation) {
            foreach ($evaluation->responses as $response) {
                $score = $response->overall_score;

                $summary[] = [
                    'employee' => trim(collect([
                        $evaluation->employee?->first_name,
                        $evaluation->employee?->middle_name,
                        $evaluation->employee?->last_name,
                    ])->filter()->implode(' ')) ?: 'Employee',
                    'position' => $evaluation->employee?->position?->name ?? 'Unassigned',
                    'evaluator' => trim(collect([
                        $response->evaluator?->first_name,
                        $response->evaluator?->middle_name,
                        $response->evaluator?->last_name,
                    ])->filter()->implode(' ')) ?: 'Evaluator',
                    'evaluationDate' => $response->evaluated_on?->toDateString(),
                    'overallScore' => $score,
                ];
            }

            if ($evaluation->responses->isEmpty() && $evaluation->average_score !== null) {
                $score = $evaluation->average_score;

                $summary[] = [
                    'employee' => trim(collect([
                        $evaluation->employee?->first_name,
                        $evaluation->employee?->middle_name,
                        $evaluation->employee?->last_name,
                    ])->filter()->implode(' ')) ?: 'Employee',
                    'position' => $evaluation->employee?->position?->name ?? 'Unassigned',
                    'evaluator' => null,
                    'evaluationDate' => $evaluation->completed_at?->toDateString(),
                    'overallScore' => $score,
                    'score' => $score,
                ];
            }
        }

        return response()->json([
            'period' => [
                'id' => $period->id,
                'name' => $period->name,
            ],
            'evaluations' => $summary,
        ]);
    }

    /**
     * Get detailed responses for a specific evaluation record of an employee.
     */
    public function employeeEvaluationResponses(Request $request, PerformanceEvaluation $evaluation)
    {
        $employee = $evaluation->employee()->firstOrFail();

        $evaluation->loadMissing([
            'period:id,name,evaluation_start,evaluation_end,open_date,close_date',
            'responses' => function ($query) {
                $query->with([
                    'evaluator:id,first_name,middle_name,last_name,email,role,is_team_leader,position_id,image_url',
                    'evaluator.position:id,name'
                ])->orderBy('evaluated_on');
            },
        ]);

        $period = $evaluation->period;

        $responses = $evaluation->responses->map(function (PerformanceEvaluatorResponse $response) {
            $evaluatorUser = $response->evaluator;
            $evaluatorData = null;

            if ($evaluatorUser) {
                $positionName = $evaluatorUser->position?->name ?? 'Unassigned';
                $evaluatorData = [
                    'id' => $evaluatorUser->id,
                    'name' => trim(collect([$evaluatorUser->first_name, $evaluatorUser->middle_name, $evaluatorUser->last_name])->filter()->implode(' ')),
                    'email' => $evaluatorUser->email,
                    'role' => $evaluatorUser->is_team_leader ? 'TEAM_LEADER' : $evaluatorUser->role,
                    'position' => $positionName,
                    'profilePictureUrl' => $evaluatorUser->image_url ? asset('storage/' . $evaluatorUser->image_url) : null,
                ];
            }

            return [
                'id' => $response->id,
                'evaluationId' => $response->evaluation_id,
                'evaluatorId' => $response->evaluator_id,
                'evaluator' => $evaluatorData,
                'evaluatedOn' => $response->evaluated_on?->toIso8601String(),
                'overallScore' => $response->overall_score ? (float) $response->overall_score : null,
                'commentSummary' => $response->evaluators_comment_summary,
                'commentDevelopment' => $response->evaluators_comment_development,
                'createdAt' => $response->created_at?->toIso8601String(),
                'updatedAt' => $response->updated_at?->toIso8601String(),
            ];
        })->values();

        return response()->json([
            'evaluation' => [
                'id' => $evaluation->id,
                'employeeId' => $evaluation->employee_id,
                'periodId' => $evaluation->period_id,
                'periodName' => $period?->name,
                'periodStart' => $period?->evaluation_start?->toDateString(),
                'periodEnd' => $period?->evaluation_end?->toDateString(),
                'status' => $period?->status,
                'averageScore' => $evaluation->average_score ? (float) $evaluation->average_score : null,
            ],
            'responses' => $responses,
            'employee' => [
                'id' => $employee->id,
                'name' => trim(collect([$employee->first_name, $employee->middle_name, $employee->last_name])->filter()->implode(' ')),
                'position' => $employee->position?->name ?? 'Unassigned',
                'profilePictureUrl' => $employee->image_url ? asset('storage/' . $employee->image_url) : null,
            ],
        ]);
    }

    /**
     * Get a single evaluator response with full scoring details.
     */
    public function evaluationResponseDetail(Request $request, PerformanceEvaluatorResponse $response)
    {
        $response->loadMissing([
            'evaluation:id,employee_id,period_id,average_score',
            'evaluation.period:id,name,evaluation_start,evaluation_end,open_date,close_date',
            'evaluation.employee:id,first_name,middle_name,last_name,email,position_id,image_url',
            'evaluator:id,first_name,middle_name,last_name,email,role,is_team_leader,position_id,image_url',
            'evaluator.position:id,name',
        ]);

        $evaluation = $response->evaluation;
        $period = $evaluation?->period;
        $employee = $evaluation?->employee;
        $evaluatorUser = $response->evaluator;

        $evaluatorData = null;

        if ($evaluatorUser) {
                $evaluatorData = [
                    'id' => $evaluatorUser->id,
                    'name' => trim(collect([$evaluatorUser->first_name, $evaluatorUser->middle_name, $evaluatorUser->last_name])->filter()->implode(' ')),
                    'email' => $evaluatorUser->email,
                    'role' => $evaluatorUser->is_team_leader ? 'TEAM_LEADER' : $evaluatorUser->role,
                    'position' => $evaluatorUser->position?->name ?? 'Unassigned',
                    'positionId' => $evaluatorUser->position_id,
                    'profilePictureUrl' => $evaluatorUser->image_url ? asset('storage/' . $evaluatorUser->image_url) : null,
                ];
            }

        $scores = collect(PerformanceEvaluatorResponse::SCORE_FIELDS)
            ->mapWithKeys(fn ($field) => [$field => (int) $response->{$field}])
            ->all();

        return response()->json([
            'response' => [
                'id' => $response->id,
                'evaluationId' => $response->evaluation_id,
                'evaluatorId' => $response->evaluator_id,
                'scores' => $scores,
                'overallScore' => $response->overall_score ? (float) $response->overall_score : null,
                'commentSummary' => $response->evaluators_comment_summary,
                'commentDevelopment' => $response->evaluators_comment_development,
                'evaluatedOn' => $response->evaluated_on?->toIso8601String(),
                'createdAt' => $response->created_at?->toIso8601String(),
                'updatedAt' => $response->updated_at?->toIso8601String(),
            ],
            'evaluation' => [
                'id' => $evaluation?->id,
                'employeeId' => $evaluation?->employee_id,
                'periodId' => $evaluation?->period_id,
                'periodName' => $period?->name,
                'periodStart' => $period?->evaluation_start?->toDateString(),
                'periodEnd' => $period?->evaluation_end?->toDateString(),
                'averageScore' => $evaluation?->average_score ? (float) $evaluation->average_score : null,
            ],
            'employee' => $employee ? [
                'id' => $employee->id,
                'name' => trim(collect([$employee->first_name, $employee->middle_name, $employee->last_name])->filter()->implode(' ')),
                'position' => $employee->position?->name ?? 'Unassigned',
                'profilePictureUrl' => $employee->image_url ? asset('storage/' . $employee->image_url) : null,
            ] : null,
            'evaluator' => $evaluatorData,
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
                'period:id,name,evaluation_start,evaluation_end,open_date,close_date',
            ])
            ->where('employee_id', $employee->id)
            ->orderByDesc('id')
            ->get();

        $responseCountsByEvaluation = PerformanceEvaluatorResponse::query()
            ->select('evaluation_id', DB::raw('COUNT(*) as responses_count'))
            ->whereIn('evaluation_id', $evaluations->pluck('id'))
            ->groupBy('evaluation_id')
            ->pluck('responses_count', 'evaluation_id');

        $history = $evaluations->map(function (PerformanceEvaluation $evaluation) use ($responseCountsByEvaluation) {
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
                'responsesCount' => $evaluation->responses_count
                    ?? $responseCountsByEvaluation->get($evaluation->id, 0),
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
            'open_date' => 'nullable|date',
            'close_date' => 'nullable|date|after_or_equal:open_date',
            'overall_score' => 'nullable|numeric|min:0',
        ]);

        return DB::transaction(function () use ($validated, $user) {
            $period = PerformanceEvaluationPeriod::create([
                'name' => $validated['name'],
                'evaluation_start' => $validated['evaluation_start'],
                'evaluation_end' => $validated['evaluation_end'],
                'open_date' => $validated['open_date'] ?? null,
                'close_date' => $validated['close_date'] ?? null,
                'overall_score' => $validated['overall_score'] ?? null,
                'created_by' => $user?->id,
                'updated_by' => $user?->id,
            ]);

            $this->seedEvaluationsForPeriod($period);
            
            // Log activity
            $this->logCreate('evaluation_period', $period->id, $period->name);

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
        
        // Log activity
        $this->logUpdate('evaluation_period', $period->id, $period->name);

        return response()->json([
            'message' => 'Evaluation period updated successfully.',
            'period' => $period->fresh(['evaluations']),
        ]);
    }

    public function deletePeriod($periodId)
    {
        // Find the period or fail
        $period = PerformanceEvaluationPeriod::findOrFail($periodId);

        // Deleting the period will cascade to evaluations and evaluator responses
        // due to FK constraints defined in migrations.
        $period->delete();

        // Log activity
        $this->logDelete('evaluation_period', $periodId, $period->name);

        return response()->json([
            'message' => 'Evaluation period deleted successfully.',
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
            
            // Log activity
            $employeeName = $evaluation->employee ? 
                trim($evaluation->employee->first_name . ' ' . $evaluation->employee->last_name) : 
                'Employee';
            $this->logCustomActivity('evaluate', "Submitted evaluation for {$employeeName}", 'performance_evaluation', $evaluation->id);

            return response()->json([
                'message' => 'Evaluation response saved successfully.',
                'response' => $response->fresh(['evaluator']),
            ], 201);
        });
    }

    public function updateEvaluationResponse(Request $request, PerformanceEvaluatorResponse $response)
    {
        return $this->updateEvaluation($request, $response);
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

        if ($response->evaluator_id !== $user->id && $user->role !== 'SUPER_ADMIN') {
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
            ->get(['id', 'role', 'is_team_leader', 'position_id']);

        if ($activeEmployees->isEmpty()) {
            return;
        }

        $leadersByPosition = $activeEmployees
            ->where('is_team_leader', true)
            ->groupBy('position_id');

        $employeesByPosition = $activeEmployees
            ->where('is_team_leader', false)
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

    /**
     * Get team members to evaluate for the current team leader
     */
    public function getTeamMembersToEvaluate(Request $request)
    {
        $user = $request->user();
        // Allow both Team Leaders and Regular Employees

        // Get active evaluation period (current date must be within date range)
        // No longer checking 'status' column - only dates matter
        $now = now();
        
        $activePeriod = PerformanceEvaluationPeriod::where(function ($query) use ($now) {
                // Use open_date if set, otherwise use evaluation_start
                // Use close_date if set, otherwise use evaluation_end
                $query->whereRaw('DATE(COALESCE(open_date, evaluation_start)) <= ?', [$now->toDateString()])
                      ->whereRaw('DATE(COALESCE(close_date, evaluation_end)) >= ?', [$now->toDateString()]);
            })
            ->orderByDesc('evaluation_start')
            ->first();

        // If no active period, return empty team members
        if (!$activePeriod) {
            return response()->json([
                'teamMembers' => [],
                'activePeriod' => null,
            ]);
        }

        // Get evaluation candidates based on role
        $query = User::query()
            ->where('position_id', $user->position_id)
            ->whereNotIn('employment_status', ['terminated', 'resigned'])
            ->with(['position:id,name'])
            ->select('id', 'first_name', 'middle_name', 'last_name', 'email', 'position_id', 'image_url', 'role', 'is_team_leader');

        if ($user->is_team_leader) {
            // Leaders evaluate regular employees
            $query->where('is_team_leader', false);
        } else {
            // Regular employees evaluate peers in same position (exclude self, exclude leaders)
            $query->where('is_team_leader', false)->where('id', '!=', $user->id);
        }

        $teamMembers = $query->get();

        // Get ALL evaluations for team members to find last evaluation
        $targetEmployeeIds = $teamMembers->pluck('id');
        $allEvaluations = PerformanceEvaluation::query()
            ->whereIn('employee_id', $targetEmployeeIds)
            ->with(['period:id,evaluation_start,evaluation_end', 'responses' => function ($query) use ($user) {
                $query->where('evaluator_id', $user->id);
            }])
            ->orderByDesc('id')
            ->get()
            ->groupBy('employee_id');

        $teamMembersData = $teamMembers->map(function ($member) use ($allEvaluations, $activePeriod, $user) {
            $memberEvaluations = $allEvaluations->get($member->id, collect());
            
            // Get evaluation for active period
            $activeEvaluation = null;
            $submission = null;
            if ($activePeriod) {
                $activeEvaluation = $memberEvaluations->first(function ($eval) use ($activePeriod) {
                    return $eval->period_id === $activePeriod->id;
                });
                
                if ($activeEvaluation) {
                    $submission = $activeEvaluation->responses->first();
                }
            }

            return [
                'id' => $member->id,
                'name' => trim(collect([$member->first_name, $member->middle_name, $member->last_name])->filter()->implode(' ')),
                'firstName' => $member->first_name,
                'middleName' => $member->middle_name,
                'lastName' => $member->last_name,
                'email' => $member->email,
                'positionId' => $member->position_id,
                'position' => $member->position?->name ?? 'Unassigned',
                'role' => $member->is_team_leader ? 'TEAM_LEADER' : $member->role,
                'profilePictureUrl' => $member->image_url ? asset('storage/' . $member->image_url) : null,
                'currentEvaluation' => $activeEvaluation ? [
                    'id' => $activeEvaluation->id,
                    'periodEnd' => $activeEvaluation->period?->evaluation_end?->toIso8601String(),
                    'overallScore' => $submission?->overall_score ? (float) $submission->overall_score : null,
                    'averageScore' => $activeEvaluation->average_score ? (float) $activeEvaluation->average_score : null,
                ] : null,
                'evaluationId' => $activeEvaluation?->id,
                'submissionId' => $submission?->id,
                'submissionScore' => $submission?->overall_score ? (float) $submission->overall_score : null,
                'submittedAt' => $submission?->evaluated_on?->toIso8601String(),
            ];
        })->values();

        return response()->json([
            'teamMembers' => $teamMembersData,
            'activePeriod' => $activePeriod ? [
                'id' => $activePeriod->id,
                'name' => $activePeriod->name,
                'evaluationStart' => $activePeriod->evaluation_start?->toDateString(),
                'evaluationEnd' => $activePeriod->evaluation_end?->toDateString(),
                'openDate' => $activePeriod->open_date?->toDateString(),
                'closeDate' => $activePeriod->close_date?->toDateString(),
                'status' => $activePeriod->status,
            ] : null,
        ]);
    }

    /**
     * Get team leader to evaluate for the current team member
     */
    public function getLeaderToEvaluate(Request $request)
    {
        $user = $request->user();

        // Check if user is a regular employee
        if ($user->is_team_leader || $user->role === 'SUPER_ADMIN') {
            return response()->json([
                'message' => 'Only team members can access this endpoint.',
                'error_type' => 'authorization_error',
            ], 403);
        }

        // Get active evaluation period (current date must be within date range)
        // No longer checking 'status' column - only dates matter
        $now = now();
        
        $activePeriod = PerformanceEvaluationPeriod::where(function ($query) use ($now) {
                // Use open_date if set, otherwise use evaluation_start
                // Use close_date if set, otherwise use evaluation_end
                $query->whereRaw('DATE(COALESCE(open_date, evaluation_start)) <= ?', [$now->toDateString()])
                      ->whereRaw('DATE(COALESCE(close_date, evaluation_end)) >= ?', [$now->toDateString()]);
            })
            ->orderByDesc('evaluation_start')
            ->first();

        // If no active period, return null for team leader
        if (!$activePeriod) {
            return response()->json([
                'teamLeader' => null,
                'activePeriod' => null,
            ]);
        }

        // Get team leader (same position, is team leader)
        $teamLeader = User::query()
            ->where('position_id', $user->position_id)
            ->where('is_team_leader', true)
            ->whereNotIn('employment_status', ['terminated', 'resigned'])
            ->with(['position:id,name'])
            ->select('id', 'first_name', 'middle_name', 'last_name', 'email', 'position_id', 'image_url', 'role', 'is_team_leader')
            ->first();

        if (!$teamLeader) {
            return response()->json([
                'teamLeader' => null,
                'activePeriod' => $activePeriod ? [
                    'id' => $activePeriod->id,
                    'name' => $activePeriod->name,
                    'evaluationStart' => $activePeriod->evaluation_start?->toDateString(),
                    'evaluationEnd' => $activePeriod->evaluation_end?->toDateString(),
                    'openDate' => $activePeriod->open_date?->toDateString(),
                    'closeDate' => $activePeriod->close_date?->toDateString(),
                    'status' => $activePeriod->status,
                ] : null,
            ]);
        }

        // Get ALL evaluations for the team leader
        $allEvaluations = PerformanceEvaluation::query()
            ->where('employee_id', $teamLeader->id)
            ->with(['period:id,evaluation_start,evaluation_end', 'responses' => function ($query) use ($user) {
                $query->where('evaluator_id', $user->id);
            }])
            ->orderByDesc('id')
            ->get();
        
        // Get evaluation for active period
        $activeEvaluation = null;
        $submission = null;
        if ($activePeriod) {
            $activeEvaluation = $allEvaluations->first(function ($eval) use ($activePeriod) {
                return $eval->period_id === $activePeriod->id;
            });
            
            if ($activeEvaluation) {
                $submission = $activeEvaluation->responses->first();
            }
        }

        $teamLeaderData = [
            'id' => $teamLeader->id,
            'name' => trim(collect([$teamLeader->first_name, $teamLeader->middle_name, $teamLeader->last_name])->filter()->implode(' ')),
            'firstName' => $teamLeader->first_name,
            'middleName' => $teamLeader->middle_name,
            'lastName' => $teamLeader->last_name,
            'email' => $teamLeader->email,
            'positionId' => $teamLeader->position_id,
            'position' => $teamLeader->position?->name ?? 'Unassigned',
            'role' => $teamLeader->is_team_leader ? 'TEAM_LEADER' : $teamLeader->role,
            'profilePictureUrl' => $teamLeader->image_url ? asset('storage/' . $teamLeader->image_url) : null,
            'currentEvaluation' => $activeEvaluation ? [
                'id' => $activeEvaluation->id,
                'periodEnd' => $activeEvaluation->period?->evaluation_end?->toIso8601String(),
                'overallScore' => $submission?->overall_score ? (float) $submission->overall_score : null,
                'averageScore' => $activeEvaluation->average_score ? (float) $activeEvaluation->average_score : null,
            ] : null,
            'evaluationId' => $activeEvaluation?->id,
            'submissionId' => $submission?->id,
            'submissionScore' => $submission?->overall_score ? (float) $submission->overall_score : null,
            'submittedAt' => $submission?->evaluated_on?->toIso8601String(),
        ];

        return response()->json([
            'teamLeader' => $teamLeaderData,
            'activePeriod' => $activePeriod ? [
                'id' => $activePeriod->id,
                'name' => $activePeriod->name,
                'evaluationStart' => $activePeriod->evaluation_start?->toDateString(),
                'evaluationEnd' => $activePeriod->evaluation_end?->toDateString(),
                'openDate' => $activePeriod->open_date?->toDateString(),
                'closeDate' => $activePeriod->close_date?->toDateString(),
                'status' => $activePeriod->status,
            ] : null,
        ]);
    }

    private function canEvaluate(User $evaluator, User $employee): bool
    {
        if ($evaluator->role === 'SUPER_ADMIN') {
            return true;
        }

        if ($evaluator->position_id && $evaluator->position_id === $employee->position_id) {
            // Team Leader can evaluate Regular Employee (existing)
            if ($evaluator->is_team_leader && !$employee->is_team_leader) {
                return true;
            }
            // Regular Employee can evaluate Team Leader (existing)
            if (!$evaluator->is_team_leader && $employee->is_team_leader) {
                return true;
            }
            // Regular Employee can evaluate peers in same position
            if (!$evaluator->is_team_leader && !$employee->is_team_leader && $evaluator->id !== $employee->id) {
                return true;
            }
        }

        return false;
    }

    /**
     * Get evaluation tracker data for the active period
     * Returns team-based completion status without individual responses
     */
    public function getEvaluationTrackerData(Request $request)
    {
        // Get the active period (match evaluation endpoints: within open/evaluation date range)
        $now = now();

        $activePeriod = PerformanceEvaluationPeriod::where(function ($query) use ($now) {
                $query->whereRaw('DATE(COALESCE(open_date, evaluation_start)) <= ?', [$now->toDateString()])
                      ->whereRaw('DATE(COALESCE(close_date, evaluation_end)) >= ?', [$now->toDateString()]);
            })
            ->orderByDesc('evaluation_start')
            ->first();

        if (!$activePeriod) {
            return response()->json([
                'activePeriod' => null,
                'teams' => [],
            ]);
        }

        // Get all team leaders with their positions, grouped by position_id to avoid duplicates
        $teamLeaders = User::where('is_team_leader', true)
            ->whereNotIn('employment_status', ['terminated', 'resigned'])
            ->with(['position:id,name'])
            ->get()
            ->groupBy('position_id');

        $teams = [];

        foreach ($teamLeaders as $positionId => $leadersInPosition) {
            // Use the first leader for this position
            $leader = $leadersInPosition->first();
            // Get team members for this leader
            $teamMembers = User::where('is_team_leader', false)
                ->where('position_id', $leader->position_id)
                ->whereNotIn('employment_status', ['terminated', 'resigned'])
                ->get();

            // Get evaluations for this period for team members
            $memberEvaluations = PerformanceEvaluation::where('period_id', $activePeriod->id)
                ->whereIn('employee_id', $teamMembers->pluck('id'))
                ->withCount('responses')
                ->get()
                ->keyBy('employee_id');

            // Get all leader IDs in this position
            $leaderIds = $leadersInPosition->pluck('id');

            $memberEvaluationIds = $memberEvaluations->pluck('id')->filter();

            $leaderResponsesByEvaluation = collect();
            if ($memberEvaluationIds->isNotEmpty()) {
                $leaderResponsesByEvaluation = PerformanceEvaluatorResponse::whereIn('evaluation_id', $memberEvaluationIds)
                    ->whereIn('evaluator_id', $leaderIds)
                    ->get(['id', 'evaluation_id', 'evaluator_id'])
                    ->groupBy('evaluation_id');
            }
            
            // Get evaluations for all leaders in this position
            $leaderEvaluations = PerformanceEvaluation::where('period_id', $activePeriod->id)
                ->whereIn('employee_id', $leaderIds)
                ->withCount('responses')
                ->get();
            
            $leaderEvaluation = $leaderEvaluations->first();

            $leaderEvaluationIds = $leaderEvaluations->pluck('id');

            $memberResponsesOnLeader = collect();
            if ($leaderEvaluationIds->isNotEmpty()) {
                $memberResponsesOnLeader = PerformanceEvaluatorResponse::whereIn('evaluation_id', $leaderEvaluationIds)
                    ->whereIn('evaluator_id', $teamMembers->pluck('id'))
                    ->get(['id', 'evaluation_id', 'evaluator_id'])
                    ->groupBy('evaluator_id');
            }

            // Count how many members ANY leader in this position has evaluated
            $leaderEvaluatedMemberDetails = [];
            $leaderPendingMemberDetails = [];

            $leaderEvaluatedCount = $leaderResponsesByEvaluation->count();

            // Count how many members have evaluated ANY leader in this position
            $membersEvaluatedLeaderCount = $memberResponsesOnLeader->count();

            $completedMembers = [];
            $pendingMembers = [];
            $membersEvaluatedLeaderDetails = [];
            $membersPendingLeaderEvalDetails = [];

            foreach ($teamMembers as $member) {
                $evaluation = $memberEvaluations->get($member->id);
                $hasResponses = $evaluation && $evaluation->responses_count > 0;

                $memberData = [
                    'id' => $member->id,
                    'name' => trim(collect([$member->first_name, $member->middle_name, $member->last_name])->filter()->implode(' ')),
                    'email' => $member->email,
                    'profilePictureUrl' => $member->image_url ? asset('storage/' . $member->image_url) : null,
                    'hasEvaluation' => $hasResponses,
                    'evaluationId' => $evaluation?->id,
                ];

                $leaderMemberData = [
                    'id' => $member->id,
                    'name' => $memberData['name'],
                    'email' => $member->email,
                    'profilePictureUrl' => $memberData['profilePictureUrl'],
                    'evaluationId' => $evaluation?->id,
                ];

                $leaderHasEvaluated = $evaluation && $leaderResponsesByEvaluation->has($evaluation->id);
                $leaderResponse = $leaderHasEvaluated ? optional($leaderResponsesByEvaluation->get($evaluation->id))->first() : null;
                $leaderMemberData['responseId'] = $leaderResponse?->id;

                if ($leaderHasEvaluated) {
                    $leaderEvaluatedMemberDetails[] = $leaderMemberData;
                } else {
                    $leaderPendingMemberDetails[] = $leaderMemberData;
                }

                $memberHasEvaluatedLeader = $memberResponsesOnLeader->has($member->id);
                $memberResponse = $memberHasEvaluatedLeader ? optional($memberResponsesOnLeader->get($member->id))->first() : null;

                $memberLeaderEvalData = [
                    'id' => $member->id,
                    'name' => $memberData['name'],
                    'email' => $member->email,
                    'profilePictureUrl' => $memberData['profilePictureUrl'],
                    'evaluationId' => $leaderEvaluation?->id,
                    'responseId' => $memberResponse?->id,
                ];

                if ($memberHasEvaluatedLeader) {
                    $membersEvaluatedLeaderDetails[] = $memberLeaderEvalData;
                } else {
                    $membersPendingLeaderEvalDetails[] = $memberLeaderEvalData;
                }

                if ($hasResponses) {
                    $completedMembers[] = $memberData;
                } else {
                    $pendingMembers[] = $memberData;
                }
            }

            $leaderEvaluatedCount = count($leaderEvaluatedMemberDetails);
            $membersEvaluatedLeaderCount = count($membersEvaluatedLeaderDetails);
            $leaderFullyEvaluated = $leaderEvaluations->isNotEmpty() && $membersEvaluatedLeaderCount >= $teamMembers->count();

            $teams[] = [
                'positionId' => $leader->position_id,
                'positionTitle' => $leader->position?->name ?? 'Unassigned',
                'teamLeader' => [
                    'id' => $leader->id,
                    'name' => trim(collect([$leader->first_name, $leader->middle_name, $leader->last_name])->filter()->implode(' ')),
                    'email' => $leader->email,
                    'profilePictureUrl' => $leader->image_url ? asset('storage/' . $leader->image_url) : null,
                ],
                'leaderStatus' => [
                    'isEvaluated' => $leaderFullyEvaluated,
                    'evaluationId' => $leaderEvaluation?->id,
                    'evaluatedMembersCount' => $leaderEvaluatedCount,
                    'totalMembersToEvaluate' => $teamMembers->count(),
                    'evaluatedByMembersCount' => $membersEvaluatedLeaderCount,
                    'completedMemberEvals' => $leaderEvaluatedMemberDetails,
                    'pendingMemberEvals' => $leaderPendingMemberDetails,
                ],
                'completedMembers' => $completedMembers,
                'pendingMembers' => $pendingMembers,
                'membersEvaluatedLeader' => $membersEvaluatedLeaderDetails,
                'membersPendingLeader' => $membersPendingLeaderEvalDetails,
            ];
        }

        return response()->json([
            'activePeriod' => [
                'id' => $activePeriod->id,
                'name' => $activePeriod->name,
                'evaluationStart' => $activePeriod->evaluation_start?->toDateString(),
                'evaluationEnd' => $activePeriod->evaluation_end?->toDateString(),
                'openDate' => $activePeriod->open_date?->toDateString(),
                'closeDate' => $activePeriod->close_date?->toDateString(),
                'status' => $activePeriod->status,
            ],
            'teams' => $teams,
        ]);
    }

    public function sendReminders(Request $request)
    {
        $now = now();
        $activePeriod = PerformanceEvaluationPeriod::where(function ($query) use ($now) {
            $query->whereRaw('DATE(COALESCE(open_date, evaluation_start)) <= ?', [$now->toDateString()])
                ->whereRaw('DATE(COALESCE(close_date, evaluation_end)) >= ?', [$now->toDateString()]);
        })
            ->orderByDesc('evaluation_start')
            ->first();

        if (!$activePeriod) {
            return response()->json(['message' => 'No active evaluation period found.'], 404);
        }

        $usersToNotify = [];

        // Logic to find users with pending evaluations
        $evaluations = PerformanceEvaluation::where('period_id', $activePeriod->id)->with('employee')->get();
        $allResponses = PerformanceEvaluatorResponse::whereIn('evaluation_id', $evaluations->pluck('id'))->get();

        foreach ($evaluations as $evaluation) {
            $employee = $evaluation->employee;
            if (!$employee) continue;

            $expectedEvaluators = $this->getExpectedEvaluatorsFor($employee);

            foreach ($expectedEvaluators as $evaluator) {
                $hasResponded = $allResponses->contains(function ($response) use ($evaluation, $evaluator) {
                    return $response->evaluation_id == $evaluation->id && $response->evaluator_id == $evaluator->id;
                });

                if (!$hasResponded) {
                    $usersToNotify[$evaluator->id] = $evaluator;
                }
            }
        }

        foreach ($usersToNotify as $user) {
            $actionUrl = '/dashboard/performance-management'; // Default URL
            if (!$user->is_team_leader) {
                $actionUrl = '/dashboard/evaluate-leader';
            } elseif ($user->is_team_leader) {
                $actionUrl = '/dashboard/evaluate-team';
            }

            Notification::createForUser(
                $user->id,
                'performance_review',
                'Evaluation Reminder',
                'Please complete your pending performance evaluations.',
                ['action_url' => $actionUrl]
            );
        }

        return response()->json(['message' => 'Reminders sent successfully to ' . count($usersToNotify) . ' users.']);
    }

    private function getExpectedEvaluatorsFor(User $employee)
    {
        $evaluators = [];
        if (!$employee->is_team_leader) {
            // Team leader evaluates regular employee
            $leader = User::where('position_id', $employee->position_id)->where('is_team_leader', true)->first();
            if ($leader) {
                $evaluators[] = $leader;
            }
        } elseif ($employee->is_team_leader) {
            // Regular employees evaluate team leader
            $members = User::where('position_id', $employee->position_id)->where('is_team_leader', false)->get();
            foreach ($members as $member) {
                $evaluators[] = $member;
            }
        }
        return $evaluators;
    }
}


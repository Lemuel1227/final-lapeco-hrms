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
                'evaluation_start' => $period->evaluation_start?->toDateString(),
                'evaluation_end' => $period->evaluation_end?->toDateString(),
                'status' => $period->status,
                'description' => $period->description,
                'created_by' => $period->creator?->only(['id', 'first_name', 'middle_name', 'last_name', 'email']),
                'updated_by' => $period->updater?->only(['id', 'first_name', 'middle_name', 'last_name', 'email']),
                'created_at' => $period->created_at?->toDateTimeString(),
                'updated_at' => $period->updated_at?->toDateTimeString(),
                'evaluations' => $period->evaluations->map(function (PerformanceEvaluation $evaluation) {
                    return [
                        'id' => $evaluation->id,
                        'employee' => $evaluation->employee?->only(['id', 'first_name', 'middle_name', 'last_name', 'email', 'role', 'position_id']),
                        'average_score' => $evaluation->average_score ? (float) $evaluation->average_score : null,
                        'responses_count' => $evaluation->responses_count,
                        'completed_at' => $evaluation->completed_at?->toDateTimeString(),
                        'responses' => $evaluation->responses->map(function (PerformanceEvaluatorResponse $response) {
                            return [
                                'id' => $response->id,
                                'evaluator' => $response->evaluator?->only(['id', 'first_name', 'middle_name', 'last_name', 'email', 'role', 'position_id']),
                                'evaluated_on' => $response->evaluated_on?->toDateTimeString(),
                                'scores' => collect(PerformanceEvaluatorResponse::SCORE_FIELDS)
                                    ->mapWithKeys(fn ($field) => [$field => (int) $response->{$field}])
                                    ->all(),
                                'overall_score' => $response->overall_score,
                                'remarks' => $response->remarks,
                                'created_at' => $response->created_at?->toDateTimeString(),
                                'updated_at' => $response->updated_at?->toDateTimeString(),
                            ];
                        }),
                    ];
                }),
            ];
        });

        return response()->json($data);
    }

    public function storePeriod(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'evaluation_start' => 'required|date',
            'evaluation_end' => 'required|date|after_or_equal:evaluation_start',
            'status' => 'nullable|string|in:scheduled,active,closed',
            'description' => 'nullable|string',
            'employee_ids' => 'nullable|array',
            'employee_ids.*' => 'exists:users,id',
        ]);

        return DB::transaction(function () use ($validated, $user) {
            $period = PerformanceEvaluationPeriod::create([
                'name' => $validated['name'],
                'evaluation_start' => $validated['evaluation_start'],
                'evaluation_end' => $validated['evaluation_end'],
                'status' => $validated['status'] ?? 'scheduled',
                'description' => $validated['description'] ?? null,
                'created_by' => $user?->id,
                'updated_by' => $user?->id,
            ]);

            $employees = collect($validated['employee_ids'] ?? [])
                ->unique()
                ->values();

            $employees->each(function ($employeeId) use ($period) {
                PerformanceEvaluation::firstOrCreate([
                    'period_id' => $period->id,
                    'employee_id' => $employeeId,
                ]);
            });

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
            'description' => 'nullable|string',
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

    public function assignEmployees(Request $request, PerformanceEvaluationPeriod $period)
    {
        $validated = $request->validate([
            'employee_ids' => 'required|array|min:1',
            'employee_ids.*' => 'exists:users,id',
        ]);

        return DB::transaction(function () use ($validated, $period) {
            $created = collect([]);
            collect($validated['employee_ids'])
                ->unique()
                ->each(function ($employeeId) use ($period, $created) {
                    $evaluation = PerformanceEvaluation::firstOrCreate([
                        'period_id' => $period->id,
                        'employee_id' => $employeeId,
                    ]);
                    $created->push($evaluation);
                });

            return response()->json([
                'message' => 'Employees assigned to evaluation period successfully.',
                'evaluations' => $period->evaluations()->with('employee')->get(),
            ], 201);
        });
    }

    public function storeEvaluationResponse(Request $request, PerformanceEvaluation $evaluation)
    {
        $user = $request->user();
        $employee = $evaluation->employee;

        if (!$employee) {
            return response()->json([
                'message' => 'The employee being evaluated could not be found.',
                'error_type' => 'not_found',
            ], 404);
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
            'remarks' => 'nullable|string',
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

        if (!$evaluation) {
            return response()->json([
                'message' => 'Evaluation not found.',
                'error_type' => 'not_found',
            ], 404);
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
            'remarks' => 'nullable|string',
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

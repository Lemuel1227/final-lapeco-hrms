<?php

namespace Database\Seeders;

use App\Models\PerformanceEvaluation;
use App\Models\PerformanceEvaluationPeriod;
use App\Models\PerformanceEvaluatorResponse;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

class PerformanceSeeder extends Seeder
{
    public function run(): void
    {
        $hrUser = User::where('role', 'SUPER_ADMIN')->first();
        $defaultUserId = $hrUser?->id ?? User::first()?->id;

        if (!$defaultUserId) {
            return;
        }

        $teamLeaders = User::where('role', 'TEAM_LEADER')->get();
        $employees = User::where('role', 'REGULAR_EMPLOYEE')->get();

        if ($employees->isEmpty()) {
            return;
        }

        $periodDefinitions = [
            [
                'name' => 'H1 2025 Performance Review',
                'start' => Carbon::create(2025, 1, 1),
                'end' => Carbon::create(2025, 6, 30),
                'open' => Carbon::create(2025, 7, 1),
                'close' => Carbon::create(2025, 7, 20),
            ],
            [
                'name' => 'Q3 2025 Performance Review',
                'start' => Carbon::create(2025, 7, 1),
                'end' => Carbon::create(2025, 9, 30),
                'open' => Carbon::create(2025, 10, 1),
                'close' => Carbon::create(2025, 10, 31),
            ],
            [
                'name' => 'Q4 2025 Performance Review',
                'start' => Carbon::create(2025, 10, 1),
                'end' => Carbon::create(2025, 12, 31),
                'open' => Carbon::create(2026, 1, 5),
                'close' => Carbon::create(2026, 1, 25),
            ],
        ];

        $evaluators = collect();

        if ($hrUser) {
            $evaluators->push($hrUser);
        }

        $evaluators = $evaluators->merge($teamLeaders);

        foreach ($periodDefinitions as $definition) {
            $period = PerformanceEvaluationPeriod::updateOrCreate(
                ['name' => $definition['name']],
                [
                    'evaluation_start' => $definition['start']->toDateString(),
                    'evaluation_end' => $definition['end']->toDateString(),
                    'open_date' => $definition['open']->toDateString(),
                    'close_date' => $definition['close']->toDateString(),
                    'created_by' => $defaultUserId,
                    'updated_by' => $defaultUserId,
                ]
            );

            $selectedEmployees = $employees->shuffle()->take(min(5, $employees->count()));

            foreach ($selectedEmployees as $employee) {
                $evaluation = PerformanceEvaluation::updateOrCreate(
                    [
                        'period_id' => $period->id,
                        'employee_id' => $employee->id,
                    ],
                    []
                );

                $periodStatus = $period->status;
                $shouldSeedResponses = in_array($periodStatus, ['closed', 'active'], true);

                if (!$shouldSeedResponses || $evaluators->isEmpty()) {
                    $evaluation->update([
                        'average_score' => null,
                        'responses_count' => 0,
                        'completed_at' => null,
                    ]);

                    continue;
                }

                $eligibleEvaluators = $evaluators->filter(fn (User $user) => $user->id !== $employee->id);
                $selectedEvaluators = $eligibleEvaluators->shuffle()->take(min(2, $eligibleEvaluators->count()));

                foreach ($selectedEvaluators as $evaluator) {
                    $scores = [];

                    foreach (PerformanceEvaluatorResponse::SCORE_FIELDS as $field) {
                        $scores[$field] = rand(1, 5);
                    }

                    PerformanceEvaluatorResponse::updateOrCreate(
                        [
                            'evaluation_id' => $evaluation->id,
                            'evaluator_id' => $evaluator->id,
                        ],
                        array_merge($scores, [
                            'evaluated_on' => $definition['end']->copy()->subDays(rand(0, 10)),
                            'remarks' => 'Performance review notes for ' . $employee->first_name,
                        ])
                    );
                }

                $evaluation->load('responses');

                $average = $evaluation->responses->isEmpty()
                    ? null
                    : round($evaluation->responses->avg(fn (PerformanceEvaluatorResponse $response) => $response->overall_score), 2);

                $evaluation->update([
                    'average_score' => $average,
                    'responses_count' => $evaluation->responses->count(),
                    'completed_at' => $evaluation->responses->isNotEmpty() ? $definition['end'] : null,
                ]);
            }
        }
    }
}


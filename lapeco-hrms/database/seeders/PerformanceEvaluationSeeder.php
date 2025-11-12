<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use App\Models\PerformanceEvaluation;
use App\Models\PerformanceEvaluationPeriod;
use App\Models\PerformanceEvaluatorResponse;
use App\Models\User;

class PerformanceEvaluationSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create performance evaluation periods
        $periods = [
            [
                'name' => 'Q1 2025 Performance Evaluation',
                'evaluation_start' => '2025-01-01',
                'evaluation_end' => '2025-03-31',
                'open_date' => '2025-04-01',
                'close_date' => '2025-04-15',
                'overall_score' => 87.5,
                'created_by' => 1, // Assuming user ID 1 exists (HR Admin)
                'updated_by' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Q2 2025 Performance Evaluation',
                'evaluation_start' => '2025-04-01',
                'evaluation_end' => '2025-06-30',
                'open_date' => '2025-07-01',
                'close_date' => '2025-07-15',
                'overall_score' => 89.2,
                'created_by' => 1,
                'updated_by' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Q3 2025 Performance Evaluation',
                'evaluation_start' => '2025-07-01',
                'evaluation_end' => '2025-09-30',
                'open_date' => '2025-09-01',
                'close_date' => '2025-09-30',
                'overall_score' => null,
                'created_by' => 1,
                'updated_by' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Q4 2025 Performance Evaluation',
                'evaluation_start' => '2025-10-01',
                'evaluation_end' => '2025-12-31',
                'open_date' => '2026-01-05',
                'close_date' => '2026-01-20',
                'overall_score' => null,
                'created_by' => 1,
                'updated_by' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Annual 2025 Performance Review',
                'evaluation_start' => '2025-01-01',
                'evaluation_end' => '2025-12-31',
                'open_date' => '2026-01-10',
                'close_date' => '2026-02-10',
                'overall_score' => null,
                'created_by' => 1,
                'updated_by' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ];

        DB::table('performance_evaluation_periods')->insert($periods);

        $createdPeriods = PerformanceEvaluationPeriod::all();

        $leaders = User::where('role', 'TEAM_LEADER')
            ->whereNotIn('employment_status', ['terminated', 'resigned'])
            ->get(['id', 'position_id']);

        $members = User::where('role', 'REGULAR_EMPLOYEE')
            ->whereNotIn('employment_status', ['terminated', 'resigned'])
            ->get(['id', 'position_id']);

        $leadersByPosition = $leaders->groupBy('position_id');
        $membersByPosition = $members->groupBy('position_id');

        foreach ($createdPeriods as $period) {
            // Leaders evaluating members
            foreach ($leadersByPosition as $positionId => $positionLeaders) {
                $positionMembers = $membersByPosition->get($positionId, collect());

                foreach ($positionMembers as $member) {
                    $evaluation = PerformanceEvaluation::firstOrCreate([
                        'period_id' => $period->id,
                        'employee_id' => $member->id,
                    ]);

                    if ($period->status === 'closed') {
                        $this->seedResponsesForEvaluation($evaluation, $positionLeaders, $positionMembers, $period);
                    }
                }
            }

            // Members evaluating their leader
            foreach ($membersByPosition as $positionId => $positionMembers) {
                $leader = $leadersByPosition->get($positionId, collect())->first();

                if (!$leader) {
                    continue;
                }

                $evaluation = PerformanceEvaluation::firstOrCreate([
                    'period_id' => $period->id,
                    'employee_id' => $leader->id,
                ]);

                if ($period->status === 'closed') {
                    $this->seedResponsesForEvaluation($evaluation, $positionMembers, collect([$leader]), $period, true);
                }
            }
        }

        // Update overall score per period based on seeded evaluations
        foreach ($createdPeriods as $period) {
            $average = PerformanceEvaluation::where('period_id', $period->id)
                ->whereNotNull('average_score')
                ->avg('average_score');

            $period->update([
                'overall_score' => $average ? round($average, 2) : null,
            ]);
        }

        $this->command->info('Performance evaluation data seeded successfully!');
    }

    private function seedResponsesForEvaluation(
        PerformanceEvaluation $evaluation,
        $evaluatorCandidates,
        $excludeCandidates,
        PerformanceEvaluationPeriod $period,
        bool $membersEvaluatingLeader = false
    ): void {
        $usedEvaluators = collect();
        $responseAverages = [];

        foreach ($evaluatorCandidates as $candidate) {
            if ($excludeCandidates->contains('id', $candidate->id)) {
                continue;
            }

            if ($membersEvaluatingLeader && $candidate->id === $evaluation->employee_id) {
                continue;
            }

            $response = PerformanceEvaluatorResponse::create([
                'evaluation_id' => $evaluation->id,
                'evaluator_id' => $candidate->id,
                'evaluated_on' => Carbon::parse($period->evaluation_end)->subDays(rand(1, 20)),
                'attendance' => rand(1, 5),
                'dedication' => rand(1, 5),
                'performance_job_knowledge' => rand(1, 5),
                'performance_work_efficiency_professionalism' => rand(1, 5),
                'cooperation_task_acceptance' => rand(1, 5),
                'cooperation_adaptability' => rand(1, 5),
                'initiative_autonomy' => rand(1, 5),
                'initiative_under_pressure' => rand(1, 5),
                'communication' => rand(1, 5),
                'teamwork' => rand(1, 5),
                'character' => rand(1, 5),
                'responsiveness' => rand(1, 5),
                'personality' => rand(1, 5),
                'appearance' => rand(1, 5),
                'work_habits' => rand(1, 5),
                'evaluators_comment_summary' => $this->getRandomSummaryComment(),
                'evaluators_comment_development' => $this->getRandomDevelopmentComment(),
            ]);

            $usedEvaluators->push($response->id);

            $scoreSum = 0;
            $scoreCount = count(PerformanceEvaluatorResponse::SCORE_FIELDS);
            foreach (PerformanceEvaluatorResponse::SCORE_FIELDS as $field) {
                $scoreSum += $response->{$field};
            }
            $responseAverages[] = round($scoreSum / max($scoreCount, 1), 2);
        }

        $responsesCount = $usedEvaluators->count();
        $evaluation->update([
            'responses_count' => $responsesCount,
            'average_score' => $responsesCount > 0 ? round(collect($responseAverages)->avg(), 2) : null,
            'completed_at' => $responsesCount > 0
                ? Carbon::parse($period->evaluation_end)->subDays(rand(1, 15))
                : null,
        ]);
    }

    private function getRandomSummaryComment(): string
    {
        $comments = [
            'Consistently delivered strong results throughout the period.',
            'Demonstrated excellent collaboration and problem-solving skills.',
            'Maintains a positive attitude and supports team objectives.',
            'Shows solid performance with notable improvements this cycle.',
            'Provided dependable leadership and guidance to peers.',
        ];

        return $comments[array_rand($comments)];
    }

    private function getRandomDevelopmentComment(): string
    {
        $development = [
            'Would benefit from additional training in advanced analytics.',
            'Encourage more proactive communication with stakeholders.',
            'Needs to strengthen time management during peak periods.',
            'Continue mentoring newer team members to build leadership skills.',
            'Focus on developing deeper technical expertise in upcoming projects.',
        ];

        return $development[array_rand($development)];
    }
}

<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Collection;
use Carbon\Carbon;
use App\Models\PerformanceEvaluation;
use App\Models\PerformanceEvaluationPeriod;
use App\Models\PerformanceEvaluatorResponse;
use App\Models\User;

class PerformanceEvaluationSeeder extends Seeder
{
    private const TIER_LOW = 'low';
    private const TIER_NORMAL = 'normal';
    private const TIER_HIGH = 'high';

    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $activeEmployees = User::query()
            ->whereNotIn('employment_status', ['terminated', 'resigned'])
            ->whereIn('role', ['REGULAR_EMPLOYEE', 'TEAM_LEADER'])
            ->get();

        if ($activeEmployees->isEmpty()) {
            return;
        }

        $hrManager = User::query()
            ->where('role', 'HR_MANAGER')
            ->whereNotIn('employment_status', ['terminated', 'resigned'])
            ->first();

        $teamLeaders = User::query()
            ->where('role', 'TEAM_LEADER')
            ->whereNotIn('employment_status', ['terminated', 'resigned'])
            ->get();

        $creatorUser = $hrManager ?? $teamLeaders->first() ?? $activeEmployees->first();
        $evaluators = collect($hrManager ? [$hrManager] : [])->merge($teamLeaders);

        $periodDefinitions = $this->generatePeriodDefinitions();
        $periods = [];

        foreach ($periodDefinitions as $definition) {
            $period = PerformanceEvaluationPeriod::updateOrCreate(
                ['name' => $definition['name']],
                [
                    'evaluation_start' => $definition['start']->toDateString(),
                    'evaluation_end' => $definition['end']->toDateString(),
                    'open_date' => $definition['open']->toDateString(),
                    'close_date' => $definition['close']->toDateString(),
                    'overall_score' => null,
                    'created_by' => $creatorUser->id,
                    'updated_by' => $creatorUser->id,
                ]
            );

            $periods[] = $period->refresh();
        }

        $employeeTiers = $this->assignEmployeeTiers($activeEmployees);
        $evaluationAverages = [];

        foreach ($periods as $period) {
            foreach ($activeEmployees as $employee) {
                $tier = $employeeTiers[$employee->id] ?? self::TIER_NORMAL;
                $average = $this->seedEvaluationForEmployee($period, $employee, $tier, $evaluators, $creatorUser);

                if ($average !== null) {
                    $evaluationAverages[] = $average;
                }
            }
        }

        foreach ($periods as $period) {
            $average = PerformanceEvaluation::query()
                ->where('period_id', $period->id)
                ->whereNotNull('average_score')
                ->avg('average_score');

            $period->update([
                'overall_score' => $average ? round($average * 20, 2) : null,
            ]);
        }

        if (!empty($evaluationAverages) && isset($this->command)) {
            $overallAverage = array_sum($evaluationAverages) / count($evaluationAverages);
            $this->command->info(sprintf(
                'Seeded performance evaluations with overall average score %.2f (%.2f%%).',
                $overallAverage,
                $overallAverage * 20
            ));
        }
    }

    private function seedEvaluationForEmployee(
        PerformanceEvaluationPeriod $period,
        User $employee,
        string $tier,
        Collection $evaluators,
        User $fallbackEvaluator
    ): ?float {
        $evaluation = PerformanceEvaluation::updateOrCreate(
            [
                'period_id' => $period->id,
                'employee_id' => $employee->id,
            ],
            []
        );

        PerformanceEvaluatorResponse::where('evaluation_id', $evaluation->id)->delete();

        $availableEvaluators = $evaluators
            ->filter(fn (User $user) => $user->id !== $employee->id)
            ->values();

        if ($availableEvaluators->isEmpty() && $fallbackEvaluator->id !== $employee->id) {
            $availableEvaluators = collect([$fallbackEvaluator]);
        }

        if ($availableEvaluators->isEmpty()) {
            $evaluation->update([
                'average_score' => null,
                'responses_count' => 0,
                'completed_at' => null,
            ]);

            return null;
        }

        $responsesToCreate = min($this->determineResponseCount($tier), $availableEvaluators->count());
        $targetScore = $this->generateTargetScoreForTier($tier);
        $responseAverages = [];

        $evaluationStart = $period->evaluation_start instanceof Carbon
            ? $period->evaluation_start->copy()
            : Carbon::parse($period->evaluation_start);
        $evaluationEnd = $period->evaluation_end instanceof Carbon
            ? $period->evaluation_end->copy()
            : Carbon::parse($period->evaluation_end);
        $closeDate = $period->close_date instanceof Carbon
            ? $period->close_date->copy()
            : Carbon::parse((string) $period->close_date);

        $selectedEvaluators = $availableEvaluators->shuffle()->take($responsesToCreate);

        foreach ($selectedEvaluators as $evaluator) {
            $scores = $this->generateScoresForTarget($targetScore, $tier);
            $evaluatedOn = $this->randomEvaluationDate($evaluationStart, $evaluationEnd);

            PerformanceEvaluatorResponse::create(array_merge($scores, [
                'evaluation_id' => $evaluation->id,
                'evaluator_id' => $evaluator->id,
                'evaluated_on' => $evaluatedOn,
                'evaluators_comment_summary' => $this->getRandomSummaryComment(),
                'evaluators_comment_development' => $this->getRandomDevelopmentComment(),
            ]));

            $responseAverages[] = $this->calculateScoreAverage($scores);
        }

        $responsesCount = count($responseAverages);
        $averageScore = $responsesCount > 0
            ? round(array_sum($responseAverages) / $responsesCount, 2)
            : null;

        $completedAt = $responsesCount > 0
            ? $evaluationEnd->copy()->addDays(rand(1, 14))
            : null;

        if ($completedAt && $closeDate && $completedAt->gt($closeDate)) {
            $completedAt = $closeDate->copy();
        }

        $evaluation->update([
            'average_score' => $averageScore,
            'responses_count' => $responsesCount,
            'completed_at' => $completedAt,
        ]);

        return $averageScore;
    }

    private function assignEmployeeTiers(Collection $employees): array
    {
        $count = $employees->count();

        if ($count === 0) {
            return [];
        }

        $lowTarget = (int) floor($count * 0.1);
        $highTarget = (int) floor($count * 0.1);

        if ($count >= 10) {
            $lowTarget = max(1, $lowTarget);
            $highTarget = max(1, $highTarget);
        }

        if ($lowTarget + $highTarget > $count) {
            $overflow = ($lowTarget + $highTarget) - $count;

            if ($highTarget >= $overflow) {
                $highTarget -= $overflow;
            } else {
                $overflow -= $highTarget;
                $highTarget = 0;
                $lowTarget = max(0, $lowTarget - $overflow);
            }
        }

        $shuffled = $employees->shuffle()->values();
        $total = $shuffled->count();
        $tiers = [];

        foreach ($shuffled as $index => $employee) {
            if ($index < $lowTarget) {
                $tiers[$employee->id] = self::TIER_LOW;
                continue;
            }

            if ($index >= $total - $highTarget) {
                $tiers[$employee->id] = self::TIER_HIGH;
                continue;
            }

            $tiers[$employee->id] = self::TIER_NORMAL;
        }

        return $tiers;
    }

    private function determineResponseCount(string $tier): int
    {
        return match ($tier) {
            self::TIER_HIGH => 2,
            self::TIER_LOW => 1,
            default => rand(1, 2),
        };
    }

    private function generateTargetScoreForTier(string $tier): float
    {
        $ranges = [
            self::TIER_LOW => [3.3, 4.1],
            self::TIER_NORMAL => [4.25, 4.55],
            self::TIER_HIGH => [4.6, 4.9],
        ];

        [$min, $max] = $ranges[$tier] ?? $ranges[self::TIER_NORMAL];

        $random = mt_rand() / mt_getrandmax();

        if ($tier === self::TIER_HIGH) {
            $random = sqrt($random);
        } else {
            $random = pow($random, 2);
        }

        return round($min + ($max - $min) * $random, 2);
    }

    private function generateScoresForTarget(float $targetScore, string $tier): array
    {
        $varianceByTier = [
            self::TIER_LOW => 0.6,
            self::TIER_NORMAL => 0.45,
            self::TIER_HIGH => 0.35,
        ];

        $variance = $varianceByTier[$tier] ?? 0.45;

        $scores = [];

        foreach (PerformanceEvaluatorResponse::SCORE_FIELDS as $field) {
            $scores[$field] = $this->generateFieldScore($targetScore, $variance);
        }

        return $scores;
    }

    private function generateFieldScore(float $targetScore, float $variance): int
    {
        $adjustment = (mt_rand(-100, 100) / 100) * $variance;
        $score = $targetScore + $adjustment;

        return (int) max(1, min(5, round($score)));
    }

    private function calculateScoreAverage(array $scores): float
    {
        if (empty($scores)) {
            return 0.0;
        }

        return round(array_sum($scores) / count($scores), 2);
    }

    private function randomEvaluationDate(Carbon $start, Carbon $end): Carbon
    {
        $diff = max($end->diffInDays($start), 1);
        $offset = rand((int) floor($diff * 0.4), $diff);

        return $start->copy()->addDays($offset);
    }

    private function generatePeriodDefinitions(int $years = 3): array
    {
        $now = Carbon::now();
        $start = $this->alignToHalfYearStart($now->copy()->subYears($years));
        $periods = [];
        $totalPeriods = ($years * 2) + 1;

        for ($i = 0; $i < $totalPeriods; $i++) {
            $periodStart = $start->copy()->addMonths(6 * $i);
            $periodEnd = $periodStart->copy()->addMonths(6)->subDay();
            $label = $periodStart->month <= 6 ? 'H1' : 'H2';
            $year = $periodStart->year;

            $periods[] = [
                'name' => sprintf('%s %d Performance Evaluation', $label, $year),
                'start' => $periodStart,
                'end' => $periodEnd,
                'open' => $periodEnd->copy()->addDay(),
                'close' => $periodEnd->copy()->addDays(30),
            ];
        }

        return $periods;
    }

    private function alignToHalfYearStart(Carbon $date): Carbon
    {
        $halfYearStart = $date->copy()->startOfYear();

        if ($date->month > 6) {
            $halfYearStart->addMonths(6);
        }

        return $halfYearStart;
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

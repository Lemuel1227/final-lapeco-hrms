<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

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
                'status' => 'completed',
                'description' => 'First quarter performance evaluation for 2025',
                'created_by' => 1, // Assuming user ID 1 exists (HR Admin)
                'updated_by' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Q2 2025 Performance Evaluation',
                'evaluation_start' => '2025-04-01',
                'evaluation_end' => '2025-06-30',
                'status' => 'completed',
                'description' => 'Second quarter performance evaluation for 2025',
                'created_by' => 1,
                'updated_by' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Q3 2025 Performance Evaluation',
                'evaluation_start' => '2025-07-01',
                'evaluation_end' => '2025-09-30',
                'status' => 'active',
                'description' => 'Third quarter performance evaluation for 2025',
                'created_by' => 1,
                'updated_by' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Q4 2025 Performance Evaluation',
                'evaluation_start' => '2025-10-01',
                'evaluation_end' => '2025-12-31',
                'status' => 'scheduled',
                'description' => 'Fourth quarter performance evaluation for 2025',
                'created_by' => 1,
                'updated_by' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Annual 2025 Performance Review',
                'evaluation_start' => '2025-01-01',
                'evaluation_end' => '2025-12-31',
                'status' => 'scheduled',
                'description' => 'Annual comprehensive performance review for 2025',
                'created_by' => 1,
                'updated_by' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ];

        DB::table('performance_evaluation_periods')->insert($periods);

        // Get the created periods
        $createdPeriods = DB::table('performance_evaluation_periods')->get();
        
        // Get some employees (match app roles: use REGULAR_EMPLOYEE)
        $employees = DB::table('users')
            ->where('role', 'REGULAR_EMPLOYEE')
            ->limit(10)
            ->get();

        if ($employees->count() > 0) {
            // Create performance evaluations for completed periods
            $completedPeriods = $createdPeriods->where('status', 'completed');
            
            foreach ($completedPeriods as $period) {
                foreach ($employees as $employee) {
                    // Create evaluation record
                    $evaluationId = DB::table('performance_evaluations')->insertGetId([
                        'period_id' => $period->id,
                        'employee_id' => $employee->id,
                        'average_score' => rand(70, 95) / 10, // Random score between 7.0 and 9.5
                        'responses_count' => rand(2, 5),
                        'completed_at' => Carbon::parse($period->evaluation_end)->subDays(rand(1, 15)),
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);

                    // Create some evaluator responses
                    $evaluators = DB::table('users')
                        ->where('role', 'LIKE', '%LEADER%')
                        ->orWhere('role', 'HR_PERSONNEL')
                        ->limit(rand(2, 4))
                        ->get();

                    foreach ($evaluators as $evaluator) {
                        if ($evaluator->id != $employee->id) { // Don't let employees evaluate themselves
                            DB::table('performance_evaluator_responses')->insert([
                                'evaluation_id' => $evaluationId,
                                'evaluator_id' => $evaluator->id,
                                'evaluated_on' => Carbon::parse($period->evaluation_end)->subDays(rand(1, 20)),
                                'attendance' => rand(7, 10),
                                'dedication' => rand(7, 10),
                                'performance_job_knowledge' => rand(7, 10),
                                'performance_work_efficiency_professionalism' => rand(7, 10),
                                'cooperation_task_acceptance' => rand(7, 10),
                                'cooperation_adaptability' => rand(7, 10),
                                'initiative_autonomy' => rand(7, 10),
                                'initiative_under_pressure' => rand(6, 9),
                                'communication' => rand(7, 10),
                                'teamwork' => rand(7, 10),
                                'character' => rand(8, 10),
                                'responsiveness' => rand(7, 10),
                                'personality' => rand(7, 10),
                                'appearance' => rand(7, 10),
                                'work_habits' => rand(7, 10),
                                'remarks' => $this->getRandomRemarks(),
                                'created_at' => now(),
                                'updated_at' => now(),
                            ]);
                        }
                    }
                }
            }

            // Create some evaluations for active period (in progress)
            $activePeriod = $createdPeriods->where('status', 'active')->first();
            if ($activePeriod) {
                foreach ($employees->take(5) as $employee) { // Only some employees for active period
                    $evaluationId = DB::table('performance_evaluations')->insertGetId([
                        'period_id' => $activePeriod->id,
                        'employee_id' => $employee->id,
                        'average_score' => null, // Not completed yet
                        'responses_count' => rand(0, 2),
                        'completed_at' => null,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);

                    // Add some partial responses
                    if (rand(0, 1)) {
                        $evaluator = DB::table('users')
                            ->where('role', 'LIKE', '%LEADER%')
                            ->first();
                        
                        if ($evaluator && $evaluator->id != $employee->id) {
                            DB::table('performance_evaluator_responses')->insert([
                                'evaluation_id' => $evaluationId,
                                'evaluator_id' => $evaluator->id,
                                'evaluated_on' => now()->subDays(rand(1, 10)),
                                'attendance' => rand(7, 10),
                                'dedication' => rand(7, 10),
                                'performance_job_knowledge' => rand(7, 10),
                                'performance_work_efficiency_professionalism' => rand(7, 10),
                                'cooperation_task_acceptance' => rand(7, 10),
                                'cooperation_adaptability' => rand(7, 10),
                                'initiative_autonomy' => rand(7, 10),
                                'initiative_under_pressure' => rand(6, 9),
                                'communication' => rand(7, 10),
                                'teamwork' => rand(7, 10),
                                'character' => rand(8, 10),
                                'responsiveness' => rand(7, 10),
                                'personality' => rand(7, 10),
                                'appearance' => rand(7, 10),
                                'work_habits' => rand(7, 10),
                                'remarks' => $this->getRandomRemarks(),
                                'created_at' => now(),
                                'updated_at' => now(),
                            ]);
                        }
                    }
                }
            }
        }

        $this->command->info('Performance evaluation data seeded successfully!');
    }

    /**
     * Get random performance remarks
     */
    private function getRandomRemarks(): string
    {
        $remarks = [
            'Excellent performance and dedication to work.',
            'Shows great initiative and problem-solving skills.',
            'Good team player with positive attitude.',
            'Consistently meets deadlines and quality standards.',
            'Demonstrates strong leadership potential.',
            'Reliable and punctual employee.',
            'Shows continuous improvement in performance.',
            'Excellent communication and interpersonal skills.',
            'Takes ownership of tasks and responsibilities.',
            'Adapts well to changes and new challenges.',
            'Maintains high professional standards.',
            'Contributes positively to team dynamics.',
            'Shows commitment to company values.',
            'Demonstrates good work-life balance.',
            'Proactive in identifying and solving problems.',
        ];

        return $remarks[array_rand($remarks)];
    }
}

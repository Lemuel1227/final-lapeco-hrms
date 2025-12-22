<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;
use App\Models\Position;
use App\Models\PerformanceEvaluation;
use App\Models\PerformanceEvaluatorResponse;
use Illuminate\Support\Facades\DB;

class PredictiveAnalyticsController extends Controller
{
    /**
     * Get optimized data for predictive analytics page
     * Returns only the essential data needed for the page
     */
    public function getData(Request $request)
    {
        try {
            // Get employees with their positions (minimal fields)
            $employees = User::whereIn('employment_status', ['active', 'Active', 'ACTIVE'])
                ->select('id', 'first_name', 'middle_name', 'last_name', 'email', 'position_id', 'joining_date', 'gender', 'image_url')
                ->with('position:id,name')
                ->get()
                ->map(function ($employee) {
                    $nameParts = array_filter([
                        $employee->first_name,
                        $employee->middle_name,
                        $employee->last_name,
                    ], fn ($part) => !empty($part));

                    $fullName = trim(implode(' ', $nameParts));

                    return [
                        'id' => $employee->id,
                        'name' => $fullName,
                        'email' => $employee->email,
                        'positionId' => $employee->position_id,
                        'position_id' => $employee->position_id,
                        'joining_date' => $employee->joining_date,
                        'joiningDate' => $employee->joining_date,
                        'gender' => $employee->gender,
                        'imageUrl' => $employee->image_url,
                        'image_url' => $employee->image_url,
                        'positionTitle' => $employee->position ? ($employee->position->name ?? null) : null,
                    ];
                });

            // Get positions (minimal fields)
            $positions = Position::select('id', 'name')->get()->map(function ($position) {
                return [
                    'id' => $position->id,
                    'name' => $position->name,
                ];
            });

            // Get evaluation responses with calculated scores
            $evaluations = PerformanceEvaluatorResponse::with([
                'evaluation:id,employee_id,period_id,completed_at',
                'evaluation.period:id,evaluation_end',
                'evaluation.employee:id,first_name,middle_name,last_name'
            ])
                ->whereHas('evaluation', function ($query) {
                    $query->whereNotNull('completed_at');
                })
                ->select(
                    'evaluation_id',
                    DB::raw('AVG(attendance) as attendance'),
                    DB::raw('AVG(dedication) as dedication'),
                    DB::raw('AVG((performance_job_knowledge + performance_work_efficiency_professionalism) / 2) as performance'),
                    DB::raw('AVG((cooperation_task_acceptance + cooperation_adaptability) / 2) as cooperation'),
                    DB::raw('AVG((initiative_autonomy + initiative_under_pressure) / 2) as initiative'),
                    DB::raw('AVG(communication) as communication'),
                    DB::raw('AVG(teamwork) as teamwork'),
                    DB::raw('AVG(`character`) as character_score'),
                    DB::raw('AVG(responsiveness) as responsiveness'),
                    DB::raw('AVG(personality) as personality'),
                    DB::raw('AVG(appearance) as appearance'),
                    DB::raw('AVG(work_habits) as work_habits')
                )
                ->groupBy('evaluation_id')
                ->get()
                ->map(function ($response) {
                    $evaluation = $response->evaluation;
                    $metricScores = [
                        $response->attendance,
                        $response->dedication,
                        $response->performance,
                        $response->cooperation,
                        $response->initiative,
                        $response->communication,
                        $response->teamwork,
                        $response->character_score,
                        $response->responsiveness,
                        $response->personality,
                        $response->appearance,
                        $response->work_habits,
                    ];

                    $validScores = array_filter($metricScores, fn ($score) => $score !== null);
                    $overallScore = null;
                    if (count($validScores) > 0) {
                        $overallScore = round((array_sum($validScores) / count($validScores)) * 20, 2);
                    }

                    return [
                        'evaluationId' => $response->evaluation_id,
                        'employeeId' => $evaluation->employee_id,
                        'employee_id' => $evaluation->employee_id,
                        'employee_name' => optional($evaluation->employee)->first_name
                            ? trim(implode(' ', array_filter([
                                $evaluation->employee->first_name,
                                $evaluation->employee->middle_name,
                                $evaluation->employee->last_name,
                            ])))
                            : null,
                        'periodEnd' => optional($evaluation->period)->evaluation_end,
                        'period_end' => optional($evaluation->period)->evaluation_end,
                        'overallScore' => $overallScore,
                        'attendance' => round($response->attendance, 2),
                        'dedication' => round($response->dedication, 2),
                        'performance' => round($response->performance, 2),
                        'cooperation' => round($response->cooperation, 2),
                        'initiative' => round($response->initiative, 2),
                        'communication' => round($response->communication, 2),
                        'teamwork' => round($response->teamwork, 2),
                        'character' => round($response->character_score, 2),
                        'responsiveness' => round($response->responsiveness, 2),
                        'personality' => round($response->personality, 2),
                        'appearance' => round($response->appearance, 2),
                        'work_habits' => round($response->work_habits, 2),
                    ];
                });

            return response()->json([
                'success' => true,
                'data' => [
                    'employees' => $employees,
                    'positions' => $positions,
                    'evaluations' => $evaluations,
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch predictive analytics data',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}

<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

/**
 * MLDataService
 * 
 * Service responsible for preparing employee data to send to the ML API.
 * This service fetches data from the Laravel database and formats it
 * according to the ML API's expected schema.
 */
class MLDataService
{
    /**
     * Prepare employee data for ML API
     * 
     * Fetches all required employee data from the database and formats it
     * for sending to the Python ML API service.
     * 
     * @return array Array of employee data formatted for ML API
     */
    public function prepareEmployeeData(): array
    {
        try {
            // Get active employees
            $employees = $this->getActiveEmployees();
            
            // Get performance data for all employees
            $performanceData = $this->getPerformanceData($employees->pluck('id')->toArray());
            
            // Get attendance data for all employees
            $attendanceData = $this->getAttendanceData($employees->pluck('id')->toArray());
            
            // Combine all data
            $employeeData = [];
            
            foreach ($employees as $employee) {
                $empId = $employee->id;
                
                // Get latest performance evaluation
                $performance = $performanceData->where('employee_id', $empId)->first();
                
                // Get attendance statistics
                $attendance = $attendanceData->where('employee_id', $empId)->first();
                
                $employeeData[] = [
                    'employee_id' => $empId,
                    'employee_name' => $employee->name,
                    'position_id' => $employee->position_id,
                    'joining_date' => $employee->joining_date ? 
                        Carbon::parse($employee->joining_date)->format('Y-m-d') : null,
                    'birthday' => $employee->birthday ? 
                        Carbon::parse($employee->birthday)->format('Y-m-d') : null,
                    'gender' => $employee->gender ?? 'Male',
                    
                    // Performance evaluation scores
                    'attendance_score' => $performance->attendance ?? null,
                    'dedication_score' => $performance->dedication ?? null,
                    'performance_job_knowledge' => $performance->performance_job_knowledge ?? null,
                    'performance_work_efficiency' => $performance->performance_work_efficiency ?? null,
                    'cooperation_task_acceptance' => $performance->cooperation_task_acceptance ?? null,
                    'cooperation_adaptability' => $performance->cooperation_adaptability ?? null,
                    'initiative_autonomy' => $performance->initiative_autonomy ?? null,
                    'initiative_under_pressure' => $performance->initiative_under_pressure ?? null,
                    'communication' => $performance->communication ?? null,
                    'teamwork' => $performance->teamwork ?? null,
                    'character' => $performance->character_score ?? null,
                    'responsiveness' => $performance->responsiveness ?? null,
                    'personality' => $performance->personality ?? null,
                    'appearance' => $performance->appearance ?? null,
                    'work_habits' => $performance->work_habits ?? null,
                    'overall_score' => $performance->overall_score ?? null,
                    
                    // Attendance statistics (last 30 days)
                    'total_days' => $attendance->total_days ?? 0,
                    'late_count' => $attendance->late_count ?? 0,
                    'absent_count' => $attendance->absent_count ?? 0,
                    'present_count' => $attendance->present_count ?? 0,
                ];
            }
            
            Log::info('Prepared employee data for ML API', [
                'employee_count' => count($employeeData),
                'has_performance' => $performanceData->count(),
                'has_attendance' => $attendanceData->count()
            ]);
            
            return $employeeData;
            
        } catch (\Exception $e) {
            Log::error('Error preparing employee data for ML API: ' . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * Get all active employees
     * 
     * @return \Illuminate\Database\Eloquent\Collection
     */
    private function getActiveEmployees()
    {
        return DB::table('users')
            ->select([
                'id',
                DB::raw("CONCAT(first_name, ' ', last_name) as name"),
                'position_id',
                'joining_date',
                'birthday',
                'gender',
                'employment_status'
            ])
            ->where('employment_status', 'active')
            ->get();
    }
    
    /**
     * Get performance evaluation data for employees
     * 
     * Gets the latest performance evaluation for each employee with
     * average scores from all evaluators.
     * 
     * @param array $employeeIds
     * @return \Illuminate\Support\Collection
     */
    private function getPerformanceData(array $employeeIds)
    {
        if (empty($employeeIds)) {
            return collect();
        }
        
        // Get the latest performance evaluation for each employee
        $latestEvaluations = DB::table('performance_evaluations as pe1')
            ->select(['pe1.employee_id', DB::raw('MAX(pe1.id) as latest_id')])
            ->whereIn('pe1.employee_id', $employeeIds)
            ->whereNotNull('pe1.completed_at')
            ->groupBy('pe1.employee_id');
        
        // Get detailed performance data for latest evaluations
        return DB::table('performance_evaluations as pe')
            ->joinSub($latestEvaluations, 'latest', function ($join) {
                $join->on('pe.id', '=', 'latest.latest_id');
            })
            ->leftJoin('performance_evaluator_responses as per', 'pe.id', '=', 'per.evaluation_id')
            ->select([
                'pe.employee_id',
                DB::raw('AVG(per.attendance) as attendance'),
                DB::raw('AVG(per.dedication) as dedication'),
                DB::raw('AVG(per.performance_job_knowledge) as performance_job_knowledge'),
                DB::raw('AVG(per.performance_work_efficiency_professionalism) as performance_work_efficiency'),
                DB::raw('AVG(per.cooperation_task_acceptance) as cooperation_task_acceptance'),
                DB::raw('AVG(per.cooperation_adaptability) as cooperation_adaptability'),
                DB::raw('AVG(per.initiative_autonomy) as initiative_autonomy'),
                DB::raw('AVG(per.initiative_under_pressure) as initiative_under_pressure'),
                DB::raw('AVG(per.communication) as communication'),
                DB::raw('AVG(per.teamwork) as teamwork'),
                DB::raw('AVG(per.character) as character_score'),
                DB::raw('AVG(per.responsiveness) as responsiveness'),
                DB::raw('AVG(per.personality) as personality'),
                DB::raw('AVG(per.appearance) as appearance'),
                DB::raw('AVG(per.work_habits) as work_habits'),
                'pe.average_score as overall_score'
            ])
            ->groupBy('pe.employee_id', 'pe.average_score')
            ->get();
    }
    
    /**
     * Get attendance statistics for the past 30 days
     * 
     * @param array $employeeIds
     * @return \Illuminate\Support\Collection
     */
    private function getAttendanceData(array $employeeIds)
    {
        if (empty($employeeIds)) {
            return collect();
        }
        
        // Calculate date threshold (30 days ago)
        $dateThreshold = Carbon::now()->subDays(30)->format('Y-m-d');
        
        return DB::table('schedule_assignments as sa')
            ->join('schedules as s', 'sa.schedule_id', '=', 's.id')
            ->leftJoin('attendances as a', 'sa.id', '=', 'a.schedule_assignment_id')
            ->select([
                'sa.user_id as employee_id',
                DB::raw('COUNT(*) as total_days'),
                DB::raw("SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as late_count"),
                DB::raw("SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent_count"),
                DB::raw("SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_count")
            ])
            ->whereIn('sa.user_id', $employeeIds)
            ->where('s.date', '>=', $dateThreshold)
            ->groupBy('sa.user_id')
            ->get();
    }
    
    /**
     * Get employees for training (including historical resignation data)
     * 
     * This method can be expanded to include historical data for training
     * when you have actual resignation records.
     * 
     * @return array
     */
    public function prepareTrainingData(): array
    {
        // For now, use the same data preparation method
        // In the future, you might want to include historical employees
        // with known resignation outcomes for better training
        return $this->prepareEmployeeData();
    }
}

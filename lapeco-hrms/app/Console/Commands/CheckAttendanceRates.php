<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;

class CheckAttendanceRates extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'attendance:check-rates {--threshold=80 : Attendance rate threshold percentage}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Check employee attendance rates and update status to Active/Inactive based on threshold';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $threshold = (float) $this->option('threshold');
        
        $this->info("Checking attendance rates with threshold: {$threshold}%");
        
        // Get all active employees
        $employees = User::where('account_status', 'Active')
                        ->where('role', '!=', 'HR_PERSONNEL') // Exclude HR personnel from attendance checks
                        ->get();
        
        $activeCount = 0;
        $inactiveCount = 0;
        $checkedCount = 0;
        
        foreach ($employees as $employee) {
            $attendanceRate = $employee->calculateAttendanceRate();
            $wasUpdated = $employee->checkAndUpdateAttendanceStatus($threshold);
            
            $checkedCount++;
            
            if ($attendanceRate < $threshold) {
                $inactiveCount++;
                $this->warn("Employee {$employee->name} (ID: {$employee->id}) - Attendance: {$attendanceRate}% - Status: Inactive");
            } else {
                $activeCount++;
                $this->line("Employee {$employee->name} (ID: {$employee->id}) - Attendance: {$attendanceRate}% - Status: Active");
            }
        }
        
        $this->info("Attendance check completed!");
        $this->info("Employees checked: {$checkedCount}");
        $this->info("Active employees: {$activeCount}");
        $this->info("Inactive employees: {$inactiveCount}");
        
        return Command::SUCCESS;
    }
}

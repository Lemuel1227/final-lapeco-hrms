<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\LeaveCredit;

class ResetLeaveCredits extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'leave:reset-credits 
                            {--user= : Reset credits for specific user ID}
                            {--type= : Reset credits for specific leave type}
                            {--all-users : Reset credits for all users}
                            {--all-types : Reset credits for all leave types}
                            {--year= : Reset credits for specific year (default: current year)}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Reset used leave credits to zero for users and leave types';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $userId = $this->option('user');
        $leaveType = $this->option('type');
        $allUsers = $this->option('all-users');
        $allTypes = $this->option('all-types');
        $year = $this->option('year') ?: date('Y');

        // Validate options
        if (!$userId && !$allUsers) {
            $this->error('Please specify either --user=ID or --all-users');
            return 1;
        }

        if (!$leaveType && !$allTypes) {
            $this->error('Please specify either --type="Leave Type" or --all-types');
            return 1;
        }

        // Build query
        $query = LeaveCredit::where('year', $year);

        if ($userId) {
            $query->where('user_id', $userId);
        }

        if ($leaveType) {
            $query->where('leave_type', $leaveType);
        }

        // Execute reset
        $affectedRecords = $query->update([
            'used_credits' => 0,
            'last_reset_at' => now()
        ]);

        // Display results
        $userScope = $userId ? "user ID {$userId}" : 'all users';
        $typeScope = $leaveType ? "leave type '{$leaveType}'" : 'all leave types';
        
        $this->info("Successfully reset used credits for {$affectedRecords} records.");
        $this->info("Scope: {$userScope}, {$typeScope}, year {$year}");

        return 0;
    }
}

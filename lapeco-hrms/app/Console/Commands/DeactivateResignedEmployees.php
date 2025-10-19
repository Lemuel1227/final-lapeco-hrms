<?php

namespace App\Console\Commands;

use App\Models\Resignation;
use Illuminate\Console\Command;
use Carbon\Carbon;

class DeactivateResignedEmployees extends Command
{
    protected $signature = 'resignations:deactivate';
    protected $description = 'Deactivate employees whose resignation effective date has passed';

    public function handle()
    {
        $today = Carbon::today();

        // Find approved resignations with effective date today or in the past
        $resignations = Resignation::where('status', 'approved')
            ->whereDate('effective_date', '<=', $today)
            ->whereHas('employee', function($query) {
                $query->where('account_status', '!=', 'Deactivated');
            })
            ->get();

        $count = 0;
        foreach ($resignations as $resignation) {
            $resignation->employee->update([
                'account_status' => 'Deactivated'
            ]);
            $count++;

            $this->info("Deactivated: {$resignation->employee->name} (ID: {$resignation->employee->id})");
        }

        $this->info("Total accounts deactivated: {$count}");
        return Command::SUCCESS;
    }
}
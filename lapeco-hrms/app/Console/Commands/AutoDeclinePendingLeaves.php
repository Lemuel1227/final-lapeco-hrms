<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Leave;
use App\Models\SystemSetting;
use App\Models\Notification;
use Carbon\Carbon;

class AutoDeclinePendingLeaves extends Command
{
    protected $signature = 'leave:auto-decline-pending {--days= : Override auto-decline days}';

    protected $description = 'Decline pending leave requests with no response after configured days';

    public function handle()
    {
        $override = $this->option('days');
        $days = is_numeric($override) ? (int) $override : (int) (SystemSetting::getValue('leave_auto_decline_days', 0) ?? 0);
        if ($days <= 0) {
            $this->info('Auto-decline disabled');
            return 0;
        }

        $cutoff = Carbon::now()->subDays($days);
        $targets = Leave::where('status', 'Pending')
            ->where('created_at', '<=', $cutoff)
            ->get();

        $count = 0;
        foreach ($targets as $leave) {
            $leave->update([
                'status' => 'Declined',
                'reason' => trim(($leave->reason ?? '') . ' Auto-declined after ' . $days . ' day(s) without response.')
            ]);

            $employee = $leave->user;
            if ($employee) {
                Notification::createForUser(
                    $employee->id,
                    'leave_status_update',
                    'Leave Request Declined',
                    'Your ' . $leave->type . ' request from ' . date('M j, Y', strtotime($leave->date_from)) . ' to ' . date('M j, Y', strtotime($leave->date_to)) . ' was automatically declined after ' . $days . ' day(s) with no response.',
                    [
                        'leave_id' => $leave->id,
                        'leave_type' => $leave->type,
                        'status' => 'Declined',
                        'date_from' => $leave->date_from,
                        'date_to' => $leave->date_to,
                        'days' => $leave->days,
                        'action_url' => '/dashboard/my-leave'
                    ]
                );
            }
            $count++;
        }

        $this->info('Declined ' . $count . ' pending leave request(s)');
        return 0;
    }
}
<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Holiday;
use App\Models\User;
use App\Models\Notification;
use Carbon\Carbon;

class NotifyUpcomingHolidays extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'holidays:notify-upcoming {--days=3 : Number of days ahead to check for holidays}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Send notifications to all employees and team leaders about upcoming holidays';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $daysAhead = (int) $this->option('days');
        $targetDate = Carbon::now()->addDays($daysAhead)->format('Y-m-d');
        
        // Find holidays occurring on the target date
        $upcomingHolidays = Holiday::whereDate('date', $targetDate)->get();
        
        if ($upcomingHolidays->isEmpty()) {
            $this->info("No holidays found for {$targetDate}");
            return 0;
        }
        
        // Get all active employees and team leaders
        $users = User::whereNotIn('employment_status', ['terminated', 'resigned'])->get();
        
        foreach ($upcomingHolidays as $holiday) {
            $this->info("Processing holiday: {$holiday->title} on {$holiday->date}");
            
            // Determine notification message based on days ahead
            if ($daysAhead === 0) {
                $dayText = 'today';
            } elseif ($daysAhead === 1) {
                $dayText = 'tomorrow';
            } else {
                $dayText = "in {$daysAhead} days";
            }
            
            $holidayDate = Carbon::parse($holiday->date)->format('F j, Y');
            $dayOfWeek = Carbon::parse($holiday->date)->format('l');
            
            $message = "Upcoming Holiday: {$holiday->title} is {$dayText} ({$dayOfWeek}, {$holidayDate}).";
            
            if ($holiday->description) {
                $message .= " " . $holiday->description;
            }
            
            // Send notification to each user
            foreach ($users as $user) {
                // Check if notification already exists for this user and holiday
                $existingNotification = Notification::where('user_id', $user->id)
                    ->where('type', 'holiday_reminder')
                    ->whereJsonContains('data->holiday_id', $holiday->id)
                    ->whereJsonContains('data->reminder_days', $daysAhead)
                    ->first();
                
                if (!$existingNotification) {
                    // Set different action URLs based on user role
                    $actionUrl = $user->role === 'SUPER_ADMIN' 
                        ? '/dashboard/holiday-management' 
                        : '/dashboard/my-attendance';
                    
                    Notification::createForUser(
                        $user->id,
                        'holiday_reminder',
                        'Upcoming Holiday',
                        $message,
                        [
                            'holiday_id' => $holiday->id,
                            'holiday_title' => $holiday->title,
                            'holiday_date' => $holiday->date,
                            'holiday_type' => $holiday->type,
                            'reminder_days' => $daysAhead,
                            'action_url' => $actionUrl
                        ]
                    );
                    
                    $this->line("  → Notified {$user->name} ({$user->role})");
                }
            }
        }
        
        $this->info("Holiday notifications sent successfully!");
        return 0;
    }
}


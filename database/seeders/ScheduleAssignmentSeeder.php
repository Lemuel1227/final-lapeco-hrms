<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Schedule;
use App\Models\ScheduleAssignment;
use App\Models\User;
use Carbon\Carbon;

class ScheduleAssignmentSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Get all users and create schedules for the last 30 days
        $users = User::all();
        
        if ($users->isEmpty()) {
            $this->command->warn('No users found. Please seed users first.');
            return;
        }

        // Create schedules for the last 30 days and next 7 days
        $startDate = now()->subDays(30);
        $endDate = now()->addDays(7);
        
        for ($date = $startDate->copy(); $date->lte($endDate); $date->addDay()) {
            // Skip weekends for this example
            if ($date->isWeekend()) {
                continue;
            }
            
            // Create or get schedule for this date
            $schedule = Schedule::firstOrCreate(
                ['date' => $date->toDateString()],
                [
                    'name' => 'Daily Schedule - ' . $date->format('M d, Y'),
                    'description' => 'Regular daily schedule for ' . $date->format('l, F j, Y')
                ]
            );
            
            // Assign 70% of users to work each day (simulate realistic scheduling)
            $workingUsers = $users->random(max(1, (int)($users->count() * 0.7)));
            
            foreach ($workingUsers as $user) {
                // Skip if assignment already exists
                if (ScheduleAssignment::where('schedule_id', $schedule->id)
                    ->where('user_id', $user->id)
                    ->exists()) {
                    continue;
                }
                
                // Generate different shift times
                $shiftType = rand(1, 3);
                switch ($shiftType) {
                    case 1: // Morning shift
                        $startTime = '08:00';
                        $endTime = '17:00';
                        break;
                    case 2: // Afternoon shift
                        $startTime = '13:00';
                        $endTime = '22:00';
                        break;
                    case 3: // Night shift
                        $startTime = '22:00';
                        $endTime = '06:00';
                        break;
                }
                
                ScheduleAssignment::create([
                    'schedule_id' => $schedule->id,
                    'user_id' => $user->id,
                    'start_time' => $startTime,
                    'end_time' => $endTime,
                    'notes' => 'Auto-generated schedule assignment'
                ]);
            }
        }
        
        $this->command->info('Schedule assignments seeded successfully!');
    }
}
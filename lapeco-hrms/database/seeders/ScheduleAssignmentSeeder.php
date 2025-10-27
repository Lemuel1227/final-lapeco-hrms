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
        $users = User::whereNotIn('employment_status', ['terminated', 'resigned'])
            ->get();
        
        if ($users->isEmpty()) {
            $this->command->warn('No active users found. Please seed users first.');
            return;
        }

        // Create schedules for the last 60 days and next 7 days to match AttendanceSeeder
        $startDate = now()->subDays(60);
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
            $eligibleUsers = $users->filter(function ($user) {
                return !in_array(strtolower($user->employment_status ?? ''), ['inactive', 'terminated', 'resigned']);
            });

            if ($eligibleUsers->isEmpty()) {
                continue;
            }

            $workingUsers = $eligibleUsers->random(max(1, (int)($eligibleUsers->count() * 0.7)));
            
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
                        $endTime = '16:00';
                        break;
                    case 2: // Afternoon shift
                        $startTime = '13:00';
                        $endTime = '20:00';
                        break;
                    case 3: // Night shift
                        $startTime = '22:00';
                        $endTime = '06:00';
                        break;
                }
                
                // Generate realistic overtime hours based on various factors
                $otHours = 0;
                
                // 60% chance of no overtime (most common)
                if (rand(1, 100) <= 60) {
                    $otHours = 0;
                } 
                // 25% chance of light overtime (0.5-2 hours)
                else if (rand(1, 100) <= 85) {
                    $otHours = [0.5, 1.0, 1.5, 2.0][rand(0, 3)];
                }
                // 10% chance of moderate overtime (2.5-4 hours)
                else if (rand(1, 100) <= 95) {
                    $otHours = [2.5, 3.0, 3.5, 4.0][rand(0, 3)];
                }
                // 5% chance of heavy overtime (4.5-6 hours) - rare cases
                else {
                    $otHours = [4.5, 5.0, 5.5, 6.0][rand(0, 3)];
                }
                
                // Increase overtime probability on Fridays (project deadlines)
                if ($date->isFriday() && $otHours == 0 && rand(1, 100) <= 30) {
                    $otHours = [1.0, 1.5, 2.0, 2.5][rand(0, 3)];
                }
                
                // Night shift workers get slightly more overtime
                if ($shiftType == 3 && $otHours == 0 && rand(1, 100) <= 20) {
                    $otHours = [0.5, 1.0, 1.5][rand(0, 2)];
                }
                
                $breakStart = Carbon::parse($startTime)->addHours(4)->format('H:i');
                $breakEnd = Carbon::parse($breakStart)->addMinutes(45)->format('H:i');

                ScheduleAssignment::create([
                    'schedule_id' => $schedule->id,
                    'user_id' => $user->id,
                    'start_time' => $startTime,
                    'end_time' => $endTime,
                    'break_start' => $breakStart,
                    'break_end' => $breakEnd,
                    'ot_hours' => $otHours,
                    'notes' => 'Auto-generated schedule assignment'
                ]);
            }
        }
        
        $this->command->info('Schedule assignments seeded successfully!');
    }
}
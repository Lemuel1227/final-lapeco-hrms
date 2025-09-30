<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Attendance;
use App\Models\ScheduleAssignment;
use App\Models\User;
use App\Models\Schedule;
use Carbon\Carbon;

class AttendanceSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Get all schedule assignments for the last 30 days
        $scheduleAssignments = ScheduleAssignment::with(['schedule', 'user'])
            ->whereHas('schedule', function ($query) {
                $query->where('date', '>=', now()->subDays(30))
                      ->where('date', '<=', now());
            })
            ->get();

        foreach ($scheduleAssignments as $assignment) {
            // Skip some assignments to simulate absences (20% absence rate)
            if (rand(1, 100) <= 20) {
                Attendance::create([
                    'schedule_assignment_id' => $assignment->id,
                    'status' => 'absent'
                ]);
                continue;
            }

            // Generate realistic attendance times
            $shiftStart = Carbon::parse($assignment->start_time);
            $shiftEnd = Carbon::parse($assignment->end_time);
            
            // Generate sign in time (80% on time, 20% with various delays)
            $lateChance = rand(1, 100);
            if ($lateChance <= 80) {
                // On time or early (within 15 minutes of start time)
                $signInTime = $shiftStart->copy()->subMinutes(rand(0, 15));
            } else {
                // Late arrival (5-45 minutes late)
                $signInTime = $shiftStart->copy()->addMinutes(rand(5, 45));
            }
            
            // Break times (1 hour lunch break)
            $breakOutTime = $shiftStart->copy()->addHours(4)->addMinutes(rand(-30, 30));
            $breakInTime = $breakOutTime->copy()->addHour()->addMinutes(rand(-15, 15));
            
            // Sign out time (usually on time or slightly late)
            $signOutTime = $shiftEnd->copy()->addMinutes(rand(-10, 20));
            
            // Determine status based on actual times
            $status = 'present';
            
            // Check if late (more than 15 minutes after scheduled start)
            $lateThreshold = $shiftStart->copy()->addMinutes(15);
            if ($signInTime->gt($lateThreshold)) {
                $status = 'late';
            }
            
            Attendance::create([
                'schedule_assignment_id' => $assignment->id,
                'sign_in' => $signInTime->format('H:i'),
                'break_out' => $breakOutTime->format('H:i'),
                'break_in' => $breakInTime->format('H:i'),
                'sign_out' => $signOutTime->format('H:i'),
                'status' => $status
            ]);
        }

        // Create some additional attendance records for today
        $todaySchedules = ScheduleAssignment::with(['schedule', 'user'])
            ->whereHas('schedule', function ($query) {
                $query->where('date', now()->toDateString());
            })
            ->get();

        foreach ($todaySchedules as $assignment) {
            // Skip if already has attendance
            if (Attendance::where('schedule_assignment_id', $assignment->id)->exists()) {
                continue;
            }

            $shiftStart = Carbon::parse($assignment->start_time);
            $now = now();
            
            // Only create if shift has started
            if ($now->gt($shiftStart)) {
                // Generate realistic sign in time for today
                $lateChance = rand(1, 100);
                if ($lateChance <= 85) {
                    // On time or early
                    $signInTime = $shiftStart->copy()->subMinutes(rand(0, 10));
                } else {
                    // Late arrival
                    $signInTime = $shiftStart->copy()->addMinutes(rand(5, 35));
                }
                
                // Determine status based on 15-minute threshold
                $lateThreshold = $shiftStart->copy()->addMinutes(15);
                $status = $signInTime->gt($lateThreshold) ? 'late' : 'present';
                
                // Break times only if enough time has passed
                $breakOutTime = null;
                $breakInTime = null;
                if ($now->gt($shiftStart->copy()->addHours(3))) {
                    $breakOutTime = $shiftStart->copy()->addHours(4)->addMinutes(rand(-20, 20));
                    if ($now->gt($breakOutTime->copy()->addMinutes(30))) {
                        $breakInTime = $breakOutTime->copy()->addHour()->addMinutes(rand(-10, 10));
                    }
                }
                
                Attendance::create([
                    'schedule_assignment_id' => $assignment->id,
                    'sign_in' => $signInTime->format('H:i'),
                    'break_out' => $breakOutTime ? $breakOutTime->format('H:i') : null,
                    'break_in' => $breakInTime ? $breakInTime->format('H:i') : null,
                    'sign_out' => null, // Still working
                    'status' => $status
                ]);
            } else {
                // Future shifts or not started yet
                Attendance::create([
                    'schedule_assignment_id' => $assignment->id,
                    'status' => 'absent' // Will be updated when they clock in
                ]);
            }
        }

        $this->command->info('Attendance records seeded successfully!');
    }
}
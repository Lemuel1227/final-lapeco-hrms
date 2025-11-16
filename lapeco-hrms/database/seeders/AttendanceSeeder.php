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
        // Clear existing attendance records to avoid conflicts
        Attendance::truncate();
        
        // Get all schedule assignments for the last 60 days
        $scheduleAssignments = ScheduleAssignment::with(['schedule', 'user'])
            ->whereHas('schedule', function ($query) {
                $query->whereBetween('date', [
                    now()->subDays(60),
                    now()->subDay() // Don't include today, we'll handle it separately
                ]);
            })
            ->get();

        foreach ($scheduleAssignments as $assignment) {
            // Create attendance record for this assignment
            $attendance = Attendance::create([
                'schedule_assignment_id' => $assignment->id,
                'status' => 'scheduled',
                'sign_in' => null,
                'break_out' => null,
                'break_in' => null,
                'sign_out' => null,
            ]);
            
            // Get the schedule date to determine absence patterns
            $scheduleDate = Carbon::parse($assignment->schedule->date);
            $dayOfWeek = $scheduleDate->dayOfWeek;
            $isMonday = $dayOfWeek === 1;
            $isFriday = $dayOfWeek === 5;
            $isWeekend = $scheduleDate->isWeekend();
            
            // More realistic absence rates - much lower base rate
            $baseAbsenceRate = 5; // Base 5% absence rate (much more realistic)
            
            // Mondays have slightly higher absence rate (post-weekend effect)
            if ($isMonday) {
                $baseAbsenceRate = 8;
            }
            
            // Fridays have slightly higher absence rate
            if ($isFriday) {
                $baseAbsenceRate = 7;
            }
            
            // Weekend shifts have higher absence rate
            if ($isWeekend) {
                $baseAbsenceRate = 12;
            }
            
            // Seasonal variations - higher absence in December/January (holidays)
            $month = $scheduleDate->month;
            if (in_array($month, [12, 1])) {
                $baseAbsenceRate += 3;
            }
            
            // Summer months (April-June) might have higher absence due to vacations
            if (in_array($month, [4, 5, 6])) {
                $baseAbsenceRate += 2;
            }
            
            // Skip some assignments to simulate absences
            if (rand(1, 100) <= $baseAbsenceRate) {
                $attendance->update([
                    'status' => 'absent',
                    'sign_in' => null,
                    'break_out' => null,
                    'break_in' => null,
                    'sign_out' => null
                ]);
                $assignment->update(['ot_hours' => 0]);
                continue;
            }

            // Generate realistic attendance times
            $shiftStart = Carbon::parse($assignment->start_time);
            $shiftEnd = Carbon::parse($assignment->end_time);
            
            // Determine overtime (20% chance of 1 hour, 8% chance of 2 hours, otherwise none)
            $overtimeHours = 0;
            $overtimeRoll = rand(1, 100);
            if ($overtimeRoll <= 8) {
                $overtimeHours = 2;
            } elseif ($overtimeRoll <= 28) {
                $overtimeHours = 1;
            }

            // Generate sign in time (85% on time, 15% with various delays)
            $lateChance = rand(1, 100);
            if ($lateChance <= 85) {
                // On time or early (within 10 minutes of start time)
                $signInTime = $shiftStart->copy()->subMinutes(rand(0, 10));
            } else {
                // Late arrival (5-30 minutes late)
                $signInTime = $shiftStart->copy()->addMinutes(rand(5, 30));
            }
            
            // Break times (1 hour lunch break)
            $breakOutTime = $shiftStart->copy()->addHours(4)->addMinutes(rand(-30, 30));
            $breakInTime = $breakOutTime->copy()->addHour()->addMinutes(rand(-15, 15));
            
            // Sign out time aligns with scheduled end plus overtime, allowing small variance
            $signOutVariance = rand(-5, 10);
            $signOutTime = $shiftEnd->copy()->addHours($overtimeHours)->addMinutes($signOutVariance);
            
            // Determine status based on actual times
            $status = 'present';
            
            // Check if late (more than 15 minutes after scheduled start)
            $lateThreshold = $shiftStart->copy()->addMinutes(15);
            if ($signInTime->gt($lateThreshold)) {
                $status = 'late';
            }
            
            $attendance->update([
                'sign_in' => $signInTime->format('H:i'),
                'break_out' => $breakOutTime->format('H:i'),
                'break_in' => $breakInTime->format('H:i'),
                'sign_out' => $signOutTime->format('H:i'),
                'status' => $status,
            ]);

            $assignment->update(['ot_hours' => $overtimeHours]);
        }

        // Create some additional attendance records for today
        $todaySchedules = ScheduleAssignment::with(['schedule', 'user'])
            ->whereHas('schedule', function ($query) {
                $query->where('date', now()->toDateString());
            })
            ->get();

        foreach ($todaySchedules as $assignment) {
            // Get existing attendance record (should exist due to ScheduleAssignment model)
            $attendance = Attendance::where('schedule_assignment_id', $assignment->id)->first();
            
            if (!$attendance) {
                // This shouldn't happen with the new logic, but create if missing
                $attendance = Attendance::create([
                    'schedule_assignment_id' => $assignment->id,
                    'status' => 'scheduled'
                ]);
            }
            
            // Only update if it's still in 'scheduled' status (not manually updated)
            if ($attendance->status !== 'scheduled') {
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
                
                $attendance->update([
                    'sign_in' => $signInTime->format('H:i'),
                    'break_out' => $breakOutTime ? $breakOutTime->format('H:i') : null,
                    'break_in' => $breakInTime ? $breakInTime->format('H:i') : null,
                    'sign_out' => null, // Still working
                    'status' => $status
                ]);
            } else {
                // Future shifts or not started yet - keep as scheduled
                // No need to update since it should already be 'scheduled'
            }
        }

        $this->command->info('Attendance records seeded successfully!');
    }
}
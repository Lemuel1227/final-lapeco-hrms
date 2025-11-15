<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\TrainingEnrollment;
use App\Models\TrainingProgram;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class UpdateTrainingProgress extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'training:update-progress';

    /**
     * The console command description.
     */
    protected $description = 'Update enrollments progress daily based on Required Days and enrollment date';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $updatedCount = 0;

        // Fetch all enrollments with their programs
        $enrollments = TrainingEnrollment::with('program')->get();

        foreach ($enrollments as $enrollment) {
            $program = $enrollment->program;
            if (!$program) {
                continue; // no associated program
            }

            $requiredDays = $this->parseRequiredDays($program->duration);
            if (!$requiredDays || $requiredDays <= 0) {
                // No required days available; skip
                continue;
            }

            // If program is completed, force enrollment to completed
            if (strtolower($program->status) === 'completed') {
                $this->markEnrollmentCompleted($enrollment);
                $updatedCount++;
                continue;
            }

            // Must have an enrollment date to compute days
            $enrolledAt = $enrollment->enrolled_at ? Carbon::parse($enrollment->enrolled_at)->startOfDay() : null;
            if (!$enrolledAt) {
                // If missing, do not attempt to auto-progress
                continue;
            }

            $today = Carbon::today();
            // Inclusive day count: first day counts as 1
            $daysElapsed = max(0, $enrolledAt->diffInDays($today) + 1);
            $daysCompleted = min($daysElapsed, $requiredDays);
            $progress = (int) floor(($daysCompleted / $requiredDays) * 100);

            // Determine status from progress
            if ($progress >= 100) {
                $this->markEnrollmentCompleted($enrollment);
            } elseif ($progress > 0) {
                $enrollment->status = 'In Progress';
                $enrollment->progress = $progress;
                $enrollment->save();
            } else {
                $enrollment->status = 'Not Started';
                $enrollment->progress = 0;
                $enrollment->save();
            }

            $updatedCount++;
        }

        // Recompute program statuses after updates
        $programs = TrainingProgram::with('enrollments')->get();
        foreach ($programs as $program) {
            $newStatus = $this->computeProgramStatus($program);
            if ($program->status !== $newStatus) {
                try {
                    $program->status = $newStatus;
                    $program->save();
                } catch (\Throwable $e) {
                    // Fallback for legacy enum schemas
                    $msg = strtolower($e->getMessage());
                    $isEnumIssue = str_contains($msg, 'enum') || str_contains($msg, 'data truncated for column') || str_contains($msg, 'sqlstate[01000]');
                    if ($isEnumIssue && $program->status === 'Inactive') {
                        $program->status = 'Draft';
                        $program->save();
                    } else {
                        throw $e;
                    }
                }
            }
        }

        $this->info("Training progress update completed. Updated {$updatedCount} enrollments.");
        return Command::SUCCESS;
    }

    private function markEnrollmentCompleted(TrainingEnrollment $enrollment): void
    {
        $enrollment->status = 'Completed';
        $enrollment->progress = 100;
        $enrollment->completed_at = Carbon::now();
        $enrollment->save();
    }

    /**
     * Parse "Required Days" from program duration strings.
     * Supports "Required Days: N", "Period: N days", and "Period: N months" (months ≈ 30 days).
     */
    private function parseRequiredDays(?string $duration): ?int
    {
        $text = trim((string) $duration);
        if ($text === '') return null;

        if (preg_match('/Required\s*Days:\s*(\d+)/i', $text, $m)) {
            return max(0, (int) $m[1]);
        }

        if (preg_match('/Period:\s*(\d+)\s*(day|days|month|months)/i', $text, $m)) {
            $value = (int) $m[1];
            $unit = strtolower($m[2]);
            return str_starts_with($unit, 'month') ? $value * 30 : $value;
        }

        // Fallback: any standalone days/months
        if (preg_match('/(\d+)\s*(day|days|month|months)/i', $text, $m)) {
            $value = (int) $m[1];
            $unit = strtolower($m[2]);
            return str_starts_with($unit, 'month') ? $value * 30 : $value;
        }

        return null;
    }

    /**
     * Compute program status: Inactive if no enrollments, Completed if all completed, otherwise Active.
     */
    private function computeProgramStatus(TrainingProgram $program): string
    {
        $enrollments = $program->enrollments ?? collect();
        $total = $enrollments->count();
        if ($total === 0) {
            return 'Inactive';
        }
        $completedCount = $enrollments->filter(function ($e) {
            return strtolower($e->status) === 'completed';
        })->count();
        return $completedCount === $total ? 'Completed' : 'Active';
    }
}
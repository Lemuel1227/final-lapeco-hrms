<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Resignation;
use App\Models\User;
use Carbon\Carbon;

class ResignationSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Get employees with IDs above 30 (excluding HR managers)
        $employees = User::where('role', '!=', 'SUPER_ADMIN')
                        ->where('id', '>', 30)
                        ->take(20)
                        ->get();
        $hrUsers = User::where('role', 'SUPER_ADMIN')->get();
        
        if ($employees->isEmpty() || $hrUsers->isEmpty()) {
            $this->command->info('No employees or HR managers found. Please seed users first.');
            return;
        }

        $resignationReasons = [
            'Career advancement opportunity',
            'Personal reasons',
            'Relocation to another city',
            'Better compensation package',
            'Work-life balance',
            'Family obligations',
            'Pursuing higher education',
            'Health reasons'
        ];

        $statuses = ['pending', 'approved'];

        foreach ($employees as $index => $employee) {
            $submissionDate = Carbon::now()->subDays(rand(30, 365 * 3));
            $effectiveDate = $submissionDate->copy()->addDays(rand(30, 90));
            $status = $statuses[array_rand($statuses)];
            
            $resignationData = [
                'employee_id' => $employee->id,
                'reason' => $resignationReasons[array_rand($resignationReasons)],
                'submission_date' => $submissionDate,
                'effective_date' => $effectiveDate,
                'status' => $status,
                'notes' => $this->generateNotes($status),
            ];

            // If approved, add approval details and update employee status
            if ($status === 'approved') {
                $resignationData['approved_by'] = $hrUsers->random()->id;
                $resignationData['approved_at'] = $submissionDate->copy()->addDays(rand(1, 7));
            }

            Resignation::create($resignationData);
        }

        $this->command->info('Resignation records seeded successfully!');
    }

    private function generateNotes($status)
    {
        switch ($status) {
            case 'approved':
                return 'Resignation approved. Employee has completed all necessary handover procedures.';
            case 'pending':
                return 'Under review by HR department.';
            default:
                return null;
        }
    }
}


<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Termination;
use App\Models\User;
use Carbon\Carbon;

class TerminationSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Get employees with IDs above 30 (excluding Super Admins and already resigned employees)
        $employees = User::where('role', '!=', 'SUPER_ADMIN')
                        ->where('employment_status', 'active')
                        ->where('id', '>', 30)
                        ->take(15)->get();
        $hrUsers = User::where('role', 'SUPER_ADMIN')->get();
        
        if ($employees->isEmpty() || $hrUsers->isEmpty()) {
            $this->command->info('No active employees or Super Admins found for termination seeding.');
            return;
        }

        $terminationTypes = ['voluntary', 'involuntary'];
        
        $voluntaryReasons = [
            'End of contract',
            'Mutual agreement',
            'Retirement',
            'Job abandonment'
        ];

        $involuntaryReasons = [
            'Performance issues',
            'Misconduct',
            'Violation of company policy',
            'Redundancy',
            'Budget constraints',
            'Attendance issues'
        ];

        foreach ($employees as $index => $employee) {
            $terminationDate = Carbon::now()->subDays(rand(30, 365 * 3));
            $lastWorkingDay = $terminationDate->copy()->subDays(rand(0, 21));
            $type = $terminationTypes[array_rand($terminationTypes)];
            
            $terminationData = [
                'employee_id' => $employee->id,
                'type' => $type,
                'reason' => $type === 'voluntary' 
                    ? $voluntaryReasons[array_rand($voluntaryReasons)]
                    : $involuntaryReasons[array_rand($involuntaryReasons)],
                'termination_date' => $terminationDate,
                'last_working_day' => $lastWorkingDay,
                'notes' => $this->generateNotes($type),
                'terminated_by' => $hrUsers->random()->id,
            ];

            Termination::create($terminationData);
            
            // Update employee employment status
            $employee->update(['employment_status' => 'terminated']);
        }

        $this->command->info('Termination records seeded successfully!');
    }

    private function generateNotes($type)
    {
        switch ($type) {
            case 'voluntary':
                return 'Employee terminated voluntarily. All company property returned and final settlements completed.';
            case 'involuntary':
                return 'Employee terminated due to company policy violations. HR procedures followed as per company guidelines.';
            default:
                return 'Termination processed according to company policies.';
        }
    }
}

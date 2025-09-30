<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Position;
use App\Models\Holiday;
use App\Models\Schedule;
use App\Models\ScheduleAssignment;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Arr;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Seed positions
        $positions = [
            [
                'name' => 'HR Personnel',
                'description' => 'Handles recruitment, payroll, and employee relations.',
                'monthly_salary' => 35000,
            ],
            [
                'name' => 'Packer',
                'description' => 'Prepares and packs finished products for shipment.',
                'monthly_salary' => 18000,
            ],
            [
                'name' => 'Lifter',
                'description' => 'Operates lifting equipment to move heavy materials.',
                'monthly_salary' => 22000,
            ],
            [
                'name' => 'Picker',
                'description' => 'Selects items from inventory to fulfill orders.',
                'monthly_salary' => 18500,
            ],
            [
                'name' => 'Mover',
                'description' => 'Transports materials and goods within the facility.',
                'monthly_salary' => 19000,
            ],
        ];
        $positionIds = [];
        foreach ($positions as $pos) {
            $position = Position::create($pos);
            $positionIds[$pos['name']] = $position->id;
        }

        // Seed users, at least one for each position
        \App\Models\User::factory()->create([
            'name' => 'HR Personnel',
            'email' => 'hr@example.com',
            'role' => 'HR_PERSONNEL',
            'position_id' => $positionIds['HR Personnel'],
            'account_status' => 'Active',
        ]);
        \App\Models\User::factory()->create([
            'name' => 'Packer Team Leader',
            'email' => 'packer.leader@example.com',
            'role' => 'TEAM_LEADER',
            'position_id' => $positionIds['Packer'],
            'account_status' => 'Active',
        ]);
        \App\Models\User::factory()->create([
            'name' => 'Lifter Team Leader',
            'email' => 'lifter.leader@example.com',
            'role' => 'TEAM_LEADER',
            'position_id' => $positionIds['Lifter'],
            'account_status' => 'Active',
        ]);
        \App\Models\User::factory()->create([
            'name' => 'Picker Team Leader',
            'email' => 'picker.leader@example.com',
            'role' => 'TEAM_LEADER',
            'position_id' => $positionIds['Picker'],
            'account_status' => 'Active',
        ]);
        \App\Models\User::factory()->create([
            'name' => 'Mover Team Leader',
            'email' => 'mover.leader@example.com',
            'role' => 'TEAM_LEADER',
            'position_id' => $positionIds['Mover'],
            'account_status' => 'Deactivated',
        ]);
        \App\Models\User::factory()->create([
            'name' => 'Packer',
            'email' => 'packer@example.com',
            'role' => 'REGULAR_EMPLOYEE',
            'position_id' => $positionIds['Packer'],
            'account_status' => 'Active',
        ]);
        \App\Models\User::factory()->create([
            'name' => 'Lifter',
            'email' => 'lifter@example.com',
            'role' => 'REGULAR_EMPLOYEE',
            'position_id' => $positionIds['Lifter'],
            'account_status' => 'Active',
        ]);
        \App\Models\User::factory()->create([
            'name' => 'Picker',
            'email' => 'picker@example.com',
            'role' => 'REGULAR_EMPLOYEE',
            'position_id' => $positionIds['Picker'],
            'account_status' => 'Deactivated',
        ]);
        \App\Models\User::factory()->create([
            'name' => 'Mover',
            'email' => 'mover@example.com',
            'role' => 'REGULAR_EMPLOYEE',
            'position_id' => $positionIds['Mover'],
            'account_status' => 'Active',
        ]);

        // Create additional users distributed among positions
        $allPositionIds = array_values($positionIds);
        \App\Models\User::factory(65)->create()->each(function ($user) use ($allPositionIds) {
            $role = rand(1, 10) === 1 ? 'TEAM_LEADER' : 'REGULAR_EMPLOYEE'; // ~10% team leaders
            $accountStatus = rand(1, 5) === 1 ? 'Deactivated' : 'Active'; // ~20% deactivated
            $user->update([
                'role' => $role,
                'position_id' => $allPositionIds[array_rand($allPositionIds)],
                'account_status' => $accountStatus,
            ]);
        });

        // Seed 15 real PH holidays (sample/common list for current year)
        
        // Seed some leave requests
        \App\Models\Leave::factory()->create([
            'user_id' => \App\Models\User::where('email', 'packer@example.com')->first()->id,
            'type' => 'Sick Leave',
            'date_from' => date('Y-m-d', strtotime('2025-03-15')),
            'date_to' => date('Y-m-d', strtotime('2025-03-17')),
            'days' => 3,
            'status' => 'Approved',
            'reason' => 'Medical appointment and recovery',
        ]);
        
        // Create additional random leave requests
        \App\Models\Leave::factory(15)->create();

        $year = (int) date('Y');
        $phHolidays = [
            ['New Year\'s Day', "$year-01-01", 'REGULAR'],
            ['Araw ng Kagitingan', "$year-04-09", 'REGULAR'],
            ['Labor Day', "$year-05-01", 'REGULAR'],
            ['Independence Day', "$year-06-12", 'REGULAR'],
            ['National Heroes Day', date('Y-m-d', strtotime("last Monday of August $year")), 'REGULAR'],
            ['Bonifacio Day', "$year-11-30", 'REGULAR'],
            ['Christmas Day', "$year-12-25", 'REGULAR'],
            ['Rizal Day', "$year-12-30", 'REGULAR'],
            ['Chinese New Year', date('Y-m-d', strtotime("third Saturday of January $year")), 'SPECIAL'],
            ['EDSA People Power Revolution Anniversary', "$year-02-25", 'SPECIAL'],
            ['Black Saturday', date('Y-m-d', strtotime("next Saturday", strtotime("Good Friday $year"))), 'SPECIAL'],
            ['All Saints\' Day', "$year-11-01", 'SPECIAL'],
            ['Feast of the Immaculate Conception of Mary', "$year-12-08", 'SPECIAL'],
            ['Ninoy Aquino Day', "$year-08-21", 'SPECIAL'],
            ['All Souls\' Day', "$year-11-02", 'SPECIAL'],
        ];

        foreach ($phHolidays as [$title, $date, $type]) {
            Holiday::create([
                'title' => $title,
                'date' => $date,
                'type' => $type,
                'is_recurring' => true,
            ]);
        }

        // Seed disciplinary cases
        $employees = User::limit(5)->get();
        
        if ($employees->count() > 0) {
            // Create sample disciplinary case for David Green (EMP004)
            $davidGreen = $employees->where('employee_id', 'EMP004')->first() ?? $employees->first();
            
            $disciplinaryCase = \App\Models\DisciplinaryCase::create([
                'employee_id' => $davidGreen->id,
                'action_type' => 'Verbal Warning',
                'description' => 'Employee was 25 minutes late on 2025-06-14 without prior notification.',
                'incident_date' => '2025-06-15',
                'reason' => 'Tardiness',
                'status' => 'Ongoing',
                'resolution_taken' => 'Monitor attendance for the next 30 days.',
                'attachment' => null,
            ]);

            // Create action logs for the disciplinary case
            \App\Models\ActionLog::create([
                'disciplinary_case_id' => $disciplinaryCase->id,
                'date_created' => '2025-06-15',
                'description' => 'Case Created. Verbal warning issued by HR Manager Grace Field.',
            ]);

            \App\Models\ActionLog::create([
                'disciplinary_case_id' => $disciplinaryCase->id,
                'date_created' => '2025-06-16',
                'description' => 'Follow-up discussion held with employee and their team leader, Carol White.',
            ]);

            // Create additional sample cases for other employees
            $actionTypes = ['Verbal Warning', 'Written Warning', 'Final Warning', 'Suspension'];
            $reasons = ['Tardiness', 'Unauthorized Absence', 'Insubordination', 'Policy Violation', 'Safety Violation'];
            $statuses = ['Ongoing', 'Under Investigation', 'Resolved', 'Closed'];

            foreach ($employees->skip(1)->take(4) as $index => $employee) {
                $case = \App\Models\DisciplinaryCase::create([
                    'employee_id' => $employee->id,
                    'action_type' => $actionTypes[array_rand($actionTypes)],
                    'description' => 'Employee violated company policy. Investigation and appropriate action required.',
                    'incident_date' => now()->subDays(rand(1, 30))->format('Y-m-d'),
                    'reason' => $reasons[array_rand($reasons)],
                    'status' => $statuses[array_rand($statuses)],
                    'resolution_taken' => 'Appropriate disciplinary action taken according to company policy.',
                    'attachment' => null,
                ]);

                // Create initial action log for each case
                \App\Models\ActionLog::create([
                    'disciplinary_case_id' => $case->id,
                    'date_created' => $case->incident_date,
                    'description' => 'Case created. Initial investigation started by HR department.',
                ]);
            }
        }

        // Seed schedules and schedule assignments (one schedule per date)
        $schedules = [
            [
                'name' => 'Schedule for ' . now()->format('Y-m-d'),
                'date' => now()->format('Y-m-d'),
                'description' => 'Daily operations schedule for warehouse',
            ],
            [
                'name' => 'Schedule for ' . now()->addDay()->format('Y-m-d'),
                'date' => now()->addDay()->format('Y-m-d'),
                'description' => 'Daily operations schedule for warehouse',
            ],
            [
                'name' => 'Schedule for ' . now()->addDays(2)->format('Y-m-d'),
                'date' => now()->addDays(2)->format('Y-m-d'),
                'description' => 'Daily operations schedule for warehouse',
            ],
        ];

        $createdSchedules = [];
        foreach ($schedules as $scheduleData) {
            $schedule = Schedule::create($scheduleData);
            $createdSchedules[] = $schedule;
        }

        // Assign users to schedules with different shifts
        $activeUsers = User::where('account_status', 'Active')->get();
        $shifts = [
            ['start_time' => '08:00', 'end_time' => '17:00', 'type' => 'Morning Shift'],
            ['start_time' => '14:00', 'end_time' => '23:00', 'type' => 'Afternoon Shift'],
            ['start_time' => '22:00', 'end_time' => '07:00', 'type' => 'Night Shift'],
        ];

        foreach ($createdSchedules as $schedule) {
            // For each schedule, assign users to different shifts
            $availableUsers = $activeUsers->shuffle();
            $usersPerShift = intval($availableUsers->count() / 3); // Distribute users across 3 shifts
            
            foreach ($shifts as $shiftIndex => $shift) {
                $startIndex = $shiftIndex * $usersPerShift;
                $endIndex = ($shiftIndex === 2) ? $availableUsers->count() : ($shiftIndex + 1) * $usersPerShift;
                $usersForShift = $availableUsers->slice($startIndex, $endIndex - $startIndex);
                
                foreach ($usersForShift as $user) {
                    ScheduleAssignment::create([
                        'schedule_id' => $schedule->id,
                        'user_id' => $user->id,
                        'start_time' => $shift['start_time'],
                        'end_time' => $shift['end_time'],
                        'notes' => $shift['type'] . ' assignment for ' . $schedule->name,
                    ]);
                }
            }
        }

        // Seed attendance data
        $this->call(AttendanceSeeder::class);
        
        // Seed applicant data
        $this->call(ApplicantSeeder::class);
    }
}

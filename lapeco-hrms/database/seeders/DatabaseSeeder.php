<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Position;
use App\Models\Holiday;
use App\Models\Schedule;
use App\Models\ScheduleAssignment;
use App\Models\TrainingProgram;
use App\Models\TrainingEnrollment;
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
                'base_rate_per_hour' => 198.86,
                'regular_day_ot_rate' => 248.58,
                'special_ot_rate' => 298.29,
                'regular_holiday_ot_rate' => 397.72,
                'night_diff_rate_per_hour' => 30.00,
                'late_deduction_per_minute' => 5.00,
            ],
            [
                'name' => 'Packer',
                'description' => 'Prepares and packs finished products for shipment.',
                'monthly_salary' => 18000,
                'base_rate_per_hour' => 102.27,
                'regular_day_ot_rate' => 127.84,
                'special_ot_rate' => 153.41,
                'regular_holiday_ot_rate' => 204.54,
                'night_diff_rate_per_hour' => 15.00,
                'late_deduction_per_minute' => 2.50,
            ],
            [
                'name' => 'Lifter',
                'description' => 'Operates lifting equipment to move heavy materials.',
                'monthly_salary' => 22000,
                'base_rate_per_hour' => 125.00,
                'regular_day_ot_rate' => 156.25,
                'special_ot_rate' => 187.50,
                'regular_holiday_ot_rate' => 250.00,
                'night_diff_rate_per_hour' => 18.75,
                'late_deduction_per_minute' => 3.00,
            ],
            [
                'name' => 'Picker',
                'description' => 'Selects items from inventory to fulfill orders.',
                'monthly_salary' => 18500,
                'base_rate_per_hour' => 105.11,
                'regular_day_ot_rate' => 131.39,
                'special_ot_rate' => 157.67,
                'regular_holiday_ot_rate' => 210.22,
                'night_diff_rate_per_hour' => 15.77,
                'late_deduction_per_minute' => 2.75,
            ],
            [
                'name' => 'Mover',
                'description' => 'Transports materials and goods within the facility.',
                'monthly_salary' => 19000,
                'base_rate_per_hour' => 108.45,
                'regular_day_ot_rate' => 135.56,
                'special_ot_rate' => 162.68,
                'regular_holiday_ot_rate' => 216.90,
                'night_diff_rate_per_hour' => 16.27,
                'late_deduction_per_minute' => 2.80,
            ],
        ];
        $positionIds = [];
        foreach ($positions as $pos) {
            $position = Position::firstOrCreate(
                ['name' => $pos['name']],
                $pos
            );
            $positionIds[$pos['name']] = $position->id;
        }

        // Seed users, at least one for each position
        $seedUsers = [
            [
                'first_name' => 'HR',
                'middle_name' => null,
                'last_name' => 'Personnel',
                'email' => 'hr@example.com',
                'role' => 'HR_PERSONNEL',
                'position_id' => $positionIds['HR Personnel'],
                'account_status' => 'Active',
            ],
            [
                'first_name' => 'Packer',
                'middle_name' => null,
                'last_name' => 'Leader',
                'email' => 'packer.leader@example.com',
                'role' => 'TEAM_LEADER',
                'position_id' => $positionIds['Packer'],
                'account_status' => 'Active',
            ],
            [
                'first_name' => 'Lifter',
                'middle_name' => null,
                'last_name' => 'Leader',
                'email' => 'lifter.leader@example.com',
                'role' => 'TEAM_LEADER',
                'position_id' => $positionIds['Lifter'],
                'account_status' => 'Active',
            ],
            [
                'first_name' => 'Picker',
                'middle_name' => null,
                'last_name' => 'Leader',
                'email' => 'picker.leader@example.com',
                'role' => 'TEAM_LEADER',
                'position_id' => $positionIds['Picker'],
                'account_status' => 'Active',
            ],
            [
                'first_name' => 'Mover',
                'middle_name' => null,
                'last_name' => 'Leader',
                'email' => 'mover.leader@example.com',
                'role' => 'TEAM_LEADER',
                'position_id' => $positionIds['Mover'],
                'account_status' => 'Active',
            ],
            [
                'first_name' => 'Packer',
                'middle_name' => null,
                'last_name' => 'Employee',
                'email' => 'packer@example.com',
                'role' => 'REGULAR_EMPLOYEE',
                'position_id' => $positionIds['Packer'],
                'account_status' => 'Active',
            ],
            [
                'first_name' => 'Lifter',
                'middle_name' => null,
                'last_name' => 'Employee',
                'email' => 'lifter@example.com',
                'role' => 'REGULAR_EMPLOYEE',
                'position_id' => $positionIds['Lifter'],
                'account_status' => 'Active',
            ],
            [
                'first_name' => 'Picker',
                'middle_name' => null,
                'last_name' => 'Employee',
                'email' => 'picker@example.com',
                'role' => 'REGULAR_EMPLOYEE',
                'position_id' => $positionIds['Picker'],
                'account_status' => 'Active',
            ],
            [
                'first_name' => 'Mover',
                'middle_name' => null,
                'last_name' => 'Employee',
                'email' => 'mover@example.com',
                'role' => 'REGULAR_EMPLOYEE',
                'position_id' => $positionIds['Mover'],
                'account_status' => 'Active',
            ],
            [
                'first_name' => 'Lemuel',
                'middle_name' => 'John',
                'last_name' => 'Ellasus',
                'email' => 'lemuelellasus1@gmail.com',
                'role' => 'HR_PERSONNEL',
                'position_id' => $positionIds['HR Personnel'],
                'account_status' => 'Active',
            ],
        ];

        foreach ($seedUsers as $userData) {
            $exists = \App\Models\User::where('email', $userData['email'])->exists();
            if (!$exists) {
                \App\Models\User::factory()->create($userData);
            }
        }

        // Create additional users distributed among positions
        $allPositionIds = array_values($positionIds);
        \App\Models\User::factory(65)->create()->each(function ($user) use ($allPositionIds) {
            $role = rand(1, 10) === 1 ? 'TEAM_LEADER' : 'REGULAR_EMPLOYEE'; // ~10% team leaders
            $user->update([
                'role' => $role,
                'position_id' => $allPositionIds[array_rand($allPositionIds)],
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

        $this->call(PerformanceEvaluationSeeder::class);



        // Seed training programs (normalized duration: "<hours/minutes> per day; Required Days: <N>")
        $trainingPrograms = [
            [
                'title' => 'Workplace Safety Training',
                'description' => 'Comprehensive safety training covering warehouse operations, equipment handling, and emergency procedures.',
                'provider' => 'SafeWork Philippines',
                'duration' => '8 hours per day; Required Days: 1',
                'start_date' => now()->addDays(7)->format('Y-m-d'),
                'end_date' => now()->addDays(7)->format('Y-m-d'),
                'status' => 'Active',
                'cost' => 2500.00,
                'location' => 'Training Room A',
                'type' => 'In-person',
                'max_participants' => 25,
                'requirements' => 'All warehouse employees must attend'
            ],
            [
                'title' => 'Leadership Development Program',
                'description' => 'Advanced leadership skills training for team leaders and supervisors.',
                'provider' => 'Leadership Institute Manila',
                'duration' => '8 hours per day; Required Days: 2',
                'start_date' => now()->addDays(14)->format('Y-m-d'),
                'end_date' => now()->addDays(15)->format('Y-m-d'),
                'status' => 'Active',
                'cost' => 8500.00,
                'location' => 'Conference Room',
                'type' => 'In-person',
                'max_participants' => 15,
                'requirements' => 'Team leaders and supervisory roles'
            ],
            [
                'title' => 'Forklift Operation Certification',
                'description' => 'Certified training for forklift operation and maintenance.',
                'provider' => 'Heavy Equipment Training Center',
                'duration' => '6 hours per day; Required Days: 2',
                'start_date' => now()->addDays(21)->format('Y-m-d'),
                'end_date' => now()->addDays(22)->format('Y-m-d'),
                'status' => 'Active',
                'cost' => 4500.00,
                'location' => 'Warehouse Floor',
                'type' => 'In-person',
                'max_participants' => 10,
                'requirements' => 'Valid driver\'s license required'
            ],
            [
                'title' => 'Customer Service Excellence',
                'description' => 'Training focused on improving customer interaction and service quality.',
                'provider' => 'Service Excellence Academy',
                'duration' => '6 hours per day; Required Days: 1',
                'start_date' => now()->subDays(30)->format('Y-m-d'),
                'end_date' => now()->subDays(30)->format('Y-m-d'),
                'status' => 'Completed',
                'cost' => 3200.00,
                'location' => 'Training Room B',
                'type' => 'In-person',
                'max_participants' => 20,
                'requirements' => 'Customer-facing employees'
            ],
            [
                'title' => 'Digital Literacy Workshop',
                'description' => 'Basic computer skills and digital tools training for all employees.',
                'provider' => 'TechSkills Philippines',
                'duration' => '4 hours per day; Required Days: 1',
                'start_date' => now()->subDays(15)->format('Y-m-d'),
                'end_date' => now()->subDays(15)->format('Y-m-d'),
                'status' => 'Completed',
                'cost' => 1800.00,
                'location' => 'Computer Lab',
                'type' => 'Online',
                'max_participants' => 30,
                'requirements' => 'Open to all employees'
            ]
        ];

        $createdPrograms = [];
        foreach ($trainingPrograms as $programData) {
            $program = TrainingProgram::create($programData);
            $createdPrograms[] = $program;
        }

        // Seed training enrollments
        $allUsers = User::where('account_status', 'Active')->get();
        
        foreach ($createdPrograms as $program) {
            // Skip enrollments for inactive programs to reflect business rules
            if ($program->status === 'Inactive') {
                continue;
            }
            // Determine enrollment count based on program type and status
            $enrollmentCount = match($program->type) {
                'In-person' => rand(5, min($program->max_participants, 15)),
                'Online' => rand(8, min($program->max_participants, 20)),
                'Hybrid' => rand(6, min($program->max_participants, 12)),
                default => rand(5, min($program->max_participants, 10))
            };

            // Select random users for enrollment
            $selectedUsers = $allUsers->random($enrollmentCount);

            foreach ($selectedUsers as $user) {
                $enrollmentStatus = match($program->status) {
                    'Completed' => 'Completed',
                    'Active' => ['In Progress', 'Not Started'][rand(0, 1)],
                    'Inactive' => 'Not Started',
                    'Cancelled' => 'Not Started',
                    default => 'Not Started'
                };

                $progress = match($enrollmentStatus) {
                    'Completed' => 100,
                    'Dropped' => rand(10, 60),
                    'In Progress' => rand(20, 80),
                    'Not Started' => 0,
                    default => 0
                };

                $score = match($enrollmentStatus) {
                    'Completed' => rand(70, 100),
                    default => null
                };

                $enrolledAt = match($program->status) {
                    'Completed' => now()->subDays(rand(35, 45)),
                    'Active' => now()->subDays(rand(1, 10)),
                    'Inactive' => now()->subDays(rand(1, 5)),
                    'Cancelled' => now()->subDays(rand(5, 15)),
                    default => now()->subDays(rand(1, 7))
                };

                $completedAt = ($enrollmentStatus === 'Completed') 
                    ? $enrolledAt->copy()->addDays(rand(1, 3))
                    : null;

                TrainingEnrollment::create([
                    'program_id' => $program->id,
                    'user_id' => $user->id,
                    'status' => $enrollmentStatus,
                    'progress' => $progress,
                    'enrolled_at' => $enrolledAt,
                    'completed_at' => $completedAt,
                    'score' => $score,
                    'notes' => $this->generateEnrollmentNotes($enrollmentStatus, $user->name)
                ]);
            }
        }

        
        // Seed applicant data
        $this->call(ApplicantSeeder::class);
        
        // Seed resignation data
        $this->call(ResignationSeeder::class);
        
        // Seed termination data
        $this->call(TerminationSeeder::class);
        // Seed attendance data

        // Seed schedule template data
        $this->call(ScheduleTemplateSeeder::class);
        
        // Seed schedule template assignments
        $this->call(ScheduleTemplateAssignmentSeeder::class);
        
        // Seed schedule assignment data
        $this->call(ScheduleAssignmentSeeder::class);
        
        //Seed Attendance data
        $this->call(AttendanceSeeder::class);

        // Seed sample payroll periods and records for final pay display
        $this->call(PayrollSeeder::class);
    }
    
    /**
     * Generate enrollment notes based on status
     */
    private function generateEnrollmentNotes($status, $userName)
    {
        return match($status) {
            'Completed' => "Training completed successfully by {$userName}. Good participation and engagement.",
            'In Progress' => "Currently enrolled and attending training sessions.",
            'Not Started' => "Enrollment confirmed. Training will begin soon.",
            default => "Standard enrollment for {$userName}."
        };

    }
}

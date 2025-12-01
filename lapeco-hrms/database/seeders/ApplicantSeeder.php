<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Applicant;

class ApplicantSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        echo "Starting ApplicantSeeder...\n";
        
        $applicants = [
            [
                'first_name' => 'John',
                'middle_name' => 'Michael',
                'last_name' => 'Doe',
                'email' => 'john.doe@example.com',
                'phone' => '+1234567890',
                'birthday' => '1990-05-15',
                'gender' => 'Male',
                'job_opening_id' => 1, // Placeholder - no job_openings table exists
                'status' => 'New Applicant',
                'application_date' => now()->subDays(rand(30, 365 * 3))->toDateString(),
                'notes' => 'Strong background in software development',
                'sss_no' => '12-3456789-0',
                'tin_no' => '123-456-789-000',
                'pag_ibig_no' => '1234-5678-9012',
                'philhealth_no' => '12-345678901-2',
            ],
            [
                'first_name' => 'Jane',
                'middle_name' => 'Elizabeth',
                'last_name' => 'Smith',
                'email' => 'jane.smith@example.com',
                'phone' => '+1234567891',
                'birthday' => '1988-08-22',
                'gender' => 'Female',
                'job_opening_id' => 2,
                'status' => 'Interview',
                'application_date' => now()->subDays(rand(30, 365 * 3))->toDateString(),
                'notes' => 'Excellent communication skills',
                'sss_no' => '12-3456789-1',
                'tin_no' => '123-456-789-001',
                'pag_ibig_no' => '1234-5678-9013',
                'philhealth_no' => '12-345678901-3',
            ],
            [
                'first_name' => 'Robert',
                'middle_name' => null,
                'last_name' => 'Johnson',
                'email' => 'robert.johnson@example.com',
                'phone' => '+1234567892',
                'birthday' => '1992-12-10',
                'gender' => 'Male',
                'job_opening_id' => 1,
                'status' => 'Interview',
                'application_date' => now()->subDays(rand(30, 365 * 3))->toDateString(),
                'notes' => 'Scheduled for technical interview',
                'interview_schedule' => [
                    'date' => now()->addDays(2)->toDateString(),
                    'time' => '10:00 AM',
                    'interviewer' => 'HR Manager',
                    'location' => 'Conference Room A',
                    'notes' => 'Technical interview with team lead',
                    'scheduled_at' => now()->subDays(1)->toDateTimeString(),
                ],
                'sss_no' => null,
                'tin_no' => '123-456-789-002',
                'pag_ibig_no' => null,
                'philhealth_no' => '12-345678901-4',
            ],
            [
                'first_name' => 'Emily',
                'middle_name' => 'Rose',
                'last_name' => 'Davis',
                'email' => 'emily.davis@example.com',
                'phone' => '+1234567893',
                'birthday' => '1991-03-18',
                'gender' => 'Female',
                'job_opening_id' => 3,
                'status' => 'Offer',
                'application_date' => now()->subDays(rand(30, 365 * 3))->toDateString(),
                'notes' => 'Offer extended, awaiting response',
                'sss_no' => '12-3456789-3',
                'tin_no' => '123-456-789-003',
                'pag_ibig_no' => '1234-5678-9015',
                'philhealth_no' => '12-345678901-5',
            ],
            [
                'first_name' => 'Michael',
                'middle_name' => 'James',
                'last_name' => 'Wilson',
                'email' => 'michael.wilson@example.com',
                'phone' => '+1234567894',
                'birthday' => '1989-07-25',
                'gender' => 'Male',
                'job_opening_id' => 2,
                'status' => 'Rejected',
                'application_date' => now()->subDays(rand(30, 365 * 3))->toDateString(),
                'notes' => 'Did not meet minimum requirements',
                'sss_no' => '12-3456789-4',
                'tin_no' => null,
                'pag_ibig_no' => '1234-5678-9016',
                'philhealth_no' => null,
            ],
            [
                'first_name' => 'Sarah',
                'middle_name' => 'Anne',
                'last_name' => 'Brown',
                'email' => 'sarah.brown@example.com',
                'phone' => '+1234567895',
                'birthday' => '1993-11-08',
                'gender' => 'Female',
                'job_opening_id' => 1,
                'status' => 'Hired',
                'application_date' => now()->subDays(rand(30, 365 * 3))->toDateString(),
                'notes' => 'Successfully hired as Software Developer',
                'sss_no' => '12-3456789-5',
                'tin_no' => '123-456-789-005',
                'pag_ibig_no' => '1234-5678-9017',
                'philhealth_no' => '12-345678901-7',
            ],
        ];

        foreach ($applicants as $applicant) {
            Applicant::create($applicant);
        }
        
        echo "ApplicantSeeder completed. Created " . count($applicants) . " applicants.\n";
    }
}

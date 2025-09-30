<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\ScheduleTemplate;
use App\Models\ScheduleAssignment;
use App\Models\User;

class ScheduleTemplateAssignmentSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $templates = ScheduleTemplate::all();
        $users = User::where('role', '!=', 'HR_PERSONNEL')->get(); // Exclude HR from schedule assignments

        if ($templates->isEmpty() || $users->isEmpty()) {
            $this->command->warn('No templates or users found. Please run ScheduleTemplateSeeder and ensure users exist.');
            return;
        }

        // Define shift patterns for different templates
        $shiftPatterns = [
            'Morning Shift Production' => [
                ['start' => '06:00', 'end' => '14:00'],
                ['start' => '07:00', 'end' => '15:00'],
                ['start' => '08:00', 'end' => '16:00'],
            ],
            'Evening Shift Customer Service' => [
                ['start' => '14:00', 'end' => '22:00'],
                ['start' => '15:00', 'end' => '23:00'],
                ['start' => '16:00', 'end' => '00:00'],
            ],
            'Weekend Security Coverage' => [
                ['start' => '18:00', 'end' => '06:00'],
                ['start' => '22:00', 'end' => '10:00'],
            ],
            'Night Shift Maintenance' => [
                ['start' => '22:00', 'end' => '06:00'],
                ['start' => '23:00', 'end' => '07:00'],
            ],
            'Holiday Special Operations' => [
                ['start' => '09:00', 'end' => '17:00'],
                ['start' => '10:00', 'end' => '18:00'],
                ['start' => '11:00', 'end' => '19:00'],
            ],
            'Training Day Schedule' => [
                ['start' => '09:00', 'end' => '17:00'],
                ['start' => '10:00', 'end' => '16:00'],
            ],
            'Sales Team Daily' => [
                ['start' => '08:00', 'end' => '17:00'],
                ['start' => '09:00', 'end' => '18:00'],
                ['start' => '10:00', 'end' => '19:00'],
            ],
            'IT Support Rotation' => [
                ['start' => '08:00', 'end' => '16:00'],
                ['start' => '16:00', 'end' => '00:00'],
                ['start' => '00:00', 'end' => '08:00'],
            ],
        ];

        // Sample notes for different types of assignments
        $sampleNotes = [
            'Morning Shift Production' => [
                'Responsible for quality control checks',
                'Lead operator for production line A',
                'Safety coordinator for morning shift',
                'Equipment maintenance specialist',
            ],
            'Evening Shift Customer Service' => [
                'Handle escalated customer complaints',
                'Monitor chat support queue',
                'Process refund requests',
                'Train new customer service reps',
            ],
            'Weekend Security Coverage' => [
                'Main entrance security checkpoint',
                'Patrol parking areas every 2 hours',
                'Monitor CCTV systems',
                'Emergency response coordinator',
            ],
            'Night Shift Maintenance' => [
                'HVAC system maintenance',
                'Electrical equipment inspection',
                'Cleaning and facility upkeep',
                'Emergency repair standby',
            ],
            'Holiday Special Operations' => [
                'Holiday event coordination',
                'Extended customer support',
                'Special project management',
                'Overtime coverage specialist',
            ],
            'Training Day Schedule' => [
                'New employee orientation',
                'Safety training coordinator',
                'Skills assessment supervisor',
                'Training material preparation',
            ],
            'Sales Team Daily' => [
                'Client relationship manager',
                'Lead generation specialist',
                'Sales presentation coordinator',
                'Territory coverage manager',
            ],
            'IT Support Rotation' => [
                'Level 1 technical support',
                'Network infrastructure monitoring',
                'Software deployment specialist',
                'On-call emergency support',
            ],
        ];

        foreach ($templates as $template) {
            $templateName = $template->name;
            $shifts = $shiftPatterns[$templateName] ?? [['start' => '09:00', 'end' => '17:00']];
            $notes = $sampleNotes[$templateName] ?? ['Standard assignment'];
            
            // Assign 3-6 random users to each template
            $assignmentCount = rand(3, 6);
            $selectedUsers = $users->random($assignmentCount);
            
            foreach ($selectedUsers as $index => $user) {
                $shift = $shifts[$index % count($shifts)];
                $note = $notes[$index % count($notes)];
                
                ScheduleAssignment::create([
                    'schedule_template_id' => $template->id,
                    'user_id' => $user->id,
                    'start_time' => $shift['start'],
                    'end_time' => $shift['end'],
                    'notes' => $note,
                ]);
            }
        }

        $this->command->info('Schedule template assignments seeded successfully!');
    }
}
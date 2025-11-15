<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\ScheduleTemplate;

class ScheduleTemplateSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $templates = [
            [
                'name' => 'Morning Shift Production',
                'description' => 'Standard morning shift template for production team with early start times and regular breaks.',
                'columns' => ['department', 'break_time', 'lunch_time', 'overtime_eligible']
            ],
            [
                'name' => 'Evening Shift Customer Service',
                'description' => 'Evening shift template designed for customer service representatives handling peak hours.',
                'columns' => ['desk_number', 'phone_extension', 'team_lead', 'break_schedule']
            ],
            [
                'name' => 'Weekend Security Coverage',
                'description' => 'Weekend security shift template with extended hours and patrol schedules.',
                'columns' => ['patrol_zone', 'radio_channel', 'backup_contact', 'emergency_protocol']
            ],
            [
                'name' => 'Night Shift Maintenance',
                'description' => 'Night maintenance crew template for equipment servicing and facility upkeep.',
                'columns' => ['equipment_zone', 'maintenance_type', 'safety_gear', 'completion_checklist']
            ],
            [
                'name' => 'Holiday Special Operations',
                'description' => 'Special template for holiday periods with adjusted staffing and extended coverage.',
                'columns' => ['holiday_pay_rate', 'special_duties', 'coverage_area', 'supervisor_contact']
            ],
            [
                'name' => 'Training Day Schedule',
                'description' => 'Template for training sessions and onboarding new employees with structured learning periods.',
                'columns' => ['training_module', 'trainer_name', 'room_assignment', 'assessment_time']
            ],
            [
                'name' => 'Sales Team Daily',
                'description' => 'Daily sales team template with client meeting slots and target tracking.',
                'columns' => ['sales_territory', 'client_meetings', 'target_calls', 'reporting_manager']
            ],
            [
                'name' => 'IT Support Rotation',
                'description' => 'IT support team rotation template covering different technical areas and on-call duties.',
                'columns' => ['support_tier', 'technology_focus', 'escalation_path', 'on_call_status']
            ],
            [
                'name' => 'Core Operations Day Shift',
                'description' => 'Predefined day shift for HR, packing, and moving personnel with fixed break schedules.',
                'columns' => []
            ]
        ];

        foreach ($templates as $template) {
            ScheduleTemplate::create($template);
        }

        $this->command->info('Schedule templates seeded successfully!');
    }
}
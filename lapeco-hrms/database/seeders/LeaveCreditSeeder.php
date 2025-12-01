<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\LeaveCredit;
use App\Models\User;
use App\Models\Leave;

class LeaveCreditSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $users = User::all();
        $currentYear = (int) date('Y');
        $baseLeaveTypes = [
            'Vacation Leave' => 5,
            'Sick Leave' => 5,
            'Emergency Leave' => 5,
        ];

        foreach ($users as $user) {
            foreach ($baseLeaveTypes as $type => $defaultCredits) {
                $approvedDays = Leave::where('user_id', $user->id)
                    ->where('type', $type)
                    ->whereYear('date_from', $currentYear)
                    ->where('status', 'Approved')
                    ->sum('days');

                $totalCredits = max($defaultCredits, $approvedDays);

                LeaveCredit::updateOrCreate(
                    [
                        'user_id' => $user->id,
                        'leave_type' => $type,
                        'year' => $currentYear,
                    ],
                    [
                        'total_credits' => $totalCredits,
                        'used_credits' => $approvedDays,
                    ]
                );
            }

            // Seed historical credits for the past 3 years (excluding current year)
            for ($offset = 1; $offset <= 3; $offset++) {
                $year = $currentYear - $offset;
                foreach (['Vacation Leave', 'Sick Leave'] as $historicalType) {
                    LeaveCredit::updateOrCreate(
                        [
                            'user_id' => $user->id,
                            'leave_type' => $historicalType,
                            'year' => $year,
                        ],
                        [
                            'total_credits' => 5,
                            'used_credits' => 0,
                        ]
                    );
                }
            }
        }
    }
}
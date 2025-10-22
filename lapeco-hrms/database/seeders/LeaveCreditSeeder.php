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
            'Vacation Leave' => 15,
            'Sick Leave' => 10,
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
        }
    }
}
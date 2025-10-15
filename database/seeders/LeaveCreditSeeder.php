<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\LeaveCredit;
use App\Models\User;

class LeaveCreditSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $users = User::all();
        $leaveTypes = [
            'Vacation Leave' => 15,
            'Sick Leave' => 10,
            'Emergency Leave' => 5,
        ];

        foreach ($users as $user) {
            foreach ($leaveTypes as $type => $credits) {
                LeaveCredit::updateOrCreate(
                    [
                        'user_id' => $user->id,
                        'leave_type' => $type,
                        'year' => date('Y'),
                    ],
                    [
                        'total_credits' => $credits,
                        'used_credits' => 0,
                    ]
                );
            }
        }
    }
}
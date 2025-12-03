<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use App\Models\User;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('is_team_leader')->default(false)->after('role');
        });

        // Migrate existing TEAM_LEADER roles to REGULAR_EMPLOYEE + is_team_leader = true
        User::where('role', 'TEAM_LEADER')->chunk(100, function ($users) {
            foreach ($users as $user) {
                $user->update([
                    'role' => 'REGULAR_EMPLOYEE',
                    'is_team_leader' => true
                ]);
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert users who are team leaders back to TEAM_LEADER role
        User::where('is_team_leader', true)
            ->where('role', 'REGULAR_EMPLOYEE')
            ->chunk(100, function ($users) {
                foreach ($users as $user) {
                    $user->update([
                        'role' => 'TEAM_LEADER'
                    ]);
                }
            });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('is_team_leader');
        });
    }
};

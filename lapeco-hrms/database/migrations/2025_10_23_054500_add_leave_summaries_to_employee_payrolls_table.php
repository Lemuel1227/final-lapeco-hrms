<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('employee_payrolls', function (Blueprint $table) {
            $table->json('absences_summary')->nullable()->after('total_deductions');
            $table->json('leave_balances_summary')->nullable()->after('absences_summary');
            $table->json('leave_earnings_summary')->nullable()->after('leave_balances_summary');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('employee_payrolls', function (Blueprint $table) {
            $table->dropColumn(['absences_summary', 'leave_balances_summary', 'leave_earnings_summary']);
        });
    }
};

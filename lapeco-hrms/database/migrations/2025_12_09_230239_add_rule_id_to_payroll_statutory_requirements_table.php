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
        Schema::table('payroll_statutory_requirements', function (Blueprint $table) {
            $table->foreignId('rule_id')->nullable()->after('employees_payroll_id')->constrained('statutory_deduction_rules')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payroll_statutory_requirements', function (Blueprint $table) {
            $table->dropForeign(['rule_id']);
            $table->dropColumn('rule_id');
        });
    }
};

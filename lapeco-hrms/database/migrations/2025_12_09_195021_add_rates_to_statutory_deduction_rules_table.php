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
        Schema::table('statutory_deduction_rules', function (Blueprint $table) {
            $table->decimal('employee_rate', 5, 2)->nullable()->after('fixed_percentage');
            $table->decimal('employer_rate', 5, 2)->nullable()->after('employee_rate');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('statutory_deduction_rules', function (Blueprint $table) {
            $table->dropColumn(['employee_rate', 'employer_rate']);
        });
    }
};

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
        Schema::table('disciplinary_cases', function (Blueprint $table) {
            $table->foreignId('payroll_period_id')->nullable()->constrained('payroll_periods')->nullOnDelete()->after('is_deducted');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('disciplinary_cases', function (Blueprint $table) {
            $table->dropForeign(['payroll_period_id']);
            $table->dropColumn('payroll_period_id');
        });
    }
};

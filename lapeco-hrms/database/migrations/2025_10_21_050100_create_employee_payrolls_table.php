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
        Schema::create('employee_payrolls', function (Blueprint $table) {
            $table->id();
            $table->foreignId('period_id')->constrained('payroll_periods')->cascadeOnDelete();
            $table->foreignId('employee_id')->constrained('users')->cascadeOnDelete();
            $table->enum('paid_status', ['Pending', 'Paid', 'Failed'])->default('Pending');
            $table->date('pay_date')->nullable();
            // TEXT type for encrypted data storage
            $table->text('gross_earning')->nullable();
            $table->text('total_deductions')->nullable();
            // JSON columns for leave summaries
            $table->json('absences_summary')->nullable();
            $table->json('leave_balances_summary')->nullable();
            $table->json('leave_earnings_summary')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('employee_payrolls');
    }
};

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
        Schema::create('payroll_earnings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employees_payroll_id')->constrained('employee_payrolls')->cascadeOnDelete();
            $table->string('earning_type');
            $table->decimal('earning_hours', 8, 2)->default(0);
            // TEXT type for encrypted data storage
            $table->text('earning_pay')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payroll_earnings');
    }
};

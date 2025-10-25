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
        Schema::create('payroll_statutory_requirements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employees_payroll_id')->constrained('employee_payrolls')->cascadeOnDelete();
            $table->string('requirement_type');
            // TEXT type for encrypted data storage
            $table->text('requirement_amount')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payroll_statutory_requirements');
    }
};

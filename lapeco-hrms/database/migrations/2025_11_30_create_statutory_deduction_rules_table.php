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
        Schema::create('statutory_deduction_rules', function (Blueprint $table) {
            $table->id();
            $table->string('deduction_type'); // SSS, PhilHealth, Pag-IBIG, Tax
            $table->string('rule_name')->nullable(); // For identifying rules (e.g., "SSS 2025", "PhilHealth Standard")
            $table->string('rule_type'); // 'fixed_percentage', 'salary_bracket', 'custom_formula'
            $table->text('formula')->nullable(); // JSON or expression for custom rules
            $table->decimal('fixed_percentage', 5, 2)->nullable(); // For fixed percentage rules
            $table->decimal('minimum_salary', 12, 2)->nullable(); // Minimum salary threshold
            $table->decimal('maximum_salary', 12, 2)->nullable(); // Maximum salary threshold
            $table->boolean('is_active')->default(true);
            $table->text('description')->nullable();
            $table->timestamps();
        });

        Schema::create('statutory_deduction_brackets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('rule_id')->constrained('statutory_deduction_rules')->cascadeOnDelete();
            $table->decimal('salary_from', 12, 2);
            $table->decimal('salary_to', 12, 2)->nullable(); // NULL means no upper limit
            $table->decimal('employee_rate', 5, 2);
            $table->decimal('employer_rate', 5, 2)->nullable();
            $table->decimal('fixed_amount', 12, 2)->nullable(); // For fixed deductions
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('statutory_deduction_audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('rule_id')->constrained('statutory_deduction_rules')->cascadeOnDelete();
            $table->string('action'); // 'created', 'updated', 'deleted'
            $table->text('changes')->nullable(); // JSON of what changed
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('statutory_deduction_audit_logs');
        Schema::dropIfExists('statutory_deduction_brackets');
        Schema::dropIfExists('statutory_deduction_rules');
    }
};

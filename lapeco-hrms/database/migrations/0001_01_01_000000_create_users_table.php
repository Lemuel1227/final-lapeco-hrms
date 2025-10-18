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
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('first_name');
            $table->string('middle_name')->nullable();
            $table->string('last_name');
            $table->string('username')->unique()->nullable();
            $table->string('email')->unique();
            $table->timestamp('email_verified_at')->nullable();
            $table->string('password');
            $table->string('role')->default('HR_PERSONNEL');
            $table->unsignedBigInteger('position_id')->nullable();
            $table->date('joining_date')->nullable();
            $table->date('birthday')->nullable();
            $table->string('gender')->nullable();
            $table->text('address')->nullable();
            $table->string('contact_number')->nullable();
            $table->string('image_url')->nullable();
            $table->string('sss_no')->nullable();
            $table->string('tin_no')->nullable();
            $table->string('pag_ibig_no')->nullable();
            $table->string('philhealth_no')->nullable();
            $table->string('resume_file')->nullable();
            $table->enum('theme_preference', ['light', 'dark'])->default('light');
            $table->enum('account_status', ['Active', 'Deactivated'])->default('Active');
            $table->string('attendance_status')->nullable();
            $table->enum('employment_status', ['active', 'resigned', 'terminated'])->default('active');
            $table->integer('login_attempts')->default(0);
            $table->timestamp('last_failed_login')->nullable();
            $table->timestamp('locked_until')->nullable();
            $table->integer('lockout_count')->default(0);
            $table->boolean('password_changed')->default(false);
            $table->rememberToken();
            $table->timestamps();
        });

        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });

        Schema::create('sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignId('user_id')->nullable()->index();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->longText('payload');
            $table->integer('last_activity')->index();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Proactively drop known child tables that reference `users` to avoid FK violations
        // These tables are created by later migrations and should be dropped first during refresh
        Schema::dropIfExists('performance_evaluator_responses');
        Schema::dropIfExists('performance_evaluations');
        Schema::dropIfExists('performance_evaluation_periods');
        Schema::dropIfExists('training_enrollments');
        Schema::dropIfExists('attendances'); // depends on schedule_assignments
        Schema::dropIfExists('schedule_assignments');
        Schema::dropIfExists('action_logs'); // depends on disciplinary_cases
        Schema::dropIfExists('disciplinary_cases');
        Schema::dropIfExists('terminations');
        Schema::dropIfExists('resignations');
        Schema::dropIfExists('leave_credits');
        Schema::dropIfExists('leaves');
        Schema::dropIfExists('notifications');

        // Drop dependent/auth tables first, then users to avoid FK issues
        Schema::dropIfExists('sessions');
        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('users');
    }
};

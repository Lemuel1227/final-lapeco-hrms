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
        Schema::create('applicants', function (Blueprint $table) {
            $table->id();
            $table->string('first_name');
            $table->string('middle_name')->nullable();
            $table->string('last_name');
            $table->string('email')->unique();
            $table->string('phone')->nullable();
            $table->date('birthday')->nullable();
            $table->enum('gender', ['Male', 'Female', 'Other'])->nullable();
            $table->unsignedBigInteger('job_opening_id');
            $table->string('resume_file')->nullable();
            $table->string('profile_picture')->nullable();
            $table->string('sss_no')->nullable();
            $table->string('tin_no')->nullable();
            $table->string('pag_ibig_no')->nullable();
            $table->string('philhealth_no')->nullable();
            $table->enum('status', ['New Applicant', 'Interview', 'Offer', 'Hired', 'Rejected'])->default('New Applicant');
            $table->date('application_date')->default(now());
            $table->text('notes')->nullable();
            $table->json('interview_schedule')->nullable(); // Store interview details as JSON
            $table->timestamps();

            // Add index for better query performance
            $table->index(['status', 'application_date']);
            $table->index('job_opening_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('applicants');
    }
};

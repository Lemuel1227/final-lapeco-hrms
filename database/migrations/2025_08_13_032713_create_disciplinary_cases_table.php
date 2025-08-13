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
        Schema::create('disciplinary_cases', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained('users')->onDelete('cascade');
            $table->string('case_number')->unique();
            $table->string('violation_type');
            $table->text('description');
            $table->date('incident_date');
            $table->date('reported_date');
            $table->string('reported_by');
            $table->enum('severity', ['minor', 'major', 'severe']);
            $table->enum('status', ['pending', 'under_investigation', 'resolved', 'closed']);
            $table->text('investigation_notes')->nullable();
            $table->string('action_taken')->nullable();
            $table->date('resolution_date')->nullable();
            $table->text('resolution_notes')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('disciplinary_cases');
    }
};

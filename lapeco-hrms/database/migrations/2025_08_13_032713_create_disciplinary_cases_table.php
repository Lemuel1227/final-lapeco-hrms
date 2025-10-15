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
            $table->id(); // case identifier in frontend
            $table->foreignId('employee_id')->constrained('users')->onDelete('cascade'); // Employee to be disciplined in frontend
            $table->string('action_type'); // action_type in frontend
            $table->text('description'); // description of incident in frontend
            $table->date('incident_date'); // date of incident in frontend
            $table->string('reason'); // Reason / Infraction in frontend
            $table->string('status'); // case_status in frontend
            $table->text('resolution_taken')->nullable(); // Resolution / Next Steps in frontend
            $table->string('attachment')->nullable(); // PDF attachment only
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

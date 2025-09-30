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
        Schema::create('attendances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('schedule_assignment_id')->unique()->constrained('schedule_assignments')->onDelete('cascade');
            $table->time('sign_in')->nullable();
            $table->time('break_out')->nullable();
            $table->time('break_in')->nullable();
            $table->time('sign_out')->nullable();
            $table->enum('status', ['present', 'absent', 'late'])->default('absent');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('attendances');
    }
};
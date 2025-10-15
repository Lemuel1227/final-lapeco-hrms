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
        Schema::create('training_enrollments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('program_id')->constrained('training_programs')->onDelete('cascade');
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->enum('status', ['Not Started', 'In Progress', 'Completed', 'Dropped'])->default('Not Started');
            $table->integer('progress')->default(0); // Progress percentage (0-100)
            $table->timestamp('enrolled_at')->useCurrent();
            $table->timestamp('completed_at')->nullable();
            $table->text('notes')->nullable();
            $table->decimal('score', 5, 2)->nullable(); // Final score if applicable
            $table->timestamps();
            
            // Ensure a user can only be enrolled once per program
            $table->unique(['program_id', 'user_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('training_enrollments');
    }
};

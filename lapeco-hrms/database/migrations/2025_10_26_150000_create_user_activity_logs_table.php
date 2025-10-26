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
        Schema::create('user_activity_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->string('action_type'); // login, logout, create, update, delete, view, export, etc.
            $table->string('entity_type')->nullable(); // employee, payroll, leave, etc.
            $table->unsignedBigInteger('entity_id')->nullable(); // ID of the affected entity
            $table->text('description'); // Human-readable description of the action
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->json('metadata')->nullable(); // Additional contextual data
            $table->timestamps();
            
            // Indexes for faster queries
            $table->index('user_id');
            $table->index('action_type');
            $table->index('entity_type');
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('user_activity_logs');
    }
};

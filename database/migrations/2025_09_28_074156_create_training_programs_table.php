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
        Schema::create('training_programs', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('provider')->nullable();
            $table->string('duration')->nullable(); // e.g., "2 weeks", "3 months"
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->enum('status', ['Draft', 'Active', 'Completed', 'Cancelled'])->default('Draft');
            $table->decimal('cost', 10, 2)->nullable();
            $table->string('location')->nullable();
            $table->enum('type', ['Online', 'In-person', 'Hybrid'])->nullable();
            $table->integer('max_participants')->nullable();
            $table->text('requirements')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('training_programs');
    }
};

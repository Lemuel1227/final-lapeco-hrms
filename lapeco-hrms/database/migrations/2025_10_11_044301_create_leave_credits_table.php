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
        Schema::create('leave_credits', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->enum('leave_type', ['Vacation Leave', 'Sick Leave', 'Emergency Leave',]);
            $table->integer('total_credits')->default(0)->comment('Total allocated credits for the year (0 = unlimited)');
            $table->integer('used_credits')->default(0)->comment('Credits used from approved leaves');
            $table->integer('year')->default(date('Y'))->comment('Year these credits apply to');
            $table->timestamp('last_reset_at')->nullable()->comment('Last time credits were reset');
            $table->timestamps();
            
            // Ensure one record per user per leave type per year
            $table->unique(['user_id', 'leave_type', 'year']);
            
            // Index for performance
            $table->index(['user_id', 'year']);
            $table->index(['leave_type', 'year']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('leave_credits');
    }
};

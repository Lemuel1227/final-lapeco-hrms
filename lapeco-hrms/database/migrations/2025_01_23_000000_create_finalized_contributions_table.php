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
        Schema::create('finalized_contributions', function (Blueprint $table) {
            $table->id();
            $table->string('type'); // SSS, PhilHealth, Pag-IBIG, TIN
            $table->integer('year');
            $table->integer('month'); // 1-12
            $table->string('pay_period'); // e.g., "October 2025"
            $table->json('header_data');
            $table->json('columns');
            $table->json('rows');
            $table->string('generated_by')->nullable();
            $table->timestamps();
            
            // Ensure only one finalized report per type per month
            $table->unique(['type', 'year', 'month']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('finalized_contributions');
    }
};

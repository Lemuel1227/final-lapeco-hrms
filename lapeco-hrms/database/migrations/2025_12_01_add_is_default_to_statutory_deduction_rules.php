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
        Schema::table('statutory_deduction_rules', function (Blueprint $table) {
            // Add is_default column to identify which rule to use when multiple exist for same type
            $table->boolean('is_default')->default(false)->after('is_active');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('statutory_deduction_rules', function (Blueprint $table) {
            $table->dropColumn('is_default');
        });
    }
};

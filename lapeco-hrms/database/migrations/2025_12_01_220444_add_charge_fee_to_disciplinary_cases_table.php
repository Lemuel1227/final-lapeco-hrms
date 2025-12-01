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
        Schema::table('disciplinary_cases', function (Blueprint $table) {
            $table->decimal('charge_fee', 10, 2)->nullable()->after('resolution_taken');
            $table->boolean('is_deducted')->default(false)->after('charge_fee');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('disciplinary_cases', function (Blueprint $table) {
            $table->dropColumn(['charge_fee', 'is_deducted']);
        });
    }
};

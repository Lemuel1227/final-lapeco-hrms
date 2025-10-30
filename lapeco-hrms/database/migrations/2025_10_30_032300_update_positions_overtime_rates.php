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
        Schema::table('positions', function (Blueprint $table) {
            // Drop old overtime_rate_per_hour column
            $table->dropColumn('overtime_rate_per_hour');
            
            // Add three separate OT rate columns
            $table->decimal('regular_day_ot_rate', 10, 2)->default(0)->after('base_rate_per_hour');
            $table->decimal('special_ot_rate', 10, 2)->default(0)->after('regular_day_ot_rate');
            $table->decimal('regular_holiday_ot_rate', 10, 2)->default(0)->after('special_ot_rate');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('positions', function (Blueprint $table) {
            // Drop the new columns
            $table->dropColumn(['regular_day_ot_rate', 'special_ot_rate', 'regular_holiday_ot_rate']);
            
            // Restore old overtime_rate_per_hour column
            $table->decimal('overtime_rate_per_hour', 10, 2)->default(0)->after('base_rate_per_hour');
        });
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('positions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('department_id')->nullable();
            $table->string('name');
            $table->text('description')->nullable();
            $table->integer('monthly_salary')->nullable();
            $table->json('allowed_modules')->nullable();
            $table->decimal('base_rate_per_hour', 10, 2)->default(0);
            $table->decimal('regular_day_ot_rate', 10, 2)->default(0);
            $table->decimal('special_ot_rate', 10, 2)->default(0);
            $table->decimal('regular_holiday_ot_rate', 10, 2)->default(0);
            $table->decimal('night_diff_rate_per_hour', 10, 2)->default(0);
            $table->decimal('late_deduction_per_minute', 10, 2)->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('positions');
    }
}; 
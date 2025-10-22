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
        Schema::create('performance_evaluation_periods', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->date('evaluation_start');
            $table->date('evaluation_end');
            $table->string('status')->default('scheduled');
            $table->date('open_date')->nullable();
            $table->date('close_date')->nullable();
            $table->decimal('overall_score', 5, 2)->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('performance_evaluations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('period_id')->constrained('performance_evaluation_periods')->cascadeOnDelete();
            $table->foreignId('employee_id')->constrained('users')->cascadeOnDelete();
            $table->decimal('average_score', 5, 2)->nullable();
            $table->unsignedInteger('responses_count')->default(0);
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->unique(['period_id', 'employee_id']);
        });

        Schema::create('performance_evaluator_responses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('evaluation_id')->constrained('performance_evaluations')->cascadeOnDelete();
            $table->foreignId('evaluator_id')->constrained('users')->cascadeOnDelete();
            $table->timestamp('evaluated_on');
            $table->unsignedTinyInteger('attendance');
            $table->unsignedTinyInteger('dedication');
            $table->unsignedTinyInteger('performance_job_knowledge');
            $table->unsignedTinyInteger('performance_work_efficiency_professionalism');
            $table->unsignedTinyInteger('cooperation_task_acceptance');
            $table->unsignedTinyInteger('cooperation_adaptability');
            $table->unsignedTinyInteger('initiative_autonomy');
            $table->unsignedTinyInteger('initiative_under_pressure');
            $table->unsignedTinyInteger('communication');
            $table->unsignedTinyInteger('teamwork');
            $table->unsignedTinyInteger('character');
            $table->unsignedTinyInteger('responsiveness');
            $table->unsignedTinyInteger('personality');
            $table->unsignedTinyInteger('appearance');
            $table->unsignedTinyInteger('work_habits');
            $table->text('evaluators_comment_summary')->nullable();
            $table->text('evaluators_comment_development')->nullable();
            $table->timestamps();

            // Use a shorter explicit name to avoid MySQL 64-char identifier limit
            $table->unique(['evaluation_id', 'evaluator_id'], 'perfevalresp_eval_evalr_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('performance_evaluator_responses');
        Schema::dropIfExists('performance_evaluations');
        Schema::dropIfExists('performance_evaluation_periods');
    }
};

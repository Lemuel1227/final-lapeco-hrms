<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement(<<<SQL
            UPDATE action_logs AS al
            INNER JOIN disciplinary_cases AS dc ON dc.id = al.disciplinary_case_id
            SET al.user_id = dc.reported_by
            WHERE al.user_id IS NULL AND dc.reported_by IS NOT NULL
        SQL);
    }

    public function down(): void
    {
        // No rollback for data backfill
    }
};


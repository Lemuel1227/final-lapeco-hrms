<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Step 1: Temporarily add 'Inactive' to the enum alongside existing values and set default to 'Inactive'
        DB::statement("ALTER TABLE training_programs MODIFY COLUMN status ENUM('Draft','Inactive','Active','Completed','Cancelled') NOT NULL DEFAULT 'Inactive'");

        // Step 2: Convert any existing 'Draft' values to 'Inactive'
        DB::statement("UPDATE training_programs SET status = 'Inactive' WHERE status = 'Draft'");

        // Step 3: Remove 'Draft' from the enum now that there are no rows with that value
        DB::statement("ALTER TABLE training_programs MODIFY COLUMN status ENUM('Inactive','Active','Completed','Cancelled') NOT NULL DEFAULT 'Inactive'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Reintroduce 'Draft' and set default back to 'Draft' for rollback safety
        DB::statement("ALTER TABLE training_programs MODIFY COLUMN status ENUM('Draft','Inactive','Active','Completed','Cancelled') NOT NULL DEFAULT 'Draft'");

        // Optionally convert 'Inactive' back to 'Draft' (kept minimal to avoid data loss)
        // DB::statement("UPDATE training_programs SET status = 'Draft' WHERE status = 'Inactive'");
    }
};
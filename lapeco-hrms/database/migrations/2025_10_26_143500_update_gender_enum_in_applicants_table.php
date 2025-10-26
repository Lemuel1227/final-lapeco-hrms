<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Update any existing 'Other' gender values to 'Male' before modifying the enum
        DB::table('applicants')
            ->where('gender', 'Other')
            ->update(['gender' => 'Male']);
        
        // Modify the gender column to remove 'Other' from enum
        DB::statement("ALTER TABLE applicants MODIFY COLUMN gender ENUM('Male', 'Female') NULL");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Restore the 'Other' option to the enum
        DB::statement("ALTER TABLE applicants MODIFY COLUMN gender ENUM('Male', 'Female', 'Other') NULL");
    }
};

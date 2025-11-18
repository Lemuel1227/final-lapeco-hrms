<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('users')
            ->where('role', 'HR_PERSONNEL')
            ->update(['role' => 'HR_MANAGER']);
        try {
            DB::statement('ALTER TABLE users MODIFY role VARCHAR(255) DEFAULT "HR_MANAGER"');
        } catch (\Throwable $e) {
            try {
                DB::statement('ALTER TABLE users ALTER COLUMN role SET DEFAULT "HR_MANAGER"');
            } catch (\Throwable $e2) {
            }
        }
    }

    public function down(): void
    {
        DB::table('users')
            ->where('role', 'HR_MANAGER')
            ->update(['role' => 'HR_PERSONNEL']);
        try {
            DB::statement('ALTER TABLE users MODIFY role VARCHAR(255) DEFAULT "HR_PERSONNEL"');
        } catch (\Throwable $e) {
            try {
                DB::statement('ALTER TABLE users ALTER COLUMN role SET DEFAULT "HR_PERSONNEL"');
            } catch (\Throwable $e2) {
            }
        }
    }
};
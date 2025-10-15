<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use Illuminate\Support\Facades\Log;

class LogActiveUsers extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'log:active-users';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Logs active users to a custom log file';

    /**
     * Execute the console command.
     */
    public function handle(): void
    {
        // Get actual active users from your database
        // Assuming you have an 'is_active' or 'last_login_at' field
        $activeUsers = User::where('is_active', true)
            ->orWhere('updated_at', '>=', now()->subDays(7))
            ->pluck('name')
            ->toArray();

        $userCount = count($activeUsers);
        $message = "Active Users ({$userCount}): " . implode(', ', $activeUsers);

        // Log to a custom file with better formatting
        Log::build([
            'driver' => 'single',
            'path' => storage_path('logs/active_users.log'),
            'level' => 'info',
        ])->info($message, [
            'timestamp' => now()->toDateTimeString(),
            'count' => $userCount,
            'users' => $activeUsers
        ]);

        // Output to console
        $this->info("✅ Active users logged successfully.");
        $this->line("📊 Found {$userCount} active users");
        
        if ($userCount > 0) {
            $this->table(['Active Users'], array_map(fn($user) => [$user], $activeUsers));
        }
    }
}
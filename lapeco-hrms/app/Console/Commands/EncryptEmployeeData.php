<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use App\Services\EncryptionService;
use Illuminate\Support\Facades\DB;

class EncryptEmployeeData extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'employee:encrypt-data {--force : Force encryption without confirmation}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Encrypt sensitive employee data using AES-256';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $encryptedFields = [
            'contact_number',
            'sss_no',
            'tin_no',
            'pag_ibig_no',
            'philhealth_no',
            'address',
        ];

        $this->info('This command will encrypt sensitive employee data in the database.');
        $this->info('Encrypted fields: ' . implode(', ', $encryptedFields));
        
        if (!$this->option('force')) {
            if (!$this->confirm('Do you want to continue?')) {
                $this->info('Operation cancelled.');
                return 0;
            }
        }

        $this->info('Starting encryption process...');
        
        $users = User::all();
        $encrypted = 0;
        $skipped = 0;
        $errors = 0;

        $progressBar = $this->output->createProgressBar($users->count());
        $progressBar->start();

        foreach ($users as $user) {
            try {
                $updated = false;

                foreach ($encryptedFields as $field) {
                    $value = DB::table('users')->where('id', $user->id)->value($field);
                    
                    // Skip if empty
                    if (empty($value)) {
                        continue;
                    }

                    // Check if already encrypted by looking for Laravel's encryption format
                    // Encrypted strings start with "eyJ" (base64 encoded JSON)
                    if (str_starts_with($value, 'eyJ')) {
                        // Already encrypted
                        continue;
                    }

                    // Not encrypted yet - encrypt it
                    $encryptedValue = EncryptionService::encrypt($value);
                    
                    if ($encryptedValue) {
                        DB::table('users')
                            ->where('id', $user->id)
                            ->update([$field => $encryptedValue]);
                        $updated = true;
                    }
                }

                if ($updated) {
                    $encrypted++;
                } else {
                    $skipped++;
                }

            } catch (\Exception $e) {
                $errors++;
                $this->error("\nError encrypting data for user ID {$user->id}: " . $e->getMessage());
            }

            $progressBar->advance();
        }

        $progressBar->finish();
        $this->newLine(2);

        $this->info("Encryption complete!");
        $this->table(
            ['Status', 'Count'],
            [
                ['Encrypted', $encrypted],
                ['Skipped (already encrypted or empty)', $skipped],
                ['Errors', $errors],
            ]
        );

        return 0;
    }
}

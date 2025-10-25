<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use App\Services\EncryptionService;
use Illuminate\Support\Facades\DB;

class DecryptEmployeeData extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'employee:decrypt-data {--force : Force decryption without confirmation}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Decrypt sensitive employee data (for emergency recovery only)';

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

        $this->warn('⚠️  WARNING: This command will decrypt sensitive employee data!');
        $this->warn('This should only be used for emergency recovery or migration purposes.');
        $this->info('Encrypted fields: ' . implode(', ', $encryptedFields));
        
        if (!$this->option('force')) {
            if (!$this->confirm('Are you absolutely sure you want to decrypt all employee data?')) {
                $this->info('Operation cancelled.');
                return 0;
            }
        }

        $this->info('Starting decryption process...');
        
        $users = User::all();
        $decrypted = 0;
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

                    // Try to decrypt
                    try {
                        $decryptedValue = EncryptionService::decrypt($value);
                        
                        if ($decryptedValue && $decryptedValue !== $value) {
                            DB::table('users')
                                ->where('id', $user->id)
                                ->update([$field => $decryptedValue]);
                            $updated = true;
                        } else {
                            // Already decrypted
                            $skipped++;
                        }
                    } catch (\Exception $e) {
                        // Decryption failed, probably already decrypted
                        continue;
                    }
                }

                if ($updated) {
                    $decrypted++;
                }

            } catch (\Exception $e) {
                $errors++;
                $this->error("\nError decrypting data for user ID {$user->id}: " . $e->getMessage());
            }

            $progressBar->advance();
        }

        $progressBar->finish();
        $this->newLine(2);

        $this->info("Decryption complete!");
        $this->table(
            ['Status', 'Count'],
            [
                ['Decrypted', $decrypted],
                ['Skipped (already decrypted or empty)', $skipped],
                ['Errors', $errors],
            ]
        );

        return 0;
    }
}

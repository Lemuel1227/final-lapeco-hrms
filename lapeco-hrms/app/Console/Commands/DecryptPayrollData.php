<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\EncryptionService;
use Illuminate\Support\Facades\DB;

class DecryptPayrollData extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'payroll:decrypt-data {--force : Force decryption without confirmation}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Decrypt sensitive payroll data (for emergency recovery only)';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->warn('⚠️  WARNING: This command will decrypt sensitive payroll data!');
        $this->warn('This should only be used for emergency recovery or migration purposes.');
        
        if (!$this->option('force')) {
            if (!$this->confirm('Are you absolutely sure you want to decrypt all payroll data?')) {
                $this->info('Operation cancelled.');
                return 0;
            }
        }

        $this->info('Starting decryption process...');
        
        $totalDecrypted = 0;
        $totalSkipped = 0;
        $totalErrors = 0;

        // Decrypt EmployeePayroll
        $this->info("\n1. Decrypting employee_payrolls table...");
        [$decrypted, $skipped, $errors] = $this->decryptTable(
            'employee_payrolls',
            ['gross_earning', 'total_deductions']
        );
        $totalDecrypted += $decrypted;
        $totalSkipped += $skipped;
        $totalErrors += $errors;

        // Decrypt PayrollDeduction
        $this->info("\n2. Decrypting payroll_deductions table...");
        [$decrypted, $skipped, $errors] = $this->decryptTable(
            'payroll_deductions',
            ['deduction_pay']
        );
        $totalDecrypted += $decrypted;
        $totalSkipped += $skipped;
        $totalErrors += $errors;

        // Decrypt PayrollEarning
        $this->info("\n3. Decrypting payroll_earnings table...");
        [$decrypted, $skipped, $errors] = $this->decryptTable(
            'payroll_earnings',
            ['earning_pay']
        );
        $totalDecrypted += $decrypted;
        $totalSkipped += $skipped;
        $totalErrors += $errors;

        // Decrypt PayrollStatutoryRequirement
        $this->info("\n4. Decrypting payroll_statutory_requirements table...");
        [$decrypted, $skipped, $errors] = $this->decryptTable(
            'payroll_statutory_requirements',
            ['requirement_amount']
        );
        $totalDecrypted += $decrypted;
        $totalSkipped += $skipped;
        $totalErrors += $errors;

        $this->newLine(2);
        $this->info("Decryption complete!");
        $this->table(
            ['Status', 'Count'],
            [
                ['Total Records Decrypted', $totalDecrypted],
                ['Total Records Skipped', $totalSkipped],
                ['Total Errors', $totalErrors],
            ]
        );

        return 0;
    }

    /**
     * Decrypt fields in a specific table
     */
    private function decryptTable(string $table, array $fields): array
    {
        $records = DB::table($table)->get();
        $decrypted = 0;
        $skipped = 0;
        $errors = 0;

        $progressBar = $this->output->createProgressBar($records->count());
        $progressBar->start();

        foreach ($records as $record) {
            try {
                $updated = false;

                foreach ($fields as $field) {
                    $value = $record->$field ?? null;
                    
                    // Skip if empty
                    if (empty($value)) {
                        continue;
                    }

                    // Try to decrypt
                    try {
                        $decryptedValue = EncryptionService::decrypt($value);
                        
                        if ($decryptedValue && $decryptedValue !== $value) {
                            DB::table($table)
                                ->where('id', $record->id)
                                ->update([$field => $decryptedValue]);
                            $updated = true;
                        }
                    } catch (\Exception $e) {
                        // Decryption failed, probably already decrypted
                        continue;
                    }
                }

                if ($updated) {
                    $decrypted++;
                } else {
                    $skipped++;
                }

            } catch (\Exception $e) {
                $errors++;
                $this->error("\nError decrypting record ID {$record->id} in {$table}: " . $e->getMessage());
            }

            $progressBar->advance();
        }

        $progressBar->finish();
        $this->newLine();

        return [$decrypted, $skipped, $errors];
    }
}

<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\EmployeePayroll;
use App\Models\PayrollDeduction;
use App\Models\PayrollEarning;
use App\Models\PayrollStatutoryRequirement;
use App\Services\EncryptionService;
use Illuminate\Support\Facades\DB;

class EncryptPayrollData extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'payroll:encrypt-data {--force : Force encryption without confirmation}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Encrypt sensitive payroll data using AES-256';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('This command will encrypt sensitive payroll data in the database.');
        $this->info('Tables: employee_payrolls, payroll_deductions, payroll_earnings, payroll_statutory_requirements');
        
        if (!$this->option('force')) {
            if (!$this->confirm('Do you want to continue?')) {
                $this->info('Operation cancelled.');
                return 0;
            }
        }

        $this->info('Starting encryption process...');
        
        $totalEncrypted = 0;
        $totalSkipped = 0;
        $totalErrors = 0;

        // Encrypt EmployeePayroll
        $this->info("\n1. Encrypting employee_payrolls table...");
        [$encrypted, $skipped, $errors] = $this->encryptTable(
            'employee_payrolls',
            ['gross_earning', 'total_deductions']
        );
        $totalEncrypted += $encrypted;
        $totalSkipped += $skipped;
        $totalErrors += $errors;

        // Encrypt PayrollDeduction
        $this->info("\n2. Encrypting payroll_deductions table...");
        [$encrypted, $skipped, $errors] = $this->encryptTable(
            'payroll_deductions',
            ['deduction_pay']
        );
        $totalEncrypted += $encrypted;
        $totalSkipped += $skipped;
        $totalErrors += $errors;

        // Encrypt PayrollEarning
        $this->info("\n3. Encrypting payroll_earnings table...");
        [$encrypted, $skipped, $errors] = $this->encryptTable(
            'payroll_earnings',
            ['earning_pay']
        );
        $totalEncrypted += $encrypted;
        $totalSkipped += $skipped;
        $totalErrors += $errors;

        // Encrypt PayrollStatutoryRequirement
        $this->info("\n4. Encrypting payroll_statutory_requirements table...");
        [$encrypted, $skipped, $errors] = $this->encryptTable(
            'payroll_statutory_requirements',
            ['requirement_amount']
        );
        $totalEncrypted += $encrypted;
        $totalSkipped += $skipped;
        $totalErrors += $errors;

        $this->newLine(2);
        $this->info("Encryption complete!");
        $this->table(
            ['Status', 'Count'],
            [
                ['Total Records Encrypted', $totalEncrypted],
                ['Total Records Skipped', $totalSkipped],
                ['Total Errors', $totalErrors],
            ]
        );

        return 0;
    }

    /**
     * Encrypt fields in a specific table
     */
    private function encryptTable(string $table, array $fields): array
    {
        $records = DB::table($table)->get();
        $encrypted = 0;
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

                    // Check if already encrypted by looking for Laravel's encryption format
                    // Encrypted strings start with "eyJ" (base64 encoded JSON)
                    if (is_string($value) && str_starts_with($value, 'eyJ')) {
                        // Already encrypted
                        continue;
                    }

                    // Not encrypted yet - encrypt it
                    $encryptedValue = EncryptionService::encrypt($value);
                    
                    if ($encryptedValue) {
                        DB::table($table)
                            ->where('id', $record->id)
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
                $this->error("\nError encrypting record ID {$record->id} in {$table}: " . $e->getMessage());
            }

            $progressBar->advance();
        }

        $progressBar->finish();
        $this->newLine();

        return [$encrypted, $skipped, $errors];
    }
}

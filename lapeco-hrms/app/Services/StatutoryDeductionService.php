<?php

namespace App\Services;

use App\Models\StatutoryDeductionRule;
use App\Models\StatutoryDeductionAuditLog;
use App\Support\SafeMathEvaluator;
use Exception;

class StatutoryDeductionService
{
    /**
     * Calculate statutory deduction based on dynamic rules.
     *
     * @param string $deductionType The type of deduction (SSS, PhilHealth, Pag-IBIG, Tax)
     * @param float $salary The salary to calculate deduction from
     * @param array $context Additional context variables (gross, basic, semi_gross, etc.)
     * @return array ['employeeShare' => float, 'employerShare' => float, 'total' => float]
     * @throws Exception If rule not found or calculation fails
     */
    public function calculateDeduction(string $deductionType, float $salary, array $context = []): array
    {
        $rule = StatutoryDeductionRule::getByType($deductionType);

        if (!$rule) {
            throw new Exception("No active deduction rule found for type: {$deductionType}");
        }

        // Prepare context variables
        $variables = array_merge([
            'salary' => $salary,
            'gross' => $salary,
            'basic' => $salary,
            'semi_gross' => $salary,
        ], $context);

        $result = match ($rule->rule_type) {
            'fixed_percentage' => $this->calculateFixedPercentage($rule, $salary, $variables),
            'salary_bracket' => $this->calculateSalaryBracket($rule, $salary, $variables),
            'custom_formula' => $this->calculateCustomFormula($rule, $salary, $variables),
            default => throw new Exception("Unknown rule type: {$rule->rule_type}"),
        };

        $result['rule_name'] = $rule->rule_name;
        $result['rule_id'] = $rule->id;

        return $result;
    }

    /**
     * Calculate deduction using fixed percentage rule.
     */
    private function calculateFixedPercentage(StatutoryDeductionRule $rule, float $salary, array $variables): array
    {
        // Apply minimum salary threshold if set
        if ($rule->minimum_salary && $salary < (float) $rule->minimum_salary) {
            return ['employeeShare' => 0.0, 'employerShare' => 0.0, 'total' => 0.0];
        }

        // Apply maximum salary threshold if set
        $applicableSalary = $salary;
        if ($rule->maximum_salary && $salary > (float) $rule->maximum_salary) {
            $applicableSalary = (float) $rule->maximum_salary;
        }

        $employeeRate = $rule->employee_rate ?? $rule->fixed_percentage ?? 0;
        $employerRate = $rule->employer_rate ?? 0;

        $employeeShare = round($applicableSalary * ((float) $employeeRate / 100), 2);
        $employerShare = round($applicableSalary * ((float) $employerRate / 100), 2);

        return [
            'employeeShare' => $employeeShare,
            'employerShare' => $employerShare,
            'total' => $employeeShare + $employerShare,
        ];
    }

    /**
     * Calculate deduction using salary bracket rule.
     */
    private function calculateSalaryBracket(StatutoryDeductionRule $rule, float $salary, array $variables): array
    {
        // Apply minimum salary threshold if set
        if ($rule->minimum_salary && $salary < (float) $rule->minimum_salary) {
            return ['employeeShare' => 0.0, 'employerShare' => 0.0, 'total' => 0.0];
        }

        $brackets = $rule->brackets()->orderBy('sort_order')->get();

        if ($brackets->isEmpty()) {
            throw new Exception("No brackets defined for rule: {$rule->deduction_type}");
        }

        $employeeShare = 0.0;
        $employerShare = 0.0;

        foreach ($brackets as $bracket) {
            if (!$bracket->containsSalary($salary)) {
                continue;
            }

            // Determine calculation base (Salary or MSC/Regular SS)
            $calculationBase = $salary;

            // If regular_ss (MSC) is defined in the bracket, use it as the base
            if ($bracket->regular_ss && (float) $bracket->regular_ss > 0) {
                $calculationBase = (float) $bracket->regular_ss;
            } elseif ($rule->maximum_salary && $calculationBase > (float) $rule->maximum_salary) {
                // Fallback to max salary cap if no MSC is defined
                $calculationBase = (float) $rule->maximum_salary;
            }

            // If fixed amount is set, use that
            if ($bracket->fixed_amount) {
                $employeeShare = (float) $bracket->fixed_amount;
            } else {
                $employeeShare = round($calculationBase * ((float) $bracket->employee_rate / 100), 2);
            }

            if ($bracket->fixed_employer_amount) {
                $employerShare = (float) $bracket->fixed_employer_amount;
            } elseif ($bracket->employer_rate) {
                $employerShare = round($calculationBase * ((float) $bracket->employer_rate / 100), 2);
            }

            break;
        }

        return [
            'employeeShare' => $employeeShare,
            'employerShare' => $employerShare,
            'total' => $employeeShare + $employerShare,
        ];
    }

    /**
     * Calculate deduction using custom formula.
     */
    private function calculateCustomFormula(StatutoryDeductionRule $rule, float $salary, array $variables): array
    {
        if (!$rule->formula) {
            throw new Exception("No formula defined for rule: {$rule->deduction_type}");
        }

        $formula = json_decode($rule->formula, true);

        if (!is_array($formula)) {
            throw new Exception("Invalid formula format for rule: {$rule->deduction_type}");
        }

        $employeeShare = 0.0;
        $employerShare = 0.0;

        // Evaluate employee share formula
        if (isset($formula['employee_formula'])) {
            try {
                $employeeShare = round(SafeMathEvaluator::evaluate($formula['employee_formula'], $variables), 2);
            } catch (Exception $e) {
                throw new Exception("Failed to evaluate employee formula: " . $e->getMessage());
            }
        }

        // Evaluate employer share formula if present
        if (isset($formula['employer_formula'])) {
            try {
                $employerShare = round(SafeMathEvaluator::evaluate($formula['employer_formula'], $variables), 2);
            } catch (Exception $e) {
                throw new Exception("Failed to evaluate employer formula: " . $e->getMessage());
            }
        }

        return [
            'employeeShare' => max(0, $employeeShare),
            'employerShare' => max(0, $employerShare),
            'total' => max(0, $employeeShare + $employerShare),
        ];
    }

    /**
     * Calculate all statutory deductions for an employee.
     */
    public function calculateAllDeductions(float $salary, array $context = []): array
    {
        $activeRules = StatutoryDeductionRule::active()->get();
        $results = [];

        foreach ($activeRules as $rule) {
            $type = $rule->deduction_type;
            try {
                // Use the rule object directly to avoid fetching it again
                // But calculateDeduction expects a type string and refetches.
                // For efficiency, we should refactor calculateDeduction to accept a rule object,
                // or just call the internal methods directly.
                // However, to keep it simple and consistent with existing public API:
                $results[$type] = $this->calculateDeduction($type, $salary, $context);
            } catch (Exception $e) {
                // Log but don't fail - return zero deduction
                $results[$type] = ['employeeShare' => 0.0, 'employerShare' => 0.0, 'total' => 0.0];
            }
        }

        // Ensure standard keys exist even if no rule is active (for frontend compatibility if needed)
        // But truly dynamic systems shouldn't enforce this.
        // Given the frontend expects 'SSS', 'PhilHealth', etc., we might want to ensure they are zero if missing.
        $standardTypes = ['SSS', 'PhilHealth', 'Pag-IBIG', 'Tax'];
        foreach ($standardTypes as $type) {
            if (!isset($results[$type])) {
                $results[$type] = ['employeeShare' => 0.0, 'employerShare' => 0.0, 'total' => 0.0];
            }
        }

        return $results;
    }

    /**
     * Get all active deduction rules.
     */
    public function getAllActiveRules()
    {
        return StatutoryDeductionRule::active()->with('brackets')->get();
    }

    /**
     * Create or update a deduction rule.
     */
    public function saveRule(array $data, ?int $ruleId = null): StatutoryDeductionRule
    {
        // Versioning Logic:
        // When updating a rule, we do NOT modify the existing record.
        // Instead, we mark the old record as inactive (preserving it for historical payrolls)
        // and create a new record with the updated values.
        
        $originalAttributes = [];
        $originalBrackets = [];
        
        if ($ruleId) {
            $oldRule = StatutoryDeductionRule::with('brackets')->findOrFail($ruleId);
            $originalAttributes = $oldRule->getAttributes();
            $originalBrackets = $oldRule->brackets->map(function ($bracket) {
                return $bracket->only([
                    'salary_from', 'salary_to', 'regular_ss', 'employee_rate', 'employer_rate', 
                    'fixed_amount', 'fixed_employer_amount', 'sort_order'
                ]);
            })->toArray();

            // Deactivate the old rule
            $oldRule->update(['is_active' => false]);
            
            // Log that it was superseded
            $oldRule->auditLogs()->create([
                'action' => 'superseded',
                'changes' => ['note' => 'Superseded by new version due to update'],
                'user_id' => optional(auth()->guard()->user())->id,
            ]);
        }

        // Always create a new rule instance
        $rule = new StatutoryDeductionRule();

        $rule->fill($data);
        // Ensure is_active is true for the new rule (unless explicitly set to false in data, which usually isn't for updates)
        if (!isset($data['is_active'])) {
            $rule->is_active = true;
        }
        $rule->save();

        $newBrackets = [];

        // Handle brackets if provided in data
        if (isset($data['brackets'])) {
            // Create new brackets
            foreach ($data['brackets'] as $index => $bracketData) {
                // Ensure sort_order is set
                $bracketData['sort_order'] = $bracketData['sort_order'] ?? $index;
                $rule->brackets()->create($bracketData);
                
                // Clean data for comparison/logging
                $newBrackets[] = array_intersect_key($bracketData, array_flip([
                    'salary_from', 'salary_to', 'regular_ss', 'employee_rate', 'employer_rate', 
                    'fixed_amount', 'fixed_employer_amount', 'sort_order'
                ]));
            }
        }

        // Calculate changes for the log
        $changes = [];
        
        // Rule attribute changes
        if ($ruleId) {
            // Compare new rule attributes with old rule attributes
            $newAttributes = $rule->getAttributes();
            $attributeChanges = [];
            
            foreach ($newAttributes as $key => $newValue) {
                // Skip timestamps and id
                if (in_array($key, ['created_at', 'updated_at', 'id'])) continue;
                
                $oldValue = $originalAttributes[$key] ?? null;
                if ($oldValue != $newValue) {
                     $attributeChanges[$key] = [
                        'old' => $oldValue,
                        'new' => $newValue
                    ];
                }
            }
            
            if (!empty($attributeChanges)) {
                $changes['attributes'] = $attributeChanges;
            }
        } else {
            $changes['attributes'] = $rule->getAttributes();
        }

        // Bracket changes
        if ($ruleId) {
             if (json_encode($originalBrackets) !== json_encode($newBrackets)) {
                $changes['brackets'] = [
                    'old' => $originalBrackets,
                    'new' => $newBrackets
                ];
            }
        } elseif (!empty($newBrackets)) {
             $changes['brackets'] = $newBrackets;
        }

        // Log the action on the NEW rule
        $rule->auditLogs()->create([
            'action' => $ruleId ? 'updated' : 'created', // We say 'updated' to indicate continuity of intent, even though it's a new ID
            'changes' => $changes,
            'user_id' => optional(auth()->guard()->user())->id,
        ]);

        return $rule;
    }

    /**
     * Delete a deduction rule.
     */
    public function deleteRule(int $ruleId): bool
    {
        $rule = StatutoryDeductionRule::with('brackets')->findOrFail($ruleId);

        StatutoryDeductionAuditLog::create([
            'rule_id' => $rule->id,
            'action' => 'deleted',
            'changes' => $rule->toArray(), // This will now include brackets
            'user_id' => optional(auth()->guard()->user())->id,
        ]);

        return (bool) $rule->delete();
    }
}

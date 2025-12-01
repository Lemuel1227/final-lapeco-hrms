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

        return match ($rule->rule_type) {
            'fixed_percentage' => $this->calculateFixedPercentage($rule, $salary, $variables),
            'salary_bracket' => $this->calculateSalaryBracket($rule, $salary, $variables),
            'custom_formula' => $this->calculateCustomFormula($rule, $salary, $variables),
            default => throw new Exception("Unknown rule type: {$rule->rule_type}"),
        };
    }

    /**
     * Calculate deduction using fixed percentage rule.
     */
    private function calculateFixedPercentage(StatutoryDeductionRule $rule, float $salary, array $variables): array
    {
        $percentage = (float) $rule->fixed_percentage;

        // Apply minimum salary threshold if set
        if ($rule->minimum_salary && $salary < (float) $rule->minimum_salary) {
            return ['employeeShare' => 0.0, 'employerShare' => 0.0, 'total' => 0.0];
        }

        // Apply maximum salary threshold if set
        $applicableSalary = $salary;
        if ($rule->maximum_salary && $salary > (float) $rule->maximum_salary) {
            $applicableSalary = (float) $rule->maximum_salary;
        }

        $employeeShare = round($applicableSalary * ($percentage / 100), 2);
        $employerShare = 0.0;

        return [
            'employeeShare' => $employeeShare,
            'employerShare' => $employerShare,
            'total' => $employeeShare,
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

            // If fixed amount is set, use that
            if ($bracket->fixed_amount) {
                $employeeShare = (float) $bracket->fixed_amount;
            } else {
                // Calculate based on rates
                $applicableSalary = $salary;
                if ($bracket->salary_to) {
                    $applicableSalary = min($salary, (float) $bracket->salary_to);
                }
                $employeeShare = round($applicableSalary * ((float) $bracket->employee_rate / 100), 2);
            }

            if ($bracket->employer_rate) {
                $employerShare = round($salary * ((float) $bracket->employer_rate / 100), 2);
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
        $deductionTypes = ['SSS', 'PhilHealth', 'Pag-IBIG', 'Tax'];
        $results = [];

        foreach ($deductionTypes as $type) {
            try {
                $results[$type] = $this->calculateDeduction($type, $salary, $context);
            } catch (Exception $e) {
                // Log but don't fail - return zero deduction
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
        $rule = $ruleId ? StatutoryDeductionRule::findOrFail($ruleId) : new StatutoryDeductionRule();

        $rule->fill($data);
        $rule->save();

        // Log the change
        $action = $ruleId ? 'updated' : 'created';
        $changes = $ruleId ? array_diff_assoc($data, $rule->getOriginal()) : $data;

        StatutoryDeductionAuditLog::create([
            'rule_id' => $rule->id,
            'action' => $action,
            'changes' => $changes,
            'user_id' => auth()->id(),
        ]);

        return $rule;
    }

    /**
     * Delete a deduction rule.
     */
    public function deleteRule(int $ruleId): bool
    {
        $rule = StatutoryDeductionRule::findOrFail($ruleId);

        StatutoryDeductionAuditLog::create([
            'rule_id' => $rule->id,
            'action' => 'deleted',
            'changes' => $rule->toArray(),
            'user_id' => auth()->id(),
        ]);

        return $rule->delete();
    }
}

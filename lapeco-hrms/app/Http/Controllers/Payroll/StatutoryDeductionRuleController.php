<?php

namespace App\Http\Controllers;

use App\Models\StatutoryDeductionRule;
use App\Models\StatutoryDeductionBracket;
use App\Models\PayrollStatutoryRequirement;
use App\Services\StatutoryDeductionService;
use App\Support\SafeMathEvaluator;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class StatutoryDeductionRuleController extends Controller
{
    private StatutoryDeductionService $service;

    public function __construct(StatutoryDeductionService $service)
    {
        $this->service = $service;
    }

    /**
     * Get all active deduction rules.
     */
    public function index()
    {
        $rules = $this->service->getAllActiveRules();

        return response()->json([
            'data' => $rules->map(fn ($rule) => $this->formatRuleResponse($rule)),
        ]);
    }

    /**
     * Get a specific deduction rule.
     */
    public function show($id)
    {
        $rule = StatutoryDeductionRule::with('brackets', 'auditLogs.user')->findOrFail($id);

        return response()->json([
            'data' => $this->formatRuleResponse($rule),
            'auditLogs' => $rule->auditLogs()->latest()->limit(10)->get(),
        ]);
    }

    /**
     * Create a new deduction rule.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'deduction_type' => 'required|string|in:SSS,PhilHealth,Pag-IBIG,Tax',
            'rule_name' => 'required|string|max:255',
            'rule_type' => 'required|in:fixed_percentage,salary_bracket,custom_formula',
            'fixed_percentage' => 'nullable|numeric|min:0|max:100',
            'employee_rate' => 'nullable|numeric|min:0|max:100',
            'employer_rate' => 'nullable|numeric|min:0|max:100',
            'minimum_salary' => 'nullable|numeric|min:0',
            'maximum_salary' => 'nullable|numeric|min:0',
            'is_default' => 'nullable|boolean',
            'description' => 'nullable|string',
            'formula' => 'nullable|json',
            'brackets' => 'nullable|array',
            'brackets.*.salary_from' => 'required_with:brackets|numeric|min:0',
            'brackets.*.salary_to' => 'nullable|numeric|min:0',
            'brackets.*.regular_ss' => 'nullable|numeric|min:0',
            'brackets.*.employee_rate' => 'nullable|numeric|min:0|max:100',
            'brackets.*.employer_rate' => 'nullable|numeric|min:0|max:100',
            'brackets.*.fixed_amount' => 'nullable|numeric|min:0',
            'brackets.*.fixed_employer_amount' => 'nullable|numeric|min:0',
            'brackets.*.sort_order' => 'nullable|integer',
        ]);

        // Validate formula if custom_formula type
        if ($validated['rule_type'] === 'custom_formula' && isset($validated['formula'])) {
            $this->validateFormula($validated['formula']);
        }

        // If setting as default, unset other defaults for the same deduction type
        if ($validated['is_default'] ?? false) {
            StatutoryDeductionRule::where('deduction_type', $validated['deduction_type'])
                ->where('is_default', true)
                ->update(['is_default' => false]);
        }

        // Save rule and brackets via service
        $rule = $this->service->saveRule($validated);

        return response()->json([
            'message' => 'Deduction rule created successfully',
            'data' => $this->formatRuleResponse($rule->load('brackets')),
        ], 201);
    }

    /**
     * Update a deduction rule.
     */
    public function update(Request $request, $id)
    {
        $rule = StatutoryDeductionRule::findOrFail($id);

        $validated = $request->validate([
            'deduction_type' => 'required|string|in:SSS,PhilHealth,Pag-IBIG,Tax',
            'rule_name' => 'required|string|max:255',
            'rule_type' => 'required|in:fixed_percentage,salary_bracket,custom_formula',
            'fixed_percentage' => 'nullable|numeric|min:0|max:100',
            'employee_rate' => 'nullable|numeric|min:0|max:100',
            'employer_rate' => 'nullable|numeric|min:0|max:100',
            'minimum_salary' => 'nullable|numeric|min:0',
            'maximum_salary' => 'nullable|numeric|min:0',
            'is_default' => 'nullable|boolean',
            'description' => 'nullable|string',
            'is_active' => 'nullable|boolean',
            'formula' => 'nullable|json',
            'brackets' => 'nullable|array',
            'brackets.*.salary_from' => 'required_with:brackets|numeric|min:0',
            'brackets.*.salary_to' => 'nullable|numeric|min:0',
            'brackets.*.regular_ss' => 'nullable|numeric|min:0',
            'brackets.*.employee_rate' => 'nullable|numeric|min:0|max:100',
            'brackets.*.employer_rate' => 'nullable|numeric|min:0|max:100',
            'brackets.*.fixed_amount' => 'nullable|numeric|min:0',
            'brackets.*.fixed_employer_amount' => 'nullable|numeric|min:0',
            'brackets.*.sort_order' => 'nullable|integer',
        ]);

        // Validate formula if custom_formula type
        if ($validated['rule_type'] === 'custom_formula' && isset($validated['formula'])) {
            $this->validateFormula($validated['formula']);
        }

        // If setting as default, unset other defaults for the same deduction type
        if ($validated['is_default'] ?? false) {
            StatutoryDeductionRule::where('deduction_type', $validated['deduction_type'])
                ->where('id', '!=', $id)
                ->where('is_default', true)
                ->update(['is_default' => false]);
        }

        // Save rule and brackets via service
        $rule = $this->service->saveRule($validated, $id);

        return response()->json([
            'message' => 'Deduction rule updated successfully',
            'data' => $this->formatRuleResponse($rule->load('brackets')),
        ]);
    }

    /**
     * Get history of changes for a specific rule.
     */
    public function getHistory($id)
    {
        $rule = StatutoryDeductionRule::findOrFail($id);
        
        $logs = $rule->auditLogs()
            ->with('user')
            ->latest()
            ->get()
            ->map(function ($log) {
                return [
                    'id' => $log->id,
                    'action' => $log->action,
                    'changes' => $log->changes,
                    'user' => $log->user ? ($log->user->first_name . ' ' . $log->user->last_name) : 'System',
                    'created_at' => $log->created_at,
                ];
            });

        return response()->json([
            'data' => $logs
        ]);
    }

    /**
     * Get payrolls that use this deduction rule.
     */
    public function getRelatedPayrolls($id)
    {
        // Check if rule exists
        $rule = StatutoryDeductionRule::findOrFail($id);

        // Find inactive rules of the same type (to include historical data from previous versions)
        $inactiveRuleIds = StatutoryDeductionRule::where('deduction_type', $rule->deduction_type)
            ->where('is_active', false)
            ->pluck('id');

        $payrolls = PayrollStatutoryRequirement::query()
            ->where('requirement_type', $rule->deduction_type)
            ->where(function($query) use ($id, $inactiveRuleIds) {
                $query->where('rule_id', $id)
                      ->orWhereIn('rule_id', $inactiveRuleIds)
                      ->orWhereNull('rule_id'); // Include legacy records without rule_id
            })
            ->with(['employeePayroll.period'])
            ->latest()
            ->get()
            ->groupBy(function ($item) {
                // Group by payroll period ID
                return $item->employeePayroll->period_id ?? 'unknown';
            })
            ->map(function ($items) {
                // Since we grouped by period, all items in $items belong to the same period
                $firstItem = $items->first();
                $period = $firstItem->employeePayroll->period ?? null;
                
                return [
                    'id' => $firstItem->id, // Use ID of first item as representative
                    'period_id' => $period->id ?? null,
                    'payroll_period' => $period ? ($period->period_start->format('M d, Y') . ' - ' . $period->period_end->format('M d, Y')) : 'Unknown Period',
                    'total_amount' => $items->sum('requirement_amount'), // Sum of all employee deductions
                    'total_employer_amount' => $items->sum('employer_amount'), // Sum of all employer shares
                    'employee_count' => $items->count(),
                    'created_at' => $firstItem->created_at,
                ];
            })
            ->values(); // Reset keys to array

        return response()->json([
            'data' => $payrolls
        ]);
    }

    /**
     * Delete a deduction rule.
     */
    public function destroy($id)
    {
        $this->service->deleteRule($id);

        return response()->json([
            'message' => 'Deduction rule deleted successfully',
        ]);
    }

    /**
     * Test a deduction rule with sample data.
     */
    public function testRule(Request $request, $id)
    {
        $rule = StatutoryDeductionRule::findOrFail($id);

        $validated = $request->validate([
            'salary' => 'required|numeric|min:0',
            'context' => 'nullable|array',
        ]);

        try {
            $result = $this->service->calculateDeduction(
                $rule->deduction_type,
                (float) $validated['salary'],
                $validated['context'] ?? []
            );

            return response()->json([
                'success' => true,
                'result' => $result,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Get documentation for formula syntax.
     */
    public function getFormulaDocumentation()
    {
        return response()->json([
            'allowed_variables' => SafeMathEvaluator::getAllowedVariables(),
            'allowed_functions' => SafeMathEvaluator::getAllowedFunctions(),
            'examples' => [
                'simple_percentage' => 'salary * 0.05',
                'with_function' => 'min(salary, 30000) * 0.045',
                'conditional_like' => 'salary >= 10000 ? salary * 0.05 : 0',
            ],
        ]);
    }

    /**
     * Validate formula syntax via API endpoint.
     */
    public function validateFormulaEndpoint(Request $request)
    {
        $validated = $request->validate([
            'formula' => 'required|string',
            'test_salary' => 'nullable|numeric|min:0',
        ]);

        try {
            $testSalary = $validated['test_salary'] ?? 50000;
            SafeMathEvaluator::evaluate($validated['formula'], ['salary' => $testSalary]);

            return response()->json([
                'valid' => true,
                'message' => 'Formula is valid',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'valid' => false,
                'error' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Format rule response.
     */
    private function formatRuleResponse(StatutoryDeductionRule $rule): array
    {
        return [
            'id' => $rule->id,
            'deduction_type' => $rule->deduction_type,
            'rule_name' => $rule->rule_name,
            'rule_type' => $rule->rule_type,
            'fixed_percentage' => $rule->fixed_percentage,
            'employee_rate' => $rule->employee_rate,
            'employer_rate' => $rule->employer_rate,
            'minimum_salary' => $rule->minimum_salary,
            'maximum_salary' => $rule->maximum_salary,
            'is_active' => $rule->is_active,
            'is_default' => $rule->is_default,
            'description' => $rule->description,
            'formula' => $rule->formula ? json_decode($rule->formula, true) : null,
            'brackets' => $rule->brackets->map(fn ($b) => [
                'id' => $b->id,
                'salary_from' => $b->salary_from,
                'salary_to' => $b->salary_to,
                'regular_ss' => $b->regular_ss,
                'employee_rate' => $b->employee_rate,
                'employer_rate' => $b->employer_rate,
                'fixed_amount' => $b->fixed_amount,
                'fixed_employer_amount' => $b->fixed_employer_amount,
                'sort_order' => $b->sort_order,
            ]),
            'created_at' => $rule->created_at,
            'updated_at' => $rule->updated_at,
        ];
    }

    /**
     * Validate formula.
     */
    private function validateFormula(?string $formulaJson): void
    {
        if (!$formulaJson) {
            return;
        }

        $formula = json_decode($formulaJson, true);

        if (!is_array($formula)) {
            throw ValidationException::withMessages([
                'formula' => 'Formula must be valid JSON',
            ]);
        }

        if (isset($formula['employee_formula'])) {
            try {
                SafeMathEvaluator::evaluate($formula['employee_formula'], ['salary' => 50000]);
            } catch (\Exception $e) {
                throw ValidationException::withMessages([
                    'formula' => 'Invalid employee formula: ' . $e->getMessage(),
                ]);
            }
        }

        if (isset($formula['employer_formula'])) {
            try {
                SafeMathEvaluator::evaluate($formula['employer_formula'], ['salary' => 50000]);
            } catch (\Exception $e) {
                throw ValidationException::withMessages([
                    'formula' => 'Invalid employer formula: ' . $e->getMessage(),
                ]);
            }
        }
    }

    /**
     * Get active rules summary for display in payroll pages
     */
    public function getActiveRulesSummary()
    {
        $rules = StatutoryDeductionRule::where('is_active', true)
            ->with('brackets')
            ->orderBy('deduction_type')
            ->get();

        $summary = $rules->map(function ($rule) {
            $description = $rule->description;
            
            // Build a human-readable summary based on rule type
            if ($rule->rule_type === 'fixed_percentage') {
                $description = "{$rule->fixed_percentage}% of salary";
            } elseif ($rule->rule_type === 'salary_bracket') {
                $bracketCount = $rule->brackets->count();
                $description = "{$bracketCount} salary bracket(s)";
            } elseif ($rule->rule_type === 'custom_formula') {
                $description = 'Custom formula';
            }

            return [
                'id' => $rule->id,
                'deduction_type' => $rule->deduction_type,
                'rule_name' => $rule->rule_name,
                'rule_type' => $rule->rule_type,
                'description' => $description,
                'is_active' => $rule->is_active,
                'is_default' => $rule->is_default,
                'minimum_salary' => $rule->minimum_salary,
                'maximum_salary' => $rule->maximum_salary,
                'fixed_percentage' => $rule->fixed_percentage,
                'employee_rate' => $rule->employee_rate,
                'employer_rate' => $rule->employer_rate,
                'formula' => $rule->formula ? json_decode($rule->formula, true) : null,
                'brackets' => $rule->brackets->map(fn ($b) => [
                    'id' => $b->id,
                    'salary_from' => $b->salary_from,
                    'salary_to' => $b->salary_to,
                    'regular_ss' => $b->regular_ss,
                    'employee_rate' => $b->employee_rate,
                    'employer_rate' => $b->employer_rate,
                    'fixed_amount' => $b->fixed_amount,
                    'fixed_employer_amount' => $b->fixed_employer_amount,
                    'sort_order' => $b->sort_order,
                ]),
                'brackets_count' => $rule->brackets->count(),
            ];
        });

        return response()->json([
            'data' => $summary,
        ]);
    }
}

<?php

namespace Database\Seeders;

use App\Models\StatutoryDeductionRule;
use App\Models\StatutoryDeductionBracket;
use Illuminate\Database\Seeder;

class StatutoryDeductionRulesSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // SSS Rule - Salary Bracket
        $sssRule = StatutoryDeductionRule::updateOrCreate(
            ['deduction_type' => 'SSS'],
            [
                'rule_name' => 'SSS Standard',
                'rule_type' => 'salary_bracket',
                'minimum_salary' => 5000,
                'maximum_salary' => 30000,
                'is_active' => true,
                'description' => 'SSS contribution based on salary brackets with 4.5% employee rate and 9.5% employer rate',
            ]
        );

        // SSS Brackets
        StatutoryDeductionBracket::where('rule_id', $sssRule->id)->delete();
        StatutoryDeductionBracket::create([
            'rule_id' => $sssRule->id,
            'salary_from' => 5000,
            'salary_to' => 30000,
            'employee_rate' => 4.5,
            'employer_rate' => 9.5,
            'sort_order' => 1,
        ]);

        // PhilHealth Rule - Fixed Percentage
        $philhealthRule = StatutoryDeductionRule::updateOrCreate(
            ['deduction_type' => 'PhilHealth'],
            [
                'rule_name' => 'PhilHealth Standard',
                'rule_type' => 'fixed_percentage',
                'fixed_percentage' => 5.0,
                'minimum_salary' => 10000,
                'maximum_salary' => 100000,
                'is_active' => true,
                'description' => 'PhilHealth contribution at 5% of salary (split 50/50 between employee and employer)',
            ]
        );

        // Pag-IBIG Rule - Fixed Amount
        $pagibigRule = StatutoryDeductionRule::updateOrCreate(
            ['deduction_type' => 'Pag-IBIG'],
            [
                'rule_name' => 'Pag-IBIG Standard',
                'rule_type' => 'salary_bracket',
                'minimum_salary' => 1500,
                'is_active' => true,
                'description' => 'Pag-IBIG contribution with fixed employee amount of 100 and employer amount of 200',
            ]
        );

        // Pag-IBIG Brackets
        StatutoryDeductionBracket::where('rule_id', $pagibigRule->id)->delete();
        StatutoryDeductionBracket::create([
            'rule_id' => $pagibigRule->id,
            'salary_from' => 1500,
            'salary_to' => null,
            'fixed_amount' => 100,
            'employee_rate' => 0,
            'employer_rate' => 0,
            'sort_order' => 1,
        ]);

        // Tax Rule - Custom Formula with Brackets
        $taxRule = StatutoryDeductionRule::updateOrCreate(
            ['deduction_type' => 'Tax'],
            [
                'rule_name' => 'Tax Standard',
                'rule_type' => 'salary_bracket',
                'is_active' => true,
                'description' => 'Withholding tax based on taxable income brackets',
            ]
        );

        // Tax Brackets (Philippine tax brackets for semi-monthly)
        StatutoryDeductionBracket::where('rule_id', $taxRule->id)->delete();
        
        // 0 - 10,416.67: 0%
        StatutoryDeductionBracket::create([
            'rule_id' => $taxRule->id,
            'salary_from' => 0,
            'salary_to' => 10416.67,
            'employee_rate' => 0,
            'sort_order' => 1,
        ]);

        // 10,416.68 - 16,666.67: 15% on excess
        StatutoryDeductionBracket::create([
            'rule_id' => $taxRule->id,
            'salary_from' => 10416.68,
            'salary_to' => 16666.67,
            'employee_rate' => 15,
            'sort_order' => 2,
        ]);

        // 16,666.68 - 33,332.50: 937.50 + 20% on excess
        StatutoryDeductionBracket::create([
            'rule_id' => $taxRule->id,
            'salary_from' => 16666.68,
            'salary_to' => 33332.50,
            'employee_rate' => 20,
            'fixed_amount' => 937.50,
            'sort_order' => 3,
        ]);

        // 33,332.51 - 83,332.50: 4,270.70 + 25% on excess
        StatutoryDeductionBracket::create([
            'rule_id' => $taxRule->id,
            'salary_from' => 33332.51,
            'salary_to' => 83332.50,
            'employee_rate' => 25,
            'fixed_amount' => 4270.70,
            'sort_order' => 4,
        ]);

        // 83,332.51 - 333,332.50: 16,770.70 + 30% on excess
        StatutoryDeductionBracket::create([
            'rule_id' => $taxRule->id,
            'salary_from' => 83332.51,
            'salary_to' => 333332.50,
            'employee_rate' => 30,
            'fixed_amount' => 16770.70,
            'sort_order' => 5,
        ]);

        // 333,332.51+: 91,770.70 + 35% on excess
        StatutoryDeductionBracket::create([
            'rule_id' => $taxRule->id,
            'salary_from' => 333332.51,
            'salary_to' => null,
            'employee_rate' => 35,
            'fixed_amount' => 91770.70,
            'sort_order' => 6,
        ]);
    }
}

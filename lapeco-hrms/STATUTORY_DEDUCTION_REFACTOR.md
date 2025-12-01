# Statutory Deduction System Refactor

## Overview

The payroll statutory deduction logic has been completely refactored from hard-coded calculations to a fully dynamic, database-driven system. Users can now configure deduction formulas and rules directly from the UI without modifying code.

## Architecture

### Database Schema

Three new tables manage the deduction rules:

1. **statutory_deduction_rules**
   - `id`: Primary key
   - `deduction_type`: Type of deduction (SSS, PhilHealth, Pag-IBIG, Tax)
   - `rule_type`: Type of rule (fixed_percentage, salary_bracket, custom_formula)
   - `formula`: JSON formula for custom rules
   - `fixed_percentage`: Percentage for fixed percentage rules
   - `minimum_salary`: Minimum salary threshold
   - `maximum_salary`: Maximum salary threshold
   - `is_active`: Whether the rule is active
   - `description`: Rule description

2. **statutory_deduction_brackets**
   - `id`: Primary key
   - `rule_id`: Foreign key to statutory_deduction_rules
   - `salary_from`: Lower salary bound
   - `salary_to`: Upper salary bound (nullable for open-ended)
   - `employee_rate`: Employee contribution rate (%)
   - `employer_rate`: Employer contribution rate (%)
   - `fixed_amount`: Fixed deduction amount
   - `sort_order`: Bracket ordering

3. **statutory_deduction_audit_logs**
   - `id`: Primary key
   - `rule_id`: Foreign key to statutory_deduction_rules
   - `action`: Action type (created, updated, deleted)
   - `changes`: JSON of what changed
   - `user_id`: User who made the change

### Models

- `StatutoryDeductionRule`: Main rule model with relationships
- `StatutoryDeductionBracket`: Bracket model for salary-based rules
- `StatutoryDeductionAuditLog`: Audit trail for rule changes

### Services

**StatutoryDeductionService** (`app/Services/StatutoryDeductionService.php`)

Core service handling all deduction calculations:

```php
// Calculate a single deduction
$result = $service->calculateDeduction('SSS', 50000);
// Returns: ['employeeShare' => float, 'employerShare' => float, 'total' => float]

// Calculate all deductions
$results = $service->calculateAllDeductions(50000);
// Returns: ['SSS' => [...], 'PhilHealth' => [...], 'Pag-IBIG' => [...], 'Tax' => [...]]

// Manage rules
$rule = $service->saveRule($data);
$service->deleteRule($ruleId);
$rules = $service->getAllActiveRules();
```

### Safe Formula Evaluator

**SafeMathEvaluator** (`app/Support/SafeMathEvaluator.php`)

Safely evaluates custom formulas with restricted syntax:

**Allowed Variables:**
- `salary`: The salary amount
- `gross`: Gross income
- `basic`: Basic salary
- `semi_gross`: Semi-monthly gross

**Allowed Functions:**
- `min()`, `max()`, `abs()`, `round()`, `floor()`, `ceil()`

**Allowed Operators:**
- `+`, `-`, `*`, `/`, `%`, `(`, `)`

**Examples:**
```
salary * 0.05                          // Simple percentage
min(salary, 30000) * 0.045            // With cap
max(0, salary - 10000) * 0.15         // Conditional-like
```

### Controllers

**StatutoryDeductionRuleController** (`app/Http/Controllers/StatutoryDeductionRuleController.php`)

REST API endpoints for managing rules:

- `GET /api/statutory-deduction-rules` - List all active rules
- `GET /api/statutory-deduction-rules/{id}` - Get specific rule
- `POST /api/statutory-deduction-rules` - Create new rule
- `PUT /api/statutory-deduction-rules/{id}` - Update rule
- `DELETE /api/statutory-deduction-rules/{id}` - Delete rule
- `POST /api/statutory-deduction-rules/{id}/test` - Test rule with sample data
- `GET /api/statutory-deduction-rules/formula/documentation` - Get formula syntax docs
- `POST /api/statutory-deduction-rules/formula/validate` - Validate formula syntax

### Rule Types

#### 1. Fixed Percentage
Simple percentage-based deduction:
- Configuration: `fixed_percentage` (0-100)
- Example: 5% of salary
- Use cases: PhilHealth, simple contributions

#### 2. Salary Bracket
Complex multi-bracket rules:
- Configuration: Multiple brackets with salary ranges and rates
- Example: Tax brackets, SSS with different rates per bracket
- Each bracket can have:
  - `salary_from` and `salary_to` (salary range)
  - `employee_rate` (% of salary)
  - `employer_rate` (% of salary)
  - `fixed_amount` (flat amount)

#### 3. Custom Formula
User-defined mathematical expressions:
- Configuration: JSON with formulas
- Example: `{"employee_formula": "min(salary, 30000) * 0.045"}`
- Supports both employee and employer formulas

## Migration & Setup

### 1. Run Migration
```bash
php artisan migrate
```

This creates the three new tables.

### 2. Seed Default Rules
```bash
php artisan db:seed --class=StatutoryDeductionRulesSeeder
```

This creates default rules for:
- SSS (salary bracket, 4.5% employee / 9.5% employer)
- PhilHealth (fixed 5%, split 50/50)
- Pag-IBIG (fixed 100 employee / 200 employer)
- Tax (6 brackets based on taxable income)

## Usage in Code

### In PayrollController

The `backfillStatutoryForPeriod` method now uses the service:

```php
$sssResult = $this->deductionService->calculateDeduction('SSS', $monthlySalary);
$sssEe = $sssResult['employeeShare'] / 2; // Semi-monthly
```

Falls back to legacy calculation if no rule is found.

### In ContributionController

Injected service for calculating contributions:

```php
public function __construct(StatutoryDeductionService $deductionService)
{
    $this->deductionService = $deductionService;
}
```

## UI Component

**StatutoryDeductionRulesManager.jsx** (`frontend/js/pages/Payroll/StatutoryDeductionRulesManager.jsx`)

React component for managing rules:

- List all active rules
- Create new rules
- Edit existing rules
- Delete rules
- Test rules with sample salary data
- View formula documentation
- Validate custom formulas

### Features:
- Real-time formula validation
- Test calculations before saving
- Audit trail of changes
- Role-based access control (payroll permissions)

## API Routes

All routes require authentication and payroll access:

```php
Route::middleware(['role.access:payroll,index'])->get('/statutory-deduction-rules', ...);
Route::middleware(['role.access:payroll,store'])->post('/statutory-deduction-rules', ...);
Route::middleware(['role.access:payroll,update'])->put('/statutory-deduction-rules/{id}', ...);
Route::middleware(['role.access:payroll,destroy'])->delete('/statutory-deduction-rules/{id}', ...);
```

## Examples

### Creating an SSS Rule (Salary Bracket)

```json
{
  "deduction_type": "SSS",
  "rule_type": "salary_bracket",
  "minimum_salary": 5000,
  "maximum_salary": 30000,
  "description": "SSS contribution",
  "brackets": [
    {
      "salary_from": 5000,
      "salary_to": 30000,
      "employee_rate": 4.5,
      "employer_rate": 9.5,
      "sort_order": 1
    }
  ]
}
```

### Creating a Tax Rule (Custom Formula)

```json
{
  "deduction_type": "Tax",
  "rule_type": "custom_formula",
  "description": "Withholding tax",
  "formula": {
    "employee_formula": "salary <= 10417 ? 0 : salary <= 16667 ? (salary - 10417) * 0.15 : 937.50 + (salary - 16667) * 0.20"
  }
}
```

### Testing a Rule

```bash
POST /api/statutory-deduction-rules/1/test
{
  "salary": 50000,
  "context": {}
}

Response:
{
  "success": true,
  "result": {
    "employeeShare": 2250,
    "employerShare": 4750,
    "total": 7000
  }
}
```

## Backward Compatibility

The system maintains backward compatibility:

1. **Legacy Fallback**: If no dynamic rule is found, the system falls back to hard-coded calculations
2. **Gradual Migration**: You can migrate rules one at a time
3. **Testing**: Test rules before applying them to payroll

## Security

### Formula Safety

- Only whitelisted variables and functions allowed
- No access to system functions or file operations
- Expressions validated before execution
- Comprehensive error handling

### Access Control

- All endpoints require authentication
- Role-based access control (payroll permissions)
- Audit logging of all rule changes
- User tracking for compliance

## Performance Considerations

- Rules cached in memory during payroll generation
- Bracket lookups optimized with indexed queries
- Formula evaluation cached where possible
- Minimal database queries per calculation

## Troubleshooting

### Rule Not Applied

1. Check if rule is marked as `is_active = true`
2. Verify salary meets `minimum_salary` threshold
3. Check audit logs for recent changes

### Formula Validation Error

1. Verify formula uses only allowed variables
2. Check for balanced parentheses
3. Test with sample salary using the test endpoint
4. Review formula documentation

### Calculation Mismatch

1. Verify rule type matches calculation method
2. Check bracket ranges don't overlap
3. Test with known salary value
4. Review audit logs for recent changes

## Future Enhancements

- Formula templates library
- Rule versioning and rollback
- Bulk rule import/export
- Advanced analytics on deduction patterns
- Integration with payroll reports
- Multi-currency support

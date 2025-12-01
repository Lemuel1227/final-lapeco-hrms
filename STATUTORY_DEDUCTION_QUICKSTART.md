# Statutory Deduction Rules - Quick Start Guide

## What Changed?

Payroll deduction calculations are no longer hard-coded. You can now configure them dynamically through the UI without touching code.

## Getting Started

### Step 1: Access the Rules Manager

Navigate to **Payroll > Statutory Deduction Rules** in the admin dashboard.

### Step 2: View Existing Rules

The left panel shows all active deduction rules:
- SSS
- PhilHealth
- Pag-IBIG
- Tax

Click any rule to view and edit its configuration.

### Step 3: Create a New Rule

Click **"Add New Rule"** button to create a new deduction rule.

## Rule Types

### 1. Fixed Percentage

**Use when:** Deduction is a simple percentage of salary.

**Example:** PhilHealth at 5% of salary

**Configuration:**
- Deduction Type: `PhilHealth`
- Rule Type: `Fixed Percentage`
- Fixed Percentage: `5`
- Minimum Salary: `10000` (optional)
- Maximum Salary: `100000` (optional)

### 2. Salary Bracket

**Use when:** Different rates apply to different salary ranges.

**Example:** Tax with different rates for different income levels

**Configuration:**
1. Select Rule Type: `Salary Bracket`
2. Add brackets with:
   - **From**: Lower salary bound
   - **To**: Upper salary bound (leave empty for no upper limit)
   - **Employee Rate**: Percentage for employee
   - **Employer Rate**: Percentage for employer
   - **Fixed Amount**: Flat amount (optional, overrides rate)

**Example Tax Brackets:**
| From | To | Employee Rate | Fixed Amount |
|------|-------|---------------|--------------|
| 0 | 10,416.67 | 0% | - |
| 10,416.68 | 16,666.67 | 15% | - |
| 16,666.68 | 33,332.50 | 20% | 937.50 |

### 3. Custom Formula

**Use when:** Complex calculations that don't fit standard brackets.

**Example:** `min(salary, 30000) * 0.045`

**Configuration:**
1. Select Rule Type: `Custom Formula`
2. Enter formula as JSON:
```json
{
  "employee_formula": "min(salary, 30000) * 0.045",
  "employer_formula": "min(salary, 30000) * 0.095"
}
```

**Available Variables:**
- `salary` - The salary amount
- `gross` - Gross income
- `basic` - Basic salary
- `semi_gross` - Semi-monthly gross

**Available Functions:**
- `min()` - Minimum value
- `max()` - Maximum value
- `abs()` - Absolute value
- `round()` - Round to nearest integer
- `floor()` - Round down
- `ceil()` - Round up

**Examples:**
```
salary * 0.05                          // Simple: 5% of salary
min(salary, 30000) * 0.045            // With cap: 4.5% up to 30k
max(0, salary - 10000) * 0.15         // Conditional: 15% above 10k
round(salary * 0.0525, 2)             // With rounding
```

## Testing Your Rule

Before saving, test your rule:

1. Enter a test salary amount
2. Click **"Test"** button
3. View the calculated result:
   - Employee Share
   - Employer Share
   - Total

**Example Test:**
- Test Salary: 50,000
- Expected Result for SSS (4.5%): 2,250 employee share

## Common Tasks

### Update SSS Rate

1. Click **SSS** rule
2. Change the employee/employer rates in the bracket
3. Click **"Test"** with a sample salary
4. Click **"Save Rule"**

### Add a New Deduction Type

1. Click **"Add New Rule"**
2. Enter Deduction Type: `MyDeduction`
3. Select Rule Type: `Fixed Percentage`
4. Enter Fixed Percentage: `2.5`
5. Click **"Save Rule"**

### Modify Tax Brackets

1. Click **Tax** rule
2. Edit existing brackets or add new ones
3. Test with various salary amounts
4. Save when satisfied

### Disable a Rule

1. Click the rule
2. Uncheck **"Is Active"**
3. Save

The rule won't be applied to new payroll calculations.

## Formula Validation

When using custom formulas:

1. Click **"Validate Formula"** to check syntax
2. System will test with sample salary (50,000)
3. Fix any errors shown
4. Save when validation passes

## Audit Trail

All rule changes are logged:

1. Click a rule
2. Scroll to **"Audit Logs"** section
3. View who changed what and when

## Troubleshooting

### Rule Not Applied

**Problem:** Deduction not appearing in payroll

**Solutions:**
1. Check if rule is marked as **Active**
2. Verify salary meets **Minimum Salary** threshold
3. Check if salary exceeds **Maximum Salary** limit
4. Review audit logs for recent changes

### Formula Error

**Problem:** "Invalid formula" error when saving

**Solutions:**
1. Check formula uses only allowed variables
2. Verify parentheses are balanced
3. Use **"Validate Formula"** to test
4. Review formula examples above

### Calculation Mismatch

**Problem:** Deduction amount doesn't match expected

**Solutions:**
1. Use **"Test"** feature with same salary
2. Verify bracket ranges don't overlap
3. Check if fixed amount is overriding rate
4. Review rule configuration carefully

## Best Practices

1. **Test Before Saving**
   - Always test with realistic salary amounts
   - Verify results match expectations

2. **Document Changes**
   - Use Description field to explain rule
   - Include effective date if applicable

3. **Gradual Updates**
   - Update one rule at a time
   - Test payroll after each change

4. **Review Audit Logs**
   - Check who made changes and when
   - Verify changes are correct

5. **Backup Before Major Changes**
   - Export rule configuration
   - Keep copy of previous settings

## Support

For issues or questions:
1. Check the **Troubleshooting** section above
2. Review **Formula Examples** for custom formulas
3. Contact HR/Payroll Administrator
4. Check system audit logs for recent changes

## Formula Quick Reference

| Task | Formula |
|------|---------|
| Simple percentage | `salary * 0.05` |
| With salary cap | `min(salary, 30000) * 0.045` |
| Conditional rate | `salary >= 10000 ? salary * 0.05 : 0` |
| Bracket calculation | `salary <= 10000 ? 0 : (salary - 10000) * 0.15` |
| Rounded result | `round(salary * 0.0525, 2)` |
| Maximum amount | `min(salary * 0.10, 5000)` |

## Key Points

- Rules are applied to **all future payroll** calculations
- Existing payroll records are **not affected**
- Changes take effect **immediately** for new payroll
- All changes are **audited and logged**
- System **falls back** to legacy calculations if needed
- **Test before deploying** to production payroll

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EmployeePayroll extends Model
{
    use HasFactory;

    protected $fillable = [
        'period_id',
        'employee_id',
        'paid_status',
        'pay_date',
        'gross_earning',
        'total_deductions',
        'absences_summary',
        'leave_balances_summary',
        'leave_earnings_summary',
    ];

    protected $casts = [
        'pay_date' => 'date',
        'gross_earning' => 'decimal:2',
        'total_deductions' => 'decimal:2',
        'absences_summary' => 'array',
        'leave_balances_summary' => 'array',
        'leave_earnings_summary' => 'array',
    ];

    public function period()
    {
        return $this->belongsTo(PayrollPeriod::class, 'period_id');
    }

    public function employee()
    {
        return $this->belongsTo(User::class, 'employee_id');
    }

    public function deductions()
    {
        return $this->hasMany(PayrollDeduction::class, 'employees_payroll_id');
    }

    public function earnings()
    {
        return $this->hasMany(PayrollEarning::class, 'employees_payroll_id');
    }

    public function statutoryRequirements()
    {
        return $this->hasMany(PayrollStatutoryRequirement::class, 'employees_payroll_id');
    }
}

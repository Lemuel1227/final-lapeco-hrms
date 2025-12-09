<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\HasEncryptedAttributes;

class PayrollStatutoryRequirement extends Model
{
    use HasFactory, HasEncryptedAttributes;

    /**
     * The attributes that should be encrypted using AES-256
     *
     * @var array
     */
    protected $encrypted = [
        'requirement_amount',
        'employer_amount',
    ];

    protected $fillable = [
        'employees_payroll_id',
        'requirement_type',
        'requirement_amount',
        'employer_amount',
        'rule_name',
        'rule_id',
    ];

    protected $casts = [
        // Note: requirement_amount is encrypted, so no decimal cast
    ];

    public function employeePayroll()
    {
        return $this->belongsTo(EmployeePayroll::class, 'employees_payroll_id');
    }

    public function rule()
    {
        return $this->belongsTo(StatutoryDeductionRule::class, 'rule_id');
    }
}

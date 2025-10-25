<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\HasEncryptedAttributes;

class PayrollDeduction extends Model
{
    use HasFactory, HasEncryptedAttributes;

    /**
     * The attributes that should be encrypted using AES-256
     *
     * @var array
     */
    protected $encrypted = [
        'deduction_pay',
    ];

    protected $fillable = [
        'employees_payroll_id',
        'deduction_type',
        'deduction_pay',
    ];

    protected $casts = [
        // Note: deduction_pay is encrypted, so no decimal cast
    ];

    public function employeePayroll()
    {
        return $this->belongsTo(EmployeePayroll::class, 'employees_payroll_id');
    }
}

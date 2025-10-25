<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\HasEncryptedAttributes;

class PayrollEarning extends Model
{
    use HasFactory, HasEncryptedAttributes;

    /**
     * The attributes that should be encrypted using AES-256
     *
     * @var array
     */
    protected $encrypted = [
        'earning_pay',
    ];

    protected $fillable = [
        'employees_payroll_id',
        'earning_type',
        'earning_hours',
        'earning_pay',
    ];

    protected $casts = [
        'earning_hours' => 'decimal:2',
        // Note: earning_pay is encrypted, so no decimal cast
    ];

    public function employeePayroll()
    {
        return $this->belongsTo(EmployeePayroll::class, 'employees_payroll_id');
    }
}

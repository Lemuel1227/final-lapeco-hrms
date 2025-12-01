<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StatutoryDeductionBracket extends Model
{
    use HasFactory;

    protected $fillable = [
        'rule_id',
        'salary_from',
        'salary_to',
        'employee_rate',
        'employer_rate',
        'fixed_amount',
        'sort_order',
    ];

    protected $casts = [
        'salary_from' => 'decimal:2',
        'salary_to' => 'decimal:2',
        'employee_rate' => 'decimal:2',
        'employer_rate' => 'decimal:2',
        'fixed_amount' => 'decimal:2',
    ];

    public function rule(): BelongsTo
    {
        return $this->belongsTo(StatutoryDeductionRule::class, 'rule_id');
    }

    /**
     * Check if a salary falls within this bracket.
     */
    public function containsSalary(float $salary): bool
    {
        $fromMatch = $salary >= (float) $this->salary_from;
        $toMatch = is_null($this->salary_to) || $salary <= (float) $this->salary_to;
        return $fromMatch && $toMatch;
    }
}

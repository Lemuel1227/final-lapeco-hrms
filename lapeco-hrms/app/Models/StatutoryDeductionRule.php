<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class StatutoryDeductionRule extends Model
{
    use HasFactory;

    protected $fillable = [
        'deduction_type',
        'rule_name',
        'rule_type',
        'formula',
        'fixed_percentage',
        'minimum_salary',
        'maximum_salary',
        'is_active',
        'is_default',
        'description',
    ];

    protected $casts = [
        'fixed_percentage' => 'decimal:2',
        'minimum_salary' => 'decimal:2',
        'maximum_salary' => 'decimal:2',
        'is_active' => 'boolean',
        'is_default' => 'boolean',
    ];

    public function brackets(): HasMany
    {
        return $this->hasMany(StatutoryDeductionBracket::class, 'rule_id');
    }

    public function auditLogs(): HasMany
    {
        return $this->hasMany(StatutoryDeductionAuditLog::class, 'rule_id');
    }

    /**
     * Scope to get only active rules.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Get rule by deduction type.
     * Prioritizes default rule if multiple rules exist for the same type.
     */
    public static function getByType(string $type): ?self
    {
        // First try to get the default rule for this type
        $defaultRule = self::where('deduction_type', $type)
            ->where('is_default', true)
            ->active()
            ->first();

        if ($defaultRule) {
            return $defaultRule;
        }

        // Fallback to first active rule if no default is set
        return self::where('deduction_type', $type)->active()->first();
    }
}

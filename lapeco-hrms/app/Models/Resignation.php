<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Resignation extends Model
{
    protected $fillable = [
        'employee_id',
        'reason',
        'submission_date',
        'effective_date',
        'status',
        'notes',
        'approved_by',
        'approved_at'
    ];

    protected $casts = [
        'submission_date' => 'date',
        'effective_date' => 'date',
        'approved_at' => 'datetime'
    ];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'employee_id');
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    protected $appends = [
        'employee_full_name',
    ];

    public function getEmployeeFullNameAttribute(): string
    {
        $employee = $this->relationLoaded('employee') ? $this->employee : $this->employee()->select(['id', 'first_name', 'middle_name', 'last_name'])->first();

        if (!$employee) {
            return 'Unknown Employee';
        }

        return trim(collect([
            $employee->first_name,
            $employee->middle_name,
            $employee->last_name,
        ])->filter()->implode(' '));
    }
}

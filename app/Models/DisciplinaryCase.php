<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DisciplinaryCase extends Model
{
    protected $fillable = [
        'employee_id',
        'case_number',
        'violation_type',
        'description',
        'incident_date',
        'reported_date',
        'reported_by',
        'severity',
        'status',
        'investigation_notes',
        'action_taken',
        'resolution_date',
        'resolution_notes'
    ];

    protected $casts = [
        'incident_date' => 'date',
        'reported_date' => 'date',
        'resolution_date' => 'date'
    ];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'employee_id');
    }

    public function generateCaseNumber(): string
    {
        $year = date('Y');
        $lastCase = self::whereYear('created_at', $year)
            ->orderBy('id', 'desc')
            ->first();
        
        $nextNumber = $lastCase ? (int)substr($lastCase->case_number, -4) + 1 : 1;
        
        return 'DC-' . $year . '-' . str_pad($nextNumber, 4, '0', STR_PAD_LEFT);
    }
}

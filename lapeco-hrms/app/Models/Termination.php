<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Termination extends Model
{
    protected $fillable = [
        'employee_id',
        'type',
        'reason',
        'termination_date',
        'last_working_day',
        'notes',
        'terminated_by'
    ];

    protected $casts = [
        'termination_date' => 'date',
        'last_working_day' => 'date'
    ];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'employee_id');
    }

    public function terminatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'terminated_by');
    }
}

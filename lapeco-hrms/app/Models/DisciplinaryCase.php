<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DisciplinaryCase extends Model
{
    protected $fillable = [
        'id', // case identifier in frontend
        'employee_id', // Employee to be disciplined in frontend
        'action_type', // action_type in frontend
        'description', // description of incident in frontend
        'incident_date', // date of incident in frontend
        'reason', // Reason / Infraction in frontend
        'status', // case_status in frontend
        'approval_status', // pending or approved
        'reported_by', // user id who reported/created the case
        'resolution_taken', // Resolution / Next Steps in frontend
        'attachment', // PDF attachment only
        'charge_fee',
        'is_deducted',
        'payroll_period_id'
    ];

    protected $casts = [
        'incident_date' => 'date',
    ];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'employee_id');
    }

    public function reportedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reported_by');
    }

    /**
     * Get the action logs for the disciplinary case.
     */
    public function actionLogs(): HasMany
    {
        return $this->hasMany(ActionLog::class);
    }
}

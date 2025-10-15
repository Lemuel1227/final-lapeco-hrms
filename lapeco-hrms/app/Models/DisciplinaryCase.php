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
        'resolution_taken', // Resolution / Next Steps in frontend
        'attachment' // PDF attachment only
    ];

    protected $casts = [
        'incident_date' => 'date',
    ];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'employee_id');
    }

    /**
     * Get the action logs for the disciplinary case.
     */
    public function actionLogs(): HasMany
    {
        return $this->hasMany(ActionLog::class);
    }
}

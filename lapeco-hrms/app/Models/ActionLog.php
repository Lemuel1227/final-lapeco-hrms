<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ActionLog extends Model
{
    protected $fillable = [
        'disciplinary_case_id',
        'date_created',
        'description',
    ];

    protected $casts = [
        'date_created' => 'datetime',
    ];

    /**
     * Get the disciplinary case that owns the action log.
     */
    public function disciplinaryCase(): BelongsTo
    {
        return $this->belongsTo(DisciplinaryCase::class);
    }
}

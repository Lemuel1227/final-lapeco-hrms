<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserActivityLog extends Model
{
    protected $fillable = [
        'user_id',
        'action_type',
        'entity_type',
        'entity_id',
        'description',
        'ip_address',
        'user_agent',
        'metadata',
    ];

    protected $casts = [
        'metadata' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the user that performed the action.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Create a log entry for user activity.
     */
    public static function log(
        int $userId,
        string $actionType,
        string $description,
        ?string $entityType = null,
        ?int $entityId = null,
        ?array $metadata = null,
        ?string $ipAddress = null,
        ?string $userAgent = null
    ): self {
        return self::create([
            'user_id' => $userId,
            'action_type' => $actionType,
            'entity_type' => $entityType,
            'entity_id' => $entityId,
            'description' => $description,
            'ip_address' => $ipAddress ?? request()->ip(),
            'user_agent' => $userAgent ?? request()->userAgent(),
            'metadata' => $metadata,
        ]);
    }
}

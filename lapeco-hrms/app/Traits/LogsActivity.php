<?php

namespace App\Traits;

use App\Models\UserActivityLog;
use Illuminate\Support\Facades\Auth;

trait LogsActivity
{
    /**
     * Log an activity for the authenticated user
     */
    protected function logActivity(
        string $actionType,
        string $description,
        ?string $entityType = null,
        ?int $entityId = null,
        ?array $metadata = null
    ): void {
        if (!Auth::check()) {
            return;
        }

        UserActivityLog::log(
            userId: Auth::id(),
            actionType: $actionType,
            description: $description,
            entityType: $entityType,
            entityId: $entityId,
            metadata: $metadata
        );
    }

    /**
     * Log a create activity
     */
    protected function logCreate(string $entityType, int $entityId, string $entityName = null): void
    {
        $description = $entityName 
            ? "Created {$entityType}: {$entityName}"
            : "Created {$entityType} #{$entityId}";
            
        $this->logActivity('create', $description, $entityType, $entityId);
    }

    /**
     * Log an update activity
     */
    protected function logUpdate(string $entityType, int $entityId, string $entityName = null, ?array $changes = null): void
    {
        $description = $entityName
            ? "Updated {$entityType}: {$entityName}"
            : "Updated {$entityType} #{$entityId}";
            
        $this->logActivity('update', $description, $entityType, $entityId, $changes ? ['changes' => $changes] : null);
    }

    /**
     * Log a delete activity
     */
    protected function logDelete(string $entityType, int $entityId, string $entityName = null): void
    {
        $description = $entityName
            ? "Deleted {$entityType}: {$entityName}"
            : "Deleted {$entityType} #{$entityId}";
            
        $this->logActivity('delete', $description, $entityType, $entityId);
    }

    /**
     * Log a view activity
     */
    protected function logView(string $entityType, int $entityId, string $entityName = null): void
    {
        $description = $entityName
            ? "Viewed {$entityType}: {$entityName}"
            : "Viewed {$entityType} #{$entityId}";
            
        $this->logActivity('view', $description, $entityType, $entityId);
    }

    /**
     * Log an export activity
     */
    protected function logExport(string $exportType, ?array $metadata = null): void
    {
        $description = "Exported {$exportType} data";
        $this->logActivity('export', $description, $exportType, null, $metadata);
    }

    /**
     * Log a custom activity
     */
    protected function logCustomActivity(string $actionType, string $description, ?string $entityType = null, ?int $entityId = null, ?array $metadata = null): void
    {
        $this->logActivity($actionType, $description, $entityType, $entityId, $metadata);
    }
}

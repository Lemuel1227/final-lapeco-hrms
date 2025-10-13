<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LeaveCredit extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'leave_type',
        'total_credits',
        'used_credits',
        'year',
        'last_reset_at',
    ];

    protected $casts = [
        'last_reset_at' => 'datetime',
        'year' => 'integer',
        'total_credits' => 'integer',
        'used_credits' => 'integer',
    ];

    /**
     * Get the user that owns the leave credit.
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get remaining credits for this leave type.
     */
    public function getRemainingCreditsAttribute()
    {
        // If total_credits is 0, it means unlimited
        if ($this->total_credits === 0) {
            return 'Unlimited';
        }
        
        return max(0, $this->total_credits - $this->used_credits);
    }

    /**
     * Check if user has enough credits for a leave request.
     */
    public function hasEnoughCredits($requestedDays)
    {
        // If total_credits is 0, it means unlimited
        if ($this->total_credits === 0) {
            return true;
        }
        
        return ($this->used_credits + $requestedDays) <= $this->total_credits;
    }

    /**
     * Use credits for an approved leave.
     */
    public function useCredits($days)
    {
        $this->increment('used_credits', $days);
    }

    /**
     * Return credits when a leave is cancelled or declined.
     */
    public function returnCredits($days)
    {
        $this->decrement('used_credits', $days);
        
        // Ensure used_credits doesn't go below 0
        if ($this->used_credits < 0) {
            $this->update(['used_credits' => 0]);
        }
    }

    /**
     * Reset used credits to 0.
     */
    public function resetCredits()
    {
        $this->update([
            'used_credits' => 0,
            'last_reset_at' => now(),
        ]);
    }

    /**
     * Get or create leave credit for a user and leave type.
     */
    public static function getOrCreateForUser($userId, $leaveType, $year = null)
    {
        $year = $year ?? date('Y');
        
        return static::firstOrCreate([
            'user_id' => $userId,
            'leave_type' => $leaveType,
            'year' => $year,
        ], [
            'total_credits' => 0, // Default to unlimited
            'used_credits' => 0,
        ]);
    }

    /**
     * Scope to get credits for current year.
     */
    public function scopeCurrentYear($query)
    {
        return $query->where('year', date('Y'));
    }

    /**
     * Scope to get credits for a specific user.
     */
    public function scopeForUser($query, $userId)
    {
        return $query->where('user_id', $userId);
    }
}

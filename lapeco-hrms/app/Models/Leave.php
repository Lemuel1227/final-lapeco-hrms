<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Leave extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id', 'type', 'date_from', 'date_to', 'days', 'status', 'reason',
        'document_name', 'document_path', 'maternity_details', 'paternity_details',
    ];

    protected $casts = [
        'date_from' => 'date',
        'date_to' => 'date',
        'days' => 'integer',
        'maternity_details' => 'array',
        'paternity_details' => 'array',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Boot method to handle leave credit updates when status changes.
     */
    protected static function boot()
    {
        parent::boot();

        // When a leave is updated (status change)
        static::updated(function ($leave) {
            $leave->handleCreditUpdate();
        });

        // When a leave is created and immediately approved
        static::created(function ($leave) {
            if ($leave->status === 'Approved') {
                $leave->handleCreditUpdate();
            }
        });

        // When a leave is deleted
        static::deleted(function ($leave) {
            if ($leave->status === 'Approved') {
                $leave->returnCredits();
            }
        });
    }

    /**
     * Handle credit updates when leave status changes.
     */
    protected function handleCreditUpdate()
    {
        $originalStatus = $this->getOriginal('status');
        $currentStatus = $this->status;

        // If leave was just approved, use credits
        if ($originalStatus !== 'Approved' && $currentStatus === 'Approved') {
            $this->useCredits();
        }
        
        // If leave was approved but now declined/cancelled, return credits
        if ($originalStatus === 'Approved' && in_array($currentStatus, ['Declined', 'Canceled'])) {
            $this->returnCredits();
        }
    }

    /**
     * Use credits when leave is approved.
     */
    protected function useCredits()
    {
        // Skip credit tracking for certain leave types
        if (in_array($this->type, ['Unpaid Leave', 'Paternity Leave'])) {
            return;
        }

        $creditType = $this->type === 'Emergency Leave' ? 'Vacation Leave' : $this->type;
        $leaveCredit = LeaveCredit::getOrCreateForUser(
            $this->user_id,
            $creditType,
            date('Y', strtotime($this->date_from))
        );

        $leaveCredit->useCredits($this->days);
    }

    /**
     * Return credits when leave is declined or cancelled.
     */
    protected function returnCredits()
    {
        // Skip credit tracking for certain leave types
        if (in_array($this->type, ['Unpaid Leave', 'Paternity Leave'])) {
            return;
        }

        $creditType = $this->type === 'Emergency Leave' ? 'Vacation Leave' : $this->type;
        $leaveCredit = LeaveCredit::getOrCreateForUser(
            $this->user_id,
            $creditType,
            date('Y', strtotime($this->date_from))
        );

        $leaveCredit->returnCredits($this->days);
    }

    /**
     * Check if user has enough credits for this leave request.
     */
    public function hasEnoughCredits()
    {
        // Skip credit checking for certain leave types
        if (in_array($this->type, ['Unpaid Leave', 'Paternity Leave'])) {
            return true;
        }

        $creditType = $this->type === 'Emergency Leave' ? 'Vacation Leave' : $this->type;
        $leaveCredit = LeaveCredit::getOrCreateForUser(
            $this->user_id,
            $creditType,
            date('Y', strtotime($this->date_from))
        );

        return $leaveCredit->hasEnoughCredits($this->days);
    }

    /**
     * Scope to get approved leaves.
     */
    public function scopeApproved($query)
    {
        return $query->where('status', 'Approved');
    }

    /**
     * Scope to get leaves for current year.
     */
    public function scopeCurrentYear($query)
    {
        return $query->whereYear('date_from', date('Y'));
    }
}



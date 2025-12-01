<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LeaveCashConversion extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'year',
        'vacation_days',
        'sick_days',
        'conversion_rate',
        'total_amount',
        'status',
        'details',
        'processed_by',
        'processed_at',
        'paid_by',
        'paid_at',
    ];

    protected $casts = [
        'details' => 'array',
        'processed_at' => 'datetime',
        'paid_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function processedBy()
    {
        return $this->belongsTo(User::class, 'processed_by');
    }

    public function paidBy()
    {
        return $this->belongsTo(User::class, 'paid_by');
    }

    public function scopeForYear($query, int $year)
    {
        return $query->where('year', $year);
    }
}

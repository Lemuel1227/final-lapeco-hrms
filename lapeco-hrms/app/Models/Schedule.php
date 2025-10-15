<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Schedule extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'date',
        'description',
    ];

    protected $casts = [
        'date' => 'date',
    ];

    public function assignments()
    {
        return $this->hasMany(ScheduleAssignment::class);
    }

    public function users()
    {
        return $this->belongsToMany(User::class, 'schedule_assignments')
                    ->withPivot(['start_time', 'end_time', 'notes'])
                    ->withTimestamps();
    }
}
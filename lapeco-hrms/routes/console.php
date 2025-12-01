<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Schedule::command('attendance:check-rates')
    ->dailyAt('23:30')
    ->withoutOverlapping()
    ->runInBackground();

// Holiday notifications - check for holidays 3 days ahead every morning at 8:00 AM
Schedule::command('holidays:notify-upcoming --days=3')
    ->dailyAt('01:00')
    ->withoutOverlapping()
    ->runInBackground();

// Deactivate resigned employees at the start of the day
Schedule::command('resignations:deactivate')
    ->dailyAt('00:05')
    ->withoutOverlapping()
    ->runInBackground();

// Update training enrollments progress daily based on Required Days and enrollment date
Schedule::command('training:update-progress')
    ->dailyAt('00:10')
    ->withoutOverlapping()
    ->runInBackground();

// Auto-decline pending leave requests after configured days
Schedule::command('leave:auto-decline-pending')
    ->everyMinute()
    ->withoutOverlapping()
    ->runInBackground();


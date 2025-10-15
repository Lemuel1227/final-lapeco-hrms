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
    ->dailyAt('08:00')
    ->withoutOverlapping()
    ->runInBackground();

// Holiday notifications - check for holidays tomorrow every morning at 8:30 AM
Schedule::command('holidays:notify-upcoming --days=1')
    ->dailyAt('08:30')
    ->withoutOverlapping()
    ->runInBackground();

// Holiday notifications - check for holidays today at 9:00 AM
Schedule::command('holidays:notify-upcoming --days=0')
    ->dailyAt('09:00')
    ->withoutOverlapping()
    ->runInBackground();


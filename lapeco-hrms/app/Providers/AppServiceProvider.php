<?php

namespace App\Providers;

use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Gate;
use App\Models\User;
use App\Models\Leave;
use App\Models\Schedule;
use App\Models\Attendance;
use App\Policies\EmployeePolicy;
use App\Policies\LeavePolicy;
use App\Policies\SchedulePolicy;
use App\Policies\AttendancePolicy;

class AppServiceProvider extends ServiceProvider
{
    /**
     * The policy mappings for the application.
     *
     * @var array<class-string, class-string>
     */
    protected $policies = [
        User::class => EmployeePolicy::class,
        Leave::class => LeavePolicy::class,
        Schedule::class => SchedulePolicy::class,
        Attendance::class => AttendancePolicy::class,
    ];

    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Vite::prefetch(concurrency: 3);
        
        // Register policies
        foreach ($this->policies as $model => $policy) {
            Gate::policy($model, $policy);
        }
    }
}

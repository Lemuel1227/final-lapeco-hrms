<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Holiday;
use App\Models\User;
use App\Models\Notification;
use Carbon\Carbon;
use App\Traits\LogsActivity;

class HolidayController extends Controller
{
    use LogsActivity;
    public function index(Request $request)
    {
        $holidays = Holiday::orderBy('date')->get();
        if ($request->boolean('groupByMonth')) {
            $grouped = $holidays->groupBy(function ($h) {
                return date('Y-m', strtotime($h->date));
            });
            return response()->json($grouped);
        }
        return response()->json($holidays);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'title' => 'required|string|max:255',
            'date' => 'required|date',
            'type' => 'nullable|in:REGULAR,SPECIAL',
            'is_recurring' => 'boolean',
            'description' => 'nullable|string',
        ]);
        $holiday = Holiday::create($data);
        
        // Log activity
        $this->logCreate('holiday', $holiday->id, $holiday->title);
        
        return response()->json($holiday, 201);
    }

    public function update(Request $request, Holiday $holiday)
    {
        $data = $request->validate([
            'title' => 'sometimes|string|max:255',
            'date' => 'sometimes|date',
            'type' => 'sometimes|in:REGULAR,SPECIAL',
            'is_recurring' => 'sometimes|boolean',
            'description' => 'sometimes|nullable|string',
        ]);
        $holiday->update($data);
        
        // Log activity
        $this->logUpdate('holiday', $holiday->id, $holiday->title);
        
        return response()->json($holiday);
    }

    public function destroy(Holiday $holiday)
    {
        $holidayTitle = $holiday->title;
        $holidayId = $holiday->id;
        $holiday->delete();
        
        // Log activity
        $this->logDelete('holiday', $holidayId, $holidayTitle);
        
        return response()->json(null, 204);
    }
    
    /**
     * Test method to manually trigger holiday notifications
     */
    public function testNotifications(Request $request)
    {
        $daysAhead = $request->get('days', 3);
        $targetDate = Carbon::now()->addDays($daysAhead)->format('Y-m-d');
        
        // Find holidays occurring on the target date
        $upcomingHolidays = Holiday::whereDate('date', $targetDate)->get();
        
        if ($upcomingHolidays->isEmpty()) {
            return response()->json([
                'message' => "No holidays found for {$targetDate}",
                'target_date' => $targetDate,
                'days_ahead' => $daysAhead
            ]);
        }
        
        // Get all active employees and team leaders
        $users = User::whereNotIn('employment_status', ['terminated', 'resigned'])->get();
        $notificationsSent = 0;
        
        foreach ($upcomingHolidays as $holiday) {
            // Determine notification message based on days ahead
            if ($daysAhead === 0) {
                $dayText = 'today';
            } elseif ($daysAhead == 1) {
                $dayText = 'tomorrow';
            } else {
                $dayText = "in {$daysAhead} days";
            }
            
            $holidayDate = Carbon::parse($holiday->date)->format('F j, Y');
            $dayOfWeek = Carbon::parse($holiday->date)->format('l');
            
            $message = "Upcoming Holiday: {$holiday->title} is {$dayText} ({$dayOfWeek}, {$holidayDate}).";
            
            if ($holiday->description) {
                $message .= " " . $holiday->description;
            }
            
            // Send notification to each user
            foreach ($users as $user) {
                // Set different action URLs based on user role
                $actionUrl = $user->role === 'SUPER_ADMIN' 
                    ? '/dashboard/holiday-management' 
                    : '/dashboard/my-attendance';
                
                Notification::createForUser(
                    $user->id,
                    'holiday_reminder',
                    'Upcoming Holiday',
                    $message,
                    [
                        'holiday_id' => $holiday->id,
                        'holiday_title' => $holiday->title,
                        'holiday_date' => $holiday->date,
                        'holiday_type' => $holiday->type,
                        'reminder_days' => $daysAhead,
                        'action_url' => $actionUrl
                    ]
                );
                $notificationsSent++;
            }
        }
        
        return response()->json([
            'message' => 'Holiday notifications sent successfully!',
            'holidays_found' => $upcomingHolidays->count(),
            'users_notified' => $users->count(),
            'total_notifications_sent' => $notificationsSent,
            'target_date' => $targetDate,
            'holidays' => $upcomingHolidays->pluck('title')
        ]);
    }
}


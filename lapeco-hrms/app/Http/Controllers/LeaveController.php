<?php

    namespace App\Http\Controllers;

    use Illuminate\Http\Request;
    use App\Models\Leave;
    use App\Models\User;
    use App\Models\LeaveCredit;
    use App\Models\Notification;
    use Illuminate\Validation\ValidationException;
    use App\Traits\LogsActivity;

    class LeaveController extends Controller
    {
        use LogsActivity;
        /**
         * Helper method to compute full name from name components
         */
        private function computeFullName($user)
        {
            if (!$user) return '';
            
            return trim(implode(' ', array_filter([
                $user->first_name ?? '',
                $user->middle_name ?? '',
                $user->last_name ?? '',
            ])));
        }

        // HR/Admin: list all; Team Leader: list team (same position); Regular: own only
        public function index(Request $request)
        {
            $user = $request->user();
            if ($user->role === 'HR_PERSONNEL') {
                $leaves = Leave::with('user.position')->latest()->get();
            } elseif ($user->role === 'TEAM_LEADER') {
                $leaves = Leave::with('user.position')->whereHas('user', function ($q) use ($user) {
                    $q->where('position_id', $user->position_id);
                })->latest()->get();
            } else {
                // Regular employees can only see their own leave requests
                $leaves = Leave::with('user.position')->where('user_id', $user->id)->latest()->get();
            }
            
            // Compute full name for each leave's user
            $leaves->each(function ($leave) {
                if ($leave->user) {
                    $leave->user->name = $this->computeFullName($leave->user);
                }
            });
            
            return response()->json($leaves);
        }

        // Regular/Team leader create own leave
        public function store(Request $request)
        {
            try {
                $request->merge([
                    'type' => $request->input('type', $request->input('leaveType')),
                ]);
                
                $data = $request->validate([
                    'type' => 'required|string|in:Vacation Leave,Sick Leave,Emergency Leave,Unpaid Leave,Maternity Leave,Paternity Leave',
                    'date_from' => 'required|date',
                    'date_to' => 'required|date|after_or_equal:date_from',
                    'days' => 'required|integer|min:1',
                    'reason' => 'nullable|string',
                ], [
                    'type.required' => 'Please select a leave type.',
                    'type.in' => 'The selected leave type is not valid.',
                    'date_from.required' => 'Please select a start date for your leave.',
                    'date_from.date' => 'Please enter a valid start date.',
                    'date_to.required' => 'Please select an end date for your leave.',
                    'date_to.date' => 'Please enter a valid end date.',
                    'date_to.after_or_equal' => 'The end date must be on or after the start date.',
                    'days.required' => 'Please specify the number of leave days.',
                    'days.integer' => 'The number of days must be a whole number.',
                    'days.min' => 'Leave request must be for at least 1 day.',
                ]);
                
                $user = $request->user();
                $data['user_id'] = $user->id;
                $data['status'] = 'Pending';
                
                // Check leave credits for applicable leave types (skip Unpaid Leave and Paternity Leave)
                if (!in_array($data['type'], ['Unpaid Leave', 'Paternity Leave'])) {
                    $leaveCredit = LeaveCredit::getOrCreateForUser($user->id, $data['type']);
                    
                    if (!$leaveCredit->hasEnoughCredits($data['days'])) {
                        $remaining = $leaveCredit->remaining_credits;
                        return response()->json([
                            'success' => false,
                            'message' => "Insufficient leave credits. You have {$remaining} days remaining for {$data['type']}.",
                            'error' => 'Insufficient credits'
                        ], 422);
                    }
                }
                
                // Check for overlapping leave dates
                $overlappingLeave = Leave::where('user_id', $user->id)
                    ->where('status', '!=', 'Declined')
                    ->where('status', '!=', 'Canceled')
                    ->where(function ($query) use ($data) {
                        $query->whereBetween('date_from', [$data['date_from'], $data['date_to']])
                            ->orWhereBetween('date_to', [$data['date_from'], $data['date_to']])
                            ->orWhere(function ($subQuery) use ($data) {
                                $subQuery->where('date_from', '<=', $data['date_from'])
                                        ->where('date_to', '>=', $data['date_to']);
                            });
                    })
                    ->first();
                
                if ($overlappingLeave) {
                    $overlappingFromDate = date('M j, Y', strtotime($overlappingLeave->date_from));
                    $overlappingToDate = date('M j, Y', strtotime($overlappingLeave->date_to));
                    
                    return response()->json([
                        'success' => false,
                        'message' => "You already have a {$overlappingLeave->status} {$overlappingLeave->type} request from {$overlappingFromDate} to {$overlappingToDate} that overlaps with your requested dates.",
                        'error' => 'Overlapping dates'
                    ], 422);
                }
                
                $leave = Leave::create($data);
                
                // Compute user's full name for notifications
                $userName = $this->computeFullName($user);
                
                // Create notification for all HR personnel
                $hrPersonnel = User::where('role', 'HR_PERSONNEL')->get();
                foreach ($hrPersonnel as $hrUser) {
                    Notification::createForUser(
                        $hrUser->id,
                        'leave_request',
                        'New Leave Request',
                        "{$userName} has submitted a new {$data['type']} request for {$data['days']} day(s) from " . date('M j, Y', strtotime($data['date_from'])) . " to " . date('M j, Y', strtotime($data['date_to'])) . ".",
                        [
                            'leave_id' => $leave->id,
                            'employee_name' => $userName,
                            'leave_type' => $data['type'],
                            'days' => $data['days'],
                            'date_from' => $data['date_from'],
                            'date_to' => $data['date_to'],
                            'action_url' => '/dashboard/leave-management'
                        ]
                    );
                }
                
                // Log activity
                $this->logCreate('leave', $leave->id, "{$data['type']} for {$data['days']} day(s)");
                
                return response()->json([
                    'success' => true,
                    'message' => 'Your leave request has been submitted successfully and is pending approval.',
                    'data' => $leave
                ], 201);
                
            } catch (ValidationException $e) {
                return response()->json([
                    'success' => false,
                    'message' => 'Please check your input and try again.',
                    'errors' => $e->errors()
                ], 422);
            } catch (\Exception $e) {
                return response()->json([
                    'success' => false,
                    'message' => 'Something went wrong while submitting your leave request. Please try again later.',
                    'error' => 'Internal server error'
                ], 500);
            }
        }

        // HR or Team Leader can update status; user can cancel own request
        public function update(Request $request, Leave $leave)
        {
            $validated = $request->validate([
                'status' => 'sometimes|in:Pending,Approved,Declined,Canceled',
                'type' => 'sometimes|string|in:Vacation Leave,Sick Leave,Emergency Leave,Unpaid Leave,Maternity Leave,Paternity Leave',
                'date_from' => 'sometimes|date',
                'date_to' => 'sometimes|date|after_or_equal:date_from',
                'days' => 'sometimes|integer|min:1',
                'reason' => 'sometimes|nullable|string',
            ]);

            $user = $request->user();
            $originalStatus = $leave->status;
            
            if (isset($validated['status'])) {
                if (!in_array($user->role, ['HR_PERSONNEL', 'TEAM_LEADER'])) {
                    return response()->json(['message' => 'Forbidden'], 403);
                }
            } else {
                if ($leave->user_id !== $user->id) {
                    return response()->json(['message' => 'Forbidden'], 403);
                }
            }

            $leave->update($validated);
            
            // Send notification to employee if status was changed by HR/Team Leader
            if (isset($validated['status']) && $validated['status'] !== $originalStatus) {
                $employee = $leave->user;
                $newStatus = $validated['status'];
                
                if (in_array($newStatus, ['Approved', 'Declined'])) {
                    $statusText = $newStatus === 'Approved' ? 'approved' : 'declined';
                    $userName = $this->computeFullName($user);
                    
                    Notification::createForUser(
                        $employee->id,
                        'leave_status_update',
                        "Leave Request {$newStatus}",
                        "Your {$leave->type} request from " . date('M j, Y', strtotime($leave->date_from)) . " to " . date('M j, Y', strtotime($leave->date_to)) . " has been {$statusText} by {$userName}.",
                        [
                            'leave_id' => $leave->id,
                            'leave_type' => $leave->type,
                            'status' => $newStatus,
                            'approved_by' => $userName,
                            'date_from' => $leave->date_from,
                            'date_to' => $leave->date_to,
                            'days' => $leave->days,
                            'action_url' => '/dashboard/my-leave'
                        ]
                    );
                }
            }
            
            $leave->load('user');
            
            // Compute full name for the response
            if ($leave->user) {
                $leave->user->name = $this->computeFullName($leave->user);
            }
            
            // Log activity
            if (isset($validated['status'])) {
                $this->logCustomActivity('update_status', "Updated leave status to {$validated['status']}", 'leave', $leave->id);
            } else {
                $this->logUpdate('leave', $leave->id, $leave->type);
            }
            
            return response()->json($leave);
        }

        public function destroy(Request $request, Leave $leave)
        {
            $user = $request->user();
            if ($user->role !== 'HR_PERSONNEL' && $leave->user_id !== $user->id) {
                return response()->json(['message' => 'Forbidden'], 403);
            }
            
            $leaveType = $leave->type;
            $leaveId = $leave->id;
            $leave->delete();
            
            // Log activity
            $this->logDelete('leave', $leaveId, $leaveType);
            
            return response()->json(null, 204);
        }

        // Get leave credits for a user
        public function getLeaveCredits(Request $request, $userId = null)
        {
            $user = $request->user();
            
            // If no userId provided, get current user's credits
            if (!$userId) {
                $userId = $user->id;
            }
            
            // Check permissions - only HR can view other users' credits
            if ($userId != $user->id && $user->role !== 'HR_PERSONNEL') {
                return response()->json(['message' => 'Forbidden'], 403);
            }
            
            $leaveCredits = LeaveCredit::where('user_id', $userId)
                ->where('year', date('Y'))
                ->get()
                ->keyBy('leave_type');
            
            // Ensure all leave types have records (only types with credit limits)
            $leaveTypes = ['Vacation Leave', 'Sick Leave', 'Emergency Leave'];
            $result = [];
            
            foreach ($leaveTypes as $type) {
                if (isset($leaveCredits[$type])) {
                    $result[$type] = $leaveCredits[$type];
                } else {
                    $result[$type] = LeaveCredit::getOrCreateForUser($userId, $type);
                }
            }
            
            return response()->json($result);
        }

        // Get all users' leave credits in bulk (HR only)
        public function getAllLeaveCredits(Request $request)
        {
            $user = $request->user();
            
            // Only HR can access all users' leave credits
            if ($user->role !== 'HR_PERSONNEL') {
                return response()->json(['message' => 'Forbidden'], 403);
            }
            
            // Get all users with name components
            $users = User::select('id', 'first_name', 'middle_name', 'last_name', 'email', 'gender')->get();
            
            // Get all leave credits for current year
            $leaveCredits = LeaveCredit::where('year', date('Y'))
                ->get()
                ->groupBy('user_id');
            
            // Define leave types (only types with credit limits)
            $leaveTypes = ['Vacation Leave', 'Sick Leave', 'Emergency Leave'];
            
            $result = [];
            
            foreach ($users as $userData) {
                $userCredits = [];
                $userLeaveCredits = $leaveCredits->get($userData->id, collect());
                $userLeaveCreditsKeyed = $userLeaveCredits->keyBy('leave_type');
                
                foreach ($leaveTypes as $type) {
                    if (isset($userLeaveCreditsKeyed[$type])) {
                        $userCredits[$type] = $userLeaveCreditsKeyed[$type];
                    } else {
                        // Create default record if not exists
                        $userCredits[$type] = LeaveCredit::getOrCreateForUser($userData->id, $type);
                    }
                }
                
                // Compute full name for the user
                $userData->name = $this->computeFullName($userData);
                
                $result[] = [
                    'user' => $userData,
                    'leave_credits' => $userCredits
                ];
            }
            
            return response()->json($result);
        }

        // Update leave credits (HR only)
        public function updateLeaveCredits(Request $request, $userId)
        {
            $user = $request->user();
            
            if ($user->role !== 'HR_PERSONNEL') {
                return response()->json(['message' => 'Forbidden'], 403);
            }
            
            $validated = $request->validate([
                'leave_type' => 'required|string|in:Vacation Leave,Sick Leave,Emergency Leave',
                'total_credits' => 'required|integer|min:0',
            ]);
            
            $leaveCredit = LeaveCredit::getOrCreateForUser($userId, $validated['leave_type']);
            $leaveCredit->update(['total_credits' => $validated['total_credits']]);
            
            return response()->json([
                'success' => true,
                'message' => 'Leave credits updated successfully.',
                'data' => $leaveCredit
            ]);
        }

        // Bulk add credits to all employees (HR only)
        public function bulkAddCredits(Request $request)
        {
            $user = $request->user();
            
            if ($user->role !== 'HR_PERSONNEL') {
                return response()->json(['message' => 'Forbidden'], 403);
            }
            
            $validated = $request->validate([
                'vacation' => 'integer|min:0',
                'sick' => 'integer|min:0',
                'emergency' => 'integer|min:0',
            ]);
            
            $updatedRecords = 0;
            $users = User::whereIn('role', ['HR_PERSONNEL', 'TEAM_LEADER', 'REGULAR_EMPLOYEE'])->get();
            
            foreach ($users as $targetUser) {
                if ($validated['vacation'] > 0) {
                    $credit = LeaveCredit::getOrCreateForUser($targetUser->id, 'Vacation Leave');
                    $credit->increment('total_credits', $validated['vacation']);
                    $updatedRecords++;
                }
                
                if ($validated['sick'] > 0) {
                    $credit = LeaveCredit::getOrCreateForUser($targetUser->id, 'Sick Leave');
                    $credit->increment('total_credits', $validated['sick']);
                    $updatedRecords++;
                }
                
                if ($validated['emergency'] > 0) {
                    $credit = LeaveCredit::getOrCreateForUser($targetUser->id, 'Emergency Leave');
                    $credit->increment('total_credits', $validated['emergency']);
                    $updatedRecords++;
                }
            }
            
            return response()->json([
                'success' => true,
                'message' => 'Leave credits added successfully to all employees.',
                'users_updated' => $users->count(),
                'records_updated' => $updatedRecords
            ]);
        }

        // Reset used credits (HR only)
        public function resetUsedCredits(Request $request)
        {
            $user = $request->user();
            
            if ($user->role !== 'HR_PERSONNEL') {
                return response()->json(['message' => 'Forbidden'], 403);
            }
            
            $validated = $request->validate([
                'user_id' => 'nullable|exists:users,id',
                'leave_type' => 'nullable|string|in:Vacation Leave,Sick Leave,Emergency Leave',
                'reset_all_users' => 'boolean',
                'reset_all_types' => 'boolean',
            ]);
            
            $query = LeaveCredit::where('year', date('Y'));
            
            if (!empty($validated['user_id'])) {
                $query->where('user_id', $validated['user_id']);
            } elseif (!$validated['reset_all_users']) {
                return response()->json([
                    'success' => false,
                    'message' => 'Please specify a user or select reset all users.'
                ], 422);
            }
            
            if (!empty($validated['leave_type'])) {
                $query->where('leave_type', $validated['leave_type']);
            } elseif (!$validated['reset_all_types']) {
                return response()->json([
                    'success' => false,
                    'message' => 'Please specify a leave type or select reset all types.'
                ], 422);
            }
            
            $affectedRecords = $query->update([
                'used_credits' => 0,
                'last_reset_at' => now()
            ]);
            
            return response()->json([
                'success' => true,
                'message' => "Successfully reset used credits for {$affectedRecords} records.",
                'affected_records' => $affectedRecords
            ]);
        }
    }
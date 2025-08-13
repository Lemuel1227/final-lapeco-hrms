<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Leave;
use App\Models\User;

class LeaveController extends Controller
{
    // HR/Admin: list all; Team Leader: list team (same position); Regular: own only
    public function index(Request $request)
    {
        $user = $request->user();
        if ($user->role === 'HR_PERSONNEL') {
            $leaves = Leave::with('user')->latest()->get();
        } elseif ($user->role === 'TEAM_LEADER') {
            $leaves = Leave::with('user')->whereHas('user', function ($q) use ($user) {
                $q->where('position_id', $user->position_id);
            })->latest()->get();
        } else {
            // Regular employees can only see their own leave requests
            $leaves = Leave::with('user')->where('user_id', $user->id)->latest()->get();
        }
        return response()->json($leaves);
    }

    // Regular/Team leader create own leave
    public function store(Request $request)
    {
        $request->merge([
            'type' => $request->input('type', $request->input('leaveType')),
        ]);
        $data = $request->validate([
            'type' => 'required|string|in:Vacation Leave,Sick Leave,Emergency Leave,Personal Leave,Unpaid Leave',
            'date_from' => 'required|date',
            'date_to' => 'required|date|after_or_equal:date_from',
            'days' => 'required|integer|min:1',
            'reason' => 'nullable|string',
        ]);
        $data['user_id'] = $request->user()->id;
        $data['status'] = 'Pending';
        $leave = Leave::create($data);
        return response()->json($leave, 201);
    }

    // HR or Team Leader can update status; user can cancel own request
    public function update(Request $request, Leave $leave)
    {
        $validated = $request->validate([
            'status' => 'sometimes|in:Pending,Approved,Declined,Canceled',
            'type' => 'sometimes|string|in:Vacation Leave,Sick Leave,Emergency Leave,Personal Leave,Unpaid Leave',
            'date_from' => 'sometimes|date',
            'date_to' => 'sometimes|date|after_or_equal:date_from',
            'days' => 'sometimes|integer|min:1',
            'reason' => 'sometimes|nullable|string',
        ]);

        $user = $request->user();
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
        return response()->json($leave->fresh('user'));
    }

    public function destroy(Request $request, Leave $leave)
    {
        $user = $request->user();
        if ($user->role !== 'HR_PERSONNEL' && $leave->user_id !== $user->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }
        $leave->delete();
        return response()->json(null, 204);
    }
}

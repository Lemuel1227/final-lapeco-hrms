<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use App\Models\Position;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class EmployeeController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $role = $user->role;
        
        if ($role === 'HR_PERSONNEL') {
            $employees = User::all();
        } elseif ($role === 'TEAM_LEADER') {
            // Team leaders can only see employees with the same position_id
            $employees = User::where('position_id', $user->position_id)->get();
        } else {
            // Regular employees can only see themselves
            $employees = User::where('id', $user->id)->get();
        }
        
        $positions = Position::all()->mapWithKeys(function ($pos) {
            return [$pos->id => $pos->name];
        });
        
        $employees = $employees->map(function ($user) use ($positions) {
            return [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'employee_id' => $user->employee_id,
                'position_id' => $user->position_id,
                'position' => $positions[$user->position_id] ?? 'Unassigned',
                'joining_date' => $user->joining_date,
                'birthday' => $user->birthday,
                'gender' => $user->gender,
                'address' => $user->address,
                'contact_number' => $user->contact_number,
                'image_url' => $user->image_url,
                'sss_no' => $user->sss_no,
                'tin_no' => $user->tin_no,
                'pag_ibig_no' => $user->pag_ibig_no,
                'philhealth_no' => $user->philhealth_no,
                'resume_file' => $user->resume_file,
                'account_status' => $user->account_status,
            ];
        });
        
        return response()->json($employees);
    }

    public function show(User $employee)
    {
        return response()->json($employee);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'role' => 'required|string|in:HR_PERSONNEL,TEAM_LEADER,REGULAR_EMPLOYEE',
            'position_id' => 'nullable|exists:positions,id',
            'joining_date' => 'nullable|date',
            'birthday' => 'nullable|date',
            'gender' => 'nullable|string|in:Male,Female,Other',
            'address' => 'nullable|string',
            'contact_number' => 'nullable|string|max:20',
            'image_url' => 'nullable|string',
            'sss_no' => 'nullable|string|max:20',
            'tin_no' => 'nullable|string|max:20',
            'pag_ibig_no' => 'nullable|string|max:20',
            'philhealth_no' => 'nullable|string|max:20',
            'resume_file' => 'nullable|string',
            'account_status' => 'nullable|string|in:Active,Deactivated',
        ]);

        // Ensure required database fields are provided
        $validated['employee_id'] = $request->input('employee_id') ?: ('EMP-' . strtoupper(Str::random(6)));
        $validated['password'] = Hash::make(Str::random(12));

        $employee = User::create($validated);
        return response()->json($employee, 201);
    }

    public function update(Request $request, User $employee)
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|unique:users,email,' . $employee->id,
            'role' => 'sometimes|string|in:HR_PERSONNEL,TEAM_LEADER,REGULAR_EMPLOYEE',
            'position_id' => 'sometimes|nullable|exists:positions,id',
            'joining_date' => 'sometimes|nullable|date',
            'birthday' => 'sometimes|nullable|date',
            'gender' => 'sometimes|nullable|string|in:Male,Female,Other',
            'address' => 'sometimes|nullable|string',
            'contact_number' => 'sometimes|nullable|string|max:20',
            'image_url' => 'sometimes|nullable|string',
            'sss_no' => 'sometimes|nullable|string|max:20',
            'tin_no' => 'sometimes|nullable|string|max:20',
            'pag_ibig_no' => 'sometimes|nullable|string|max:20',
            'philhealth_no' => 'sometimes|nullable|string|max:20',
            'resume_file' => 'sometimes|nullable|string',
            'account_status' => 'sometimes|nullable|string|in:Active,Deactivated',
        ]);

        $employee->update($validated);
        return response()->json($employee->fresh());
    }

    public function destroy(User $employee)
    {
        $employee->delete();
        return response()->json(null, 204);
    }
}
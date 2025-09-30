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
            // Team leaders can see employees with the same position_id
            $employees = User::where('position_id', $user->position_id)->get();
        } else {
            // Regular employees can see all employees in their position
            $employees = User::where('position_id', $user->position_id)->get();
        }
        
        $positions = Position::all()->mapWithKeys(function ($pos) {
            return [$pos->id => $pos->name];
        });
        
        $employees = $employees->map(function ($employee) use ($positions, $user, $role) {
            $data = [
                'id' => $employee->id,
                'name' => $employee->name,
                'email' => $employee->email,
                'role' => $employee->role,
                'position_id' => $employee->position_id,
                'position' => $positions[$employee->position_id] ?? 'Unassigned',
                'joining_date' => $employee->joining_date,
                'birthday' => $employee->birthday,
                'gender' => $employee->gender,
                'address' => $employee->address,
                'contact_number' => $employee->contact_number,
                'image_url' => $employee->image_url,
                'account_status' => $employee->account_status,
                'password_changed' => $employee->password_changed,
            ];
            
            // Only include sensitive data for HR personnel or if it's the user's own data
            if ($role === 'HR_PERSONNEL' || $employee->id === $user->id) {
                $data['sss_no'] = $employee->sss_no;
                $data['tin_no'] = $employee->tin_no;
                $data['pag_ibig_no'] = $employee->pag_ibig_no;
                $data['philhealth_no'] = $employee->philhealth_no;
                $data['resume_file'] = $employee->resume_file;
            } else {
                $data['sss_no'] = null;
                $data['tin_no'] = null;
                $data['pag_ibig_no'] = null;
                $data['philhealth_no'] = null;
                $data['resume_file'] = null;
            }
            
            return $data;
        });
        
        return response()->json($employees);
    }

    public function show(Request $request, User $employee)
    {
        $user = $request->user();
        $role = $user->role;
        
        // Check if user has permission to view this employee
        if ($role === 'HR_PERSONNEL') {
            // HR can view any employee
        } elseif ($role === 'TEAM_LEADER') {
            // Team leaders can only view employees in their position
            if ($employee->position_id !== $user->position_id) {
                return response()->json(['error' => 'Unauthorized'], 403);
            }
        } else {
            // Regular employees can only view employees in their position
            if ($employee->position_id !== $user->position_id) {
                return response()->json(['error' => 'Unauthorized'], 403);
            }
        }
        
        $data = [
            'id' => $employee->id,
            'name' => $employee->name,
            'email' => $employee->email,
            'role' => $employee->role,
            'employee_id' => $employee->employee_id,
            'position_id' => $employee->position_id,
            'joining_date' => $employee->joining_date,
            'birthday' => $employee->birthday,
            'gender' => $employee->gender,
            'address' => $employee->address,
            'contact_number' => $employee->contact_number,
            'image_url' => $employee->image_url,
            'account_status' => $employee->account_status,
        ];
        
        // Only include sensitive data for HR personnel or if it's the user's own data
        if ($role === 'HR_PERSONNEL' || $employee->id === $user->id) {
            $data['sss_no'] = $employee->sss_no;
            $data['tin_no'] = $employee->tin_no;
            $data['pag_ibig_no'] = $employee->pag_ibig_no;
            $data['philhealth_no'] = $employee->philhealth_no;
            $data['resume_file'] = $employee->resume_file;
        } else {
            $data['sss_no'] = null;
            $data['tin_no'] = null;
            $data['pag_ibig_no'] = null;
            $data['philhealth_no'] = null;
            $data['resume_file'] = null;
        }
        
        return response()->json($data);
    }

    public function store(Request $request)
    {
        $user = $request->user();
        
        // Only HR personnel can create new employees
        if ($user->role !== 'HR_PERSONNEL') {
            return response()->json(['error' => 'Unauthorized'], 403);
        }
        
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

        // Create employee first to get the ID
        $employee = User::create($validated);
        
        // Generate password as 'lapeco+id' and set password_changed to false
        $defaultPassword = 'lapeco' . $employee->id;
        $employee->update([
            'password' => Hash::make($defaultPassword),
            'password_changed' => false
        ]);

        // Return employee with account details for the modal
        return response()->json([
            'employee' => $employee,
            'account_details' => [
                'employee_id' => $employee->id,
                'username' => $employee->email,
                'password' => $defaultPassword,
                'email' => $employee->email
            ]
        ], 201);
    }

    public function update(Request $request, User $employee)
    {
        $user = $request->user();
        
        // Only HR personnel can update other employees, users can only update themselves
        if ($user->role !== 'HR_PERSONNEL' && $employee->id !== $user->id) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }
        
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

    public function resetPassword(Request $request, User $employee)
    {
        $user = $request->user();
        
        // Only HR personnel can reset passwords
        if ($user->role !== 'HR_PERSONNEL') {
            return response()->json(['error' => 'Unauthorized'], 403);
        }
        
        // Generate the default password: lapeco + employee ID
        $defaultPassword = 'lapeco' . $employee->id;
        
        // Update the employee's password and set password_changed to false
        $employee->update([
            'password' => Hash::make($defaultPassword),
            'password_changed' => false
        ]);
        
        return response()->json([
            'message' => 'Password reset successfully',
            'employee' => $employee->fresh(),
            'new_password' => $defaultPassword
        ]);
    }

    public function deactivateAccount(Request $request, User $employee)
    {
        $user = $request->user();
        
        // Only HR personnel can deactivate accounts
        if ($user->role !== 'HR_PERSONNEL') {
            return response()->json(['error' => 'Unauthorized'], 403);
        }
        
        // Prevent HR from deactivating their own account
        if ($user->id === $employee->id) {
            return response()->json(['error' => 'You cannot deactivate your own account'], 400);
        }
        
        $employee->update(['account_status' => 'Deactivated']);
        
        return response()->json([
            'message' => 'Account deactivated successfully',
            'employee' => $employee->fresh()
        ]);
    }

    public function activateAccount(Request $request, User $employee)
    {
        $user = $request->user();
        
        // Only HR personnel can activate accounts
        if ($user->role !== 'HR_PERSONNEL') {
            return response()->json(['error' => 'Unauthorized'], 403);
        }
        
        $employee->update(['account_status' => 'Active']);
        
        return response()->json([
            'message' => 'Account activated successfully',
            'employee' => $employee->fresh()
        ]);
    }

    public function destroy(Request $request, User $employee)
    {
        $user = $request->user();
        
        // Only HR personnel can delete employees
        if ($user->role !== 'HR_PERSONNEL') {
            return response()->json(['error' => 'Unauthorized'], 403);
        }
        
        $employee->delete();
        return response()->json(null, 204);
    }
}
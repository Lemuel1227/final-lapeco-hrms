<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AccountController extends Controller
{
    /**
     * Reset an employee's password to default (lapeco + employee ID)
     */
    public function resetPassword(Request $request, User $employee)
    {
        $user = $request->user();
        
        // Only HR personnel can reset passwords
        if ($user->role !== 'SUPER_ADMIN') {
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

    /**
     * Deactivate an employee's account
     */
    public function deactivateAccount(Request $request, User $employee)
    {
        $user = $request->user();
        
        // Only HR personnel can deactivate accounts
        if ($user->role !== 'SUPER_ADMIN') {
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

    /**
     * Activate an employee's account
     */
    public function activateAccount(Request $request, User $employee)
    {
        $user = $request->user();
        
        // Only HR personnel can activate accounts
        if ($user->role !== 'SUPER_ADMIN') {
            return response()->json(['error' => 'Unauthorized'], 403);
        }
        
        $employee->update(['account_status' => 'Active']);
        
        return response()->json([
            'message' => 'Account activated successfully',
            'employee' => $employee->fresh()
        ]);
    }
}


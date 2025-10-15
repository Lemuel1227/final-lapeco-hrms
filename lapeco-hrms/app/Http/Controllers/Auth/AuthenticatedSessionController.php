<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use Carbon\Carbon;

class AuthenticatedSessionController extends Controller
{
    /**
     * Handle an incoming authentication request.
     */
    public function store(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        // Find the user by email
        $user = User::where('email', $request->email)->first();

        // Check if user exists and if account is locked
        if ($user) {
            // Check if account is deactivated
            if ($user->account_status === 'Deactivated') {
                throw ValidationException::withMessages([
                    'email' => ['Your account has been deactivated. Please contact HR personnel for assistance.'],
                ]);
            }

            // Check if account is locked
            if ($user->locked_until && now()->lt($user->locked_until)) {
                $timeRemaining = now()->diffInSeconds($user->locked_until);
                throw ValidationException::withMessages([
                    'email' => ["Your account is temporarily locked. Please try again after {$timeRemaining} seconds."],
                ]);
            }

            // Attempt authentication
            if (!Auth::attempt($request->only('email', 'password'))) {
                // Failed login attempt
                $user->login_attempts = ($user->login_attempts ?? 0) + 1;
                $user->last_failed_login = now();
                
                // If reached 5 attempts, lock the account with progressive timeout
                if ($user->login_attempts >= 5) {
                    // Progressive lockout: 30 seconds * (lockout_count + 1), max 1 day (86400 seconds)
                    $lockoutCount = $user->lockout_count ?? 0;
                    $lockoutSeconds = min(30 * ($lockoutCount + 1), 86400); // Cap at 1 day
                    $user->locked_until = now()->addSeconds($lockoutSeconds);
                    $user->lockout_count = $lockoutCount + 1;
                    $user->login_attempts = 0; // Reset counter after locking
                    $user->save();
                    
                    $lockoutMessage = $lockoutSeconds >= 86400 
                        ? "Too many failed login attempts. Your account has been locked for 1 day."
                        : "Too many failed login attempts. Your account has been locked for {$lockoutSeconds} seconds.";
                    
                    throw ValidationException::withMessages([
                        'email' => [$lockoutMessage],
                    ]);
                }
                
                $user->save();
                
                // Show remaining attempts after second failed attempt
                $remainingAttempts = 5 - $user->login_attempts;
                if ($user->login_attempts >= 2) {
                    throw ValidationException::withMessages([
                        'email' => ["The provided credentials are incorrect. You have {$remainingAttempts} attempts left before your account is locked."],
                    ]);
                } else {
                    throw ValidationException::withMessages([
                        'email' => ['The provided credentials are incorrect.'],
                    ]);
                }
            }

            // Successful login - reset counters
            $user->login_attempts = 0;
            $user->last_failed_login = null;
            $user->locked_until = null;
            $user->lockout_count = 0; // Reset lockout count on successful login
            $user->save();
            
            $token = $user->createToken('auth-token')->plainTextToken;

            return response()->json([
                'user' => $user,
                'token' => $token,
                'message' => 'Login successful'
            ]);
        }
        
        // User not found
        throw ValidationException::withMessages([
            'email' => ['The provided credentials are incorrect.'],
        ]);
    }

    /**
     * Destroy an authenticated session.
     */
    public function destroy(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Logged out successfully'
        ]);
    }
}

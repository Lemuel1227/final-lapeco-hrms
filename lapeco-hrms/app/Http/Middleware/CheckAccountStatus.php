<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class CheckAccountStatus
{
    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure(\Illuminate\Http\Request): (\Illuminate\Http\Response|\Illuminate\Http\RedirectResponse)  $next
     * @return \Illuminate\Http\Response|\Illuminate\Http\RedirectResponse
     */
    public function handle(Request $request, Closure $next)
    {
        if (Auth::check()) {
            $user = Auth::user();
            
            // Check if account is deactivated
            if ($user->account_status === 'Deactivated') {
                // Revoke all tokens for this user
                $user->tokens()->delete();
                
                // Clear the session
                Auth::logout();
                $request->session()->invalidate();
                $request->session()->regenerateToken();
                
                return response()->json([
                    'error' => 'Your account has been deactivated. Please contact HR personnel for assistance.',
                    'logout' => true
                ], 401);
            }
        }
        
        return $next($request);
    }
}
<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;

class SessionController extends Controller
{
    /**
     * Get all active sessions for the authenticated user
     */
    public function index(Request $request)
    {
        $user = Auth::user();
        $currentSessionId = $request->session()->getId();
        
        $sessions = DB::table('sessions')
            ->where('user_id', $user->id)
            ->get()
            ->map(function ($session) use ($currentSessionId) {
                $payload = unserialize(base64_decode($session->payload));
                $userAgent = $session->user_agent;
                
                // Parse user agent to get device info
                $device = $this->parseUserAgent($userAgent);
                
                return [
                    'id' => $session->id,
                    'device' => $device,
                    'lastActive' => Carbon::createFromTimestamp($session->last_activity)->format('Y-m-d H:i:s'),
                    'current' => $session->id === $currentSessionId
                ];
            });
            
        return response()->json([
            'sessions' => $sessions->values()->toArray()
        ]);
    }
    
    /**
     * Revoke a specific session
     */
    public function destroy(Request $request, $sessionId)
    {
        $user = Auth::user();
        $currentSessionId = $request->session()->getId();
        
        // Prevent revoking current session
        if ($sessionId === $currentSessionId) {
            return response()->json([
                'message' => 'Cannot revoke current session'
            ], 400);
        }
        
        // Delete the session
        $deleted = DB::table('sessions')
            ->where('id', $sessionId)
            ->where('user_id', $user->id)
            ->delete();
            
        if ($deleted) {
            return response()->json([
                'message' => 'Session revoked successfully'
            ]);
        }
        
        return response()->json([
            'message' => 'Session not found'
        ], 404);
    }
    
    /**
     * Parse user agent string to get device information
     */
    private function parseUserAgent($userAgent)
    {
        if (empty($userAgent)) {
            return 'Unknown Device';
        }
        
        // Simple user agent parsing
        if (strpos($userAgent, 'Chrome') !== false) {
            if (strpos($userAgent, 'Windows') !== false) {
                return 'Chrome on Windows';
            } elseif (strpos($userAgent, 'Mac') !== false) {
                return 'Chrome on Mac';
            } elseif (strpos($userAgent, 'Linux') !== false) {
                return 'Chrome on Linux';
            } elseif (strpos($userAgent, 'Mobile') !== false) {
                return 'Chrome Mobile';
            }
            return 'Chrome Browser';
        }
        
        if (strpos($userAgent, 'Firefox') !== false) {
            if (strpos($userAgent, 'Windows') !== false) {
                return 'Firefox on Windows';
            } elseif (strpos($userAgent, 'Mac') !== false) {
                return 'Firefox on Mac';
            }
            return 'Firefox Browser';
        }
        
        if (strpos($userAgent, 'Safari') !== false && strpos($userAgent, 'Chrome') === false) {
            if (strpos($userAgent, 'Mobile') !== false) {
                return 'Mobile Safari';
            }
            return 'Safari Browser';
        }
        
        if (strpos($userAgent, 'Edge') !== false) {
            return 'Microsoft Edge';
        }
        
        return 'Unknown Browser';
    }
}
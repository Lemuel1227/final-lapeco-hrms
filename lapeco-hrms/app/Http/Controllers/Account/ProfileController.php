<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProfileUpdateRequest;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Auth\Events\Verified;
use Illuminate\Foundation\Auth\EmailVerificationRequest;
use Illuminate\Support\Facades\URL;

class ProfileController extends Controller
{
    /**
     * Display the user's profile information.
     */
    public function edit(Request $request)
    {
        return response()->json([
            'user' => $request->user(),
            'mustVerifyEmail' => $request->user() instanceof MustVerifyEmail,
            'status' => session('status'),
        ]);
    }

    /**
     * Update the user's profile information.
     */
    public function update(ProfileUpdateRequest $request)
    {
        $request->user()->fill($request->validated());

        if ($request->user()->isDirty('email')) {
            $request->user()->email_verified_at = null;
        }

        $request->user()->save();

        // Load position for consistent response
        $request->user()->load('position');

        return response()->json([
            'message' => 'Profile updated successfully',
            'user' => $request->user()
        ]);
    }

    /**
     * Update the user's theme preference.
     */
    public function updateThemePreference(Request $request)
    {
        $request->validate([
            'theme' => 'required|in:light,dark'
        ]);

        $request->user()->update([
            'theme_preference' => $request->theme
        ]);

        return response()->json([
            'message' => 'Theme preference updated successfully',
            'theme' => $request->theme
        ]);
    }

    /**
     * Send email verification notification.
     */
    public function sendVerificationNotification(Request $request)
    {
        $user = $request->user();

        if ($user->hasVerifiedEmail()) {
            return response()->json([
                'message' => 'Email is already verified'
            ], 400);
        }

        $user->sendEmailVerificationNotification();

        return response()->json([
            'message' => 'Verification email sent successfully'
        ]);
    }

    /**
     * Verify email address.
     */
    public function verifyEmail(Request $request, $id, $hash)
    {
        try {
            // Find the user by ID
            $user = \App\Models\User::findOrFail($id);

            // Verify the hash matches
            if (!hash_equals((string) $hash, sha1($user->getEmailForVerification()))) {
                return $this->verificationResponse('Invalid verification link', false, 'error');
            }

            if ($user->hasVerifiedEmail()) {
                return $this->verificationResponse('Email is already verified', true, 'info');
            }

            if ($user->markEmailAsVerified()) {
                event(new Verified($user));
            }

            return $this->verificationResponse('Email verified successfully! You can now close this window.', true, 'success');

        } catch (\Exception $e) {
            return $this->verificationResponse('Verification failed. Please try again.', false, 'error');
        }
    }

    /**
     * Return an HTML response for email verification that can be displayed in browser
     */
    private function verificationResponse($message, $verified, $type)
    {
        $color = $type === 'success' ? '#28a745' : ($type === 'error' ? '#dc3545' : '#17a2b8');
        $icon = $type === 'success' ? '✓' : ($type === 'error' ? '✗' : 'ℹ');
        
        $html = "
        <!DOCTYPE html>
        <html lang='en'>
        <head>
            <meta charset='UTF-8'>
            <meta name='viewport' content='width=device-width, initial-scale=1.0'>
            <title>Email Verification - Lapeco HRMS</title>
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    margin: 0;
                    padding: 20px;
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .container {
                    background: white;
                    padding: 40px;
                    border-radius: 10px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                    text-align: center;
                    max-width: 500px;
                    width: 100%;
                }
                .icon {
                    font-size: 64px;
                    color: {$color};
                    margin-bottom: 20px;
                }
                .message {
                    font-size: 18px;
                    color: #333;
                    margin-bottom: 30px;
                    line-height: 1.5;
                }
                .brand {
                    color: #666;
                    font-size: 14px;
                    margin-top: 30px;
                    padding-top: 20px;
                    border-top: 1px solid #eee;
                }
                .close-instruction {
                    color: #888;
                    font-size: 14px;
                    margin-top: 15px;
                }
            </style>
        </head>
        <body>
            <div class='container'>
                <div class='icon'>{$icon}</div>
                <div class='message'>{$message}</div>
                <div class='brand'>
                    <strong>Lapeco HRMS</strong><br>
                    Human Resource Management System
                </div>
                " . ($verified ? "<div class='close-instruction'>You can now close this window and return to the application.</div>" : "") . "
            </div>
            
            <script>
                // If verification was successful, try to communicate with parent window
                if ({$verified}) {
                    // Try to send message to parent window (if opened in popup)
                    if (window.opener) {
                        window.opener.postMessage({
                            type: 'email_verification_success',
                            verified: true,
                            message: '{$message}'
                        }, '*');
                    }
                    
                    // Auto-close after 3 seconds if it's a popup
                    if (window.opener) {
                        setTimeout(() => {
                            window.close();
                        }, 3000);
                    }
                }
            </script>
        </body>
        </html>";

        return response($html, $verified ? 200 : 400)
            ->header('Content-Type', 'text/html');
    }

    /**
     * Delete the user's account.
     */
    public function destroy(Request $request): RedirectResponse
    {
        $request->validate([
            'password' => ['required', 'current_password'],
        ]);

        $user = $request->user();

        Auth::logout();

        $user->delete();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return Redirect::to('/');
    }
}

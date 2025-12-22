import React, { useState, useEffect } from 'react';
import { resendEmailVerification, checkEmailVerificationStatus } from '../../services/api';

const EmailVerification = ({ currentUser }) => {
    const [verificationStatus, setVerificationStatus] = useState({
        isVerified: false,
        loading: true,
        error: null
    });
    const [resendStatus, setResendStatus] = useState({
        loading: false,
        success: false,
        error: null,
        cooldown: 0
    });

    // Check verification status on component mount
    useEffect(() => {
        checkVerificationStatus();
        
        // Listen for verification success messages from popup window
        const handleMessage = (event) => {
            if (event.data.type === 'email_verification_success') {
                setVerificationStatus({
                    isVerified: true,
                    loading: false,
                    error: null
                });
                setResendStatus(prev => ({
                    ...prev,
                    success: false,
                    error: null
                }));
            }
        };
        
        window.addEventListener('message', handleMessage);
        
        return () => {
            window.removeEventListener('message', handleMessage);
        };
    }, []);

    // Cooldown timer effect
    useEffect(() => {
        let timer;
        if (resendStatus.cooldown > 0) {
            timer = setInterval(() => {
                setResendStatus(prev => ({
                    ...prev,
                    cooldown: prev.cooldown - 1
                }));
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [resendStatus.cooldown]);

    const checkVerificationStatus = async () => {
        try {
            setVerificationStatus(prev => ({ ...prev, loading: true, error: null }));
            const response = await checkEmailVerificationStatus();
            setVerificationStatus({
                isVerified: response.email_verified_at !== null,
                loading: false,
                error: null
            });
        } catch (error) {
            console.error('Error checking verification status:', error);
            setVerificationStatus({
                isVerified: false,
                loading: false,
                error: 'Failed to check verification status'
            });
        }
    };

    const handleResendVerification = async () => {
        try {
            setResendStatus({
                loading: true,
                success: false,
                error: null,
                cooldown: 0
            });

            await resendEmailVerification();
            
            setResendStatus({
                loading: false,
                success: true,
                error: null,
                cooldown: 60 // 60 second cooldown
            });

            // Clear success message after 5 seconds
            setTimeout(() => {
                setResendStatus(prev => ({ ...prev, success: false }));
            }, 5000);

        } catch (error) {
            console.error('Error resending verification:', error);
            setResendStatus({
                loading: false,
                success: false,
                error: error.message || 'Failed to send verification email',
                cooldown: 0
            });
        }
    };

    const formatCooldownTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`;
    };

    if (verificationStatus.loading) {
        return (
            <div className="card settings-card">
                <div className="card-header">
                    <h5 className="mb-0">Email Verification</h5>
                </div>
                <div className="card-body text-center">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="mt-2 mb-0">Checking verification status...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="card settings-card">
            <div className="card-header">
                <h5 className="mb-0">Email Verification</h5>
            </div>
            <div className="card-body">
                <div className="d-flex align-items-center mb-3">
                    <div className="flex-grow-1">
                        <p className="mb-1"><strong>Email Address:</strong></p>
                        <p className="text-muted mb-0">{currentUser?.email || 'No email address'}</p>
                    </div>
                    <div className="text-end">
                        {verificationStatus.isVerified ? (
                            <span className="badge bg-success fs-6">
                                <i className="bi bi-check-circle-fill me-1"></i>
                                Verified
                            </span>
                        ) : (
                            <span className="badge bg-warning fs-6">
                                <i className="bi bi-exclamation-triangle-fill me-1"></i>
                                Unverified
                            </span>
                        )}
                    </div>
                </div>

                {verificationStatus.error && (
                    <div className="alert alert-danger" role="alert">
                        <i className="bi bi-exclamation-triangle-fill me-2"></i>
                        {verificationStatus.error}
                    </div>
                )}

                {verificationStatus.isVerified ? (
                    <div className="alert alert-success" role="alert">
                        <i className="bi bi-check-circle-fill me-2"></i>
                        <strong>Your email is verified!</strong> You can receive important notifications and account updates.
                    </div>
                ) : (
                    <>
                        <div className="alert alert-warning" role="alert">
                            <i className="bi bi-exclamation-triangle-fill me-2"></i>
                            <strong>Email not verified.</strong> Please verify your email address to ensure you receive important notifications and can recover your account if needed.
                        </div>

                        {resendStatus.success && (
                            <div className="alert alert-info" role="alert">
                                <i className="bi bi-envelope-check-fill me-2"></i>
                                <strong>Verification email sent!</strong> Please check your inbox and spam folder.
                            </div>
                        )}

                        {resendStatus.error && (
                            <div className="alert alert-danger" role="alert">
                                <i className="bi bi-exclamation-triangle-fill me-2"></i>
                                {resendStatus.error}
                            </div>
                        )}

                        <div className="verification-actions">
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={handleResendVerification}
                                disabled={resendStatus.loading || resendStatus.cooldown > 0}
                            >
                                {resendStatus.loading ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                        Sending...
                                    </>
                                ) : resendStatus.cooldown > 0 ? (
                                    <>
                                        <i className="bi bi-clock me-2"></i>
                                        Resend in {formatCooldownTime(resendStatus.cooldown)}
                                    </>
                                ) : (
                                    <>
                                        <i className="bi bi-envelope-fill me-2"></i>
                                        Send Verification Email
                                    </>
                                )}
                            </button>

                            <button
                                type="button"
                                className="btn btn-outline-secondary ms-2"
                                onClick={checkVerificationStatus}
                                disabled={verificationStatus.loading}
                            >
                                <i className="bi bi-arrow-clockwise me-2"></i>
                                Check Status
                            </button>
                        </div>

                        <div className="mt-3">
                            <h6>Didn't receive the email?</h6>
                            <ul className="text-muted small">
                                <li>Check your spam or junk folder</li>
                                <li>Make sure the email address is correct</li>
                                <li>Add our domain to your safe senders list</li>
                                <li>Try resending the verification email</li>
                            </ul>
                        </div>
                    </>
                )}
            </div>
            
            {!verificationStatus.isVerified && (
                <div className="card-footer">
                    <div className="row align-items-center">
                        <div className="col">
                            <small className="text-muted">
                                <i className="bi bi-info-circle me-1"></i>
                                Verification emails may take a few minutes to arrive
                            </small>
                        </div>
                        <div className="col-auto">
                            <button
                                type="button"
                                className="btn btn-link btn-sm p-0"
                                onClick={checkVerificationStatus}
                            >
                                Refresh Status
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmailVerification;

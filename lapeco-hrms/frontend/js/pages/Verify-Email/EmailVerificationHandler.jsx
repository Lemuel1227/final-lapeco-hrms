import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import logo from '../../assets/logo.png';
import './VerifyEmail.css';

const EmailVerificationHandler = () => {
    const [status, setStatus] = useState('verifying'); // 'verifying', 'success', 'error'
    const [message, setMessage] = useState('Verifying your email...');
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        const verifyEmail = async () => {
            try {
                // Get the query parameters from the URL
                const searchParams = new URLSearchParams(location.search);
                const id = searchParams.get('id') || location.pathname.split('/')[2];
                const hash = searchParams.get('hash');
                const expires = searchParams.get('expires');
                const signature = searchParams.get('signature');

                if (!id || !hash) {
                    setStatus('error');
                    setMessage('Invalid verification link');
                    return;
                }

                // Make API call to backend verification endpoint
                const backendUrl = (import.meta?.env?.VITE_API_URL ?? import.meta?.env?.REACT_APP_API_URL ?? 'https://api.lapeco.org');
                const verificationUrl = `${backendUrl}/api/email/verify/${id}/${hash}?expires=${expires}&signature=${signature}`;
                
                const response = await fetch(verificationUrl, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                    },
                });

                if (response.ok) {
                    setStatus('success');
                    setMessage('Email verified successfully! You can now close this window.');
                    
                    // Notify parent window if this is opened as popup
                    if (window.opener) {
                        window.opener.postMessage({
                            type: 'email_verification_success',
                            verified: true,
                            message: 'Email verified successfully!'
                        }, '*');
                        
                        // Auto close after 3 seconds
                        setTimeout(() => {
                            window.close();
                        }, 3000);
                    } else {
                        // Redirect to settings after 3 seconds if not a popup
                        setTimeout(() => {
                            navigate('/dashboard/account-settings');
                        }, 3000);
                    }
                } else {
                    const errorData = await response.text();
                    setStatus('error');
                    setMessage('Verification failed. Please try again.');
                }
            } catch (error) {
                console.error('Verification error:', error);
                setStatus('error');
                setMessage('Verification failed. Please try again.');
            }
        };

        verifyEmail();
    }, [location, navigate]);

    const getIcon = () => {
        switch (status) {
            case 'success': return '✓';
            case 'error': return '✗';
            default: return '⏳';
        }
    };

    const getColor = () => {
        switch (status) {
            case 'success': return '#28a745';
            case 'error': return '#dc3545';
            default: return '#17a2b8';
        }
    };

    return (
        <div className="verification-wrapper d-flex flex-column justify-content-center align-items-center verification-bg">
            <div className="text-center mb-4">
                <img src={logo} alt="Lapeco HRMS" className="verification-logo img-fluid" />
            </div>

            <section className="verification-panel px-4 py-5">
                <div className="verification-panel-content text-center">
                    <h4 className="verification-title mb-4">Email Verification</h4>

                    <div
                        className="verification-status-icon"
                        style={{ backgroundColor: `${getColor()}17`, color: getColor() }}
                    >
                        {getIcon()}
                    </div>

                    <h5 className="fw-semibold mb-3">
                        {status === 'success' && 'Email Verified'}
                        {status === 'error' && 'Verification Failed'}
                        {status === 'verifying' && 'Verifying Email'}
                    </h5>

                    <p className="verification-subtext mb-4">{message}</p>

                    {status === 'verifying' && (
                        <div className="verification-info-box gap-3 justify-content-center">
                            <div className="spinner-border text-primary" role="status" style={{ width: '1.9rem', height: '1.9rem' }}>
                                <span className="visually-hidden">Loading...</span>
                            </div>
                            <span className="fw-medium">Please wait while we confirm your email address.</span>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="verification-info-box error gap-3">
                            <i className="bi bi-exclamation-triangle-fill fs-4"></i>
                            <span>The verification link may have expired or is invalid. You can close this window and request a new email from the application.</span>
                        </div>
                    )}

                    {status === 'success' && (
                        <div className="verification-info-box success gap-3">
                            <i className="bi bi-check-circle-fill fs-4"></i>
                            <span>{window.opener ? 'You can close this tab now.' : 'Redirecting you back to the application...'}</span>
                        </div>
                    )}

                    <div className="mt-5 pt-3 border-top text-muted small">
                        Lapeco HRMS • Human Resource Management System
                    </div>
                </div>
            </section>

            <div className="verification-footer text-center">
                &copy; {new Date().getFullYear()} Lapeco Foods International. All rights reserved.
            </div>
        </div>
    );
}
;

export default EmailVerificationHandler;

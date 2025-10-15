import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './Login.css';

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState('');
    const [processing, setProcessing] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setProcessing(true);
        setStatus('');

        try {
            // TODO: Implement password reset API call
            setStatus('Password reset link has been sent to your email address.');
        } catch (error) {
            setStatus('An error occurred. Please try again.');
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="vh-100 d-flex flex-column justify-content-center align-items-center bg-container login-page-wrapper">
            <div className="logo-container text-center mb-4">
                <img src="/logo.png" alt="Lapeco Logo" className="login-page-logo img-fluid" />
            </div>

            <div className="login-card bg-light bg-opacity-75 p-4 shadow-lg rounded">
                <div className="row justify-content-center">
                    <div className="col-md-12">
                        <h2 className="text-center mb-1 login-title">Forgot Password</h2>
                        
                        {status && (
                            <div className="login-error-container mb-3">
                                <div className={`alert ${status.includes('error') ? 'alert-danger' : 'alert-success'} py-2 fade show`} role="alert">
                                    {status}
                                </div>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="login-form">
                            <div className="mb-3">
                                <label htmlFor="email" className="form-label login-label">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    className="form-control login-input"
                                    id="email"
                                    placeholder="Enter your email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    autoComplete="username"
                                />
                            </div>

                            <div className="d-grid">
                                <button
                                    type="submit"
                                    className="btn btn-primary login-button"
                                    disabled={processing}
                                >
                                    {processing ? 'Sending...' : 'Send Password Reset Link'}
                                </button>
                            </div>

                            <div className="text-center mt-3">
                                <Link to="/login" className="text-decoration-none">
                                    Back to Login
                                </Link>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}

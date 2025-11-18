import React, { useState } from 'react';
import { authAPI } from '../services/api';

const ForgotPasswordModal = ({ show, onClose }) => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState({ type: null, message: '' });
  const [isLoading, setIsLoading] = useState(false);

  const handleClose = () => {
    setEmail('');
    setStatus({ type: null, message: '' });
    setIsLoading(false);
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setStatus({ type: null, message: '' });

    try {
      const response = await authAPI.sendPasswordResetLink({ email });
      setStatus({ type: 'success', message: response.data?.message || 'Password reset link has been sent to your email address.' });
    } catch (error) {
      const message = error.response?.data?.message || 'An error occurred. Please try again.';
      setStatus({ type: 'error', message });
    } finally {
      setIsLoading(false);
    }
  };

  if (!show) return null;

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Forgot Your Password?</h5>
            <button type="button" className="btn-close" onClick={handleClose}></button>
          </div>
          <div className="modal-body">
            <p className="text-muted">Enter your registered email address, and we'll send you a password reset link.</p>
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label htmlFor="forgot-password-email" className="form-label">Email Address</label>
                <input
                  type="email"
                  className="form-control"
                  id="forgot-password-email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              {status.message && (
                <div className={`alert ${status.type === 'error' ? 'alert-danger' : 'alert-success'} py-2`} role="alert">
                  {status.message}
                </div>
              )}

              <button type="submit" className="btn btn-success w-100" disabled={isLoading}>
                {isLoading ? (
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                ) : (
                  'Send Reset Link'
                )}
              </button>
            </form>
          </div>
          <div className="modal-footer justify-content-center text-center bg-light">
            <p className="text-muted small mb-0">
              Having trouble? <br />
              <strong>Please contact an HR Manager for assistance.</strong>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordModal;
import React, { useState } from 'react';

const mockUserAccounts = [
    { employeeId: 'EMP005', username: 'hr_user', email: 'hr_user@lapeco.com', password: 'password123' },
    { employeeId: 'EMP003', username: 'leader_carol', email: 'carol.w@example.com', password: 'password123' },
    { employeeId: 'EMP002', username: 'leader_bob', email: 'bob.s@example.com', password: 'password123' },
    { employeeId: 'EMP001', username: 'employee_alice', email: 'alice.j@example.com', password: 'password123' },
];

const ForgotPasswordModal = ({ show, onClose }) => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [targetUser, setTargetUser] = useState(null);

  const resetState = () => {
    setStep(1);
    setEmail('');
    setCode('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setIsLoading(false);
    setTargetUser(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleFindAccount = (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    setTimeout(() => {
      const userAccount = mockUserAccounts.find(acc => acc.email.toLowerCase() === email.toLowerCase());
      if (userAccount) {
        setTargetUser(userAccount);
        setStep(2);
      } else {
        setError('No account found with that email address.');
      }
      setIsLoading(false);
    }, 1000);
  };

  const handleVerifyCode = (e) => {
    e.preventDefault();
    setError('');

    if (code.length === 6 && /^\d+$/.test(code)) {
      setStep(3);
    } else {
      setError('Invalid verification code. Please enter the 6-digit code.');
    }
  };

  const handleResetPassword = (e) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    console.log(`Password for ${targetUser.email} successfully reset to: ${newPassword}`);
    setStep(4);
  };


  const renderContent = () => {
    switch (step) {
      case 1: // Email Input
        return (
          <form onSubmit={handleFindAccount}>
            <p className="text-muted">Enter your registered email address, and we'll send you a code to reset your password.</p>
            <div className="mb-3">
              <label htmlFor="email" className="form-label">Email Address</label>
              <input type="email" className={`form-control ${error ? 'is-invalid' : ''}`} id="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
              {error && <div className="invalid-feedback">{error}</div>}
            </div>
            <button type="submit" className="btn btn-success w-100" disabled={isLoading}>
              {isLoading ? <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> : 'Send Verification Code'}
            </button>
          </form>
        );
      case 2: // Code Verification
        return (
          <form onSubmit={handleVerifyCode}>
            <p className="text-muted">A 6-digit verification code has been sent to <strong>{email}</strong>. Please enter it below.</p>
            <div className="mb-3">
              <label htmlFor="code" className="form-label">Verification Code</label>
              <input type="text" className={`form-control ${error ? 'is-invalid' : ''}`} id="code" value={code} onChange={(e) => setCode(e.target.value)} required maxLength="6" />
              {error && <div className="invalid-feedback">{error}</div>}
            </div>
            <button type="submit" className="btn btn-success w-100">Verify Code</button>
            <button type="button" className="btn btn-link w-100 mt-2" onClick={() => setStep(1)}>Use a different email</button>
          </form>
        );
      case 3: // New Password
        return (
          <form onSubmit={handleResetPassword}>
            <p className="text-muted">Create a new password for your account.</p>
            <div className="mb-3">
              <label htmlFor="newPassword" className="form-label">New Password</label>
              <input type="password" className={`form-control ${error ? 'is-invalid' : ''}`} id="newPassword" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
            </div>
            <div className="mb-3">
              <label htmlFor="confirmPassword" className="form-label">Confirm New Password</label>
              <input type="password" className={`form-control ${error ? 'is-invalid' : ''}`} id="confirmPassword" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
              {error && <div className="text-danger small mt-2">{error}</div>}
            </div>
            <button type="submit" className="btn btn-success w-100">Reset Password</button>
          </form>
        );
      case 4: // Success
        return (
          <div className="text-center">
            <i className="bi bi-check-circle-fill text-success" style={{ fontSize: '3rem' }}></i>
            <h4 className="mt-3">Password Reset!</h4>
            <p className="text-muted">Your password has been successfully updated. You can now close this window and log in with your new password.</p>
          </div>
        );
      default:
        return null;
    }
  };

  const getTitle = () => {
    switch (step) {
      case 1: return 'Forgot Your Password?';
      case 2: return 'Check Your Email';
      case 3: return 'Create New Password';
      case 4: return 'Success!';
      default: return '';
    }
  };

  if (!show) return null;

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{getTitle()}</h5>
            <button type="button" className="btn-close" onClick={handleClose}></button>
          </div>
          <div className="modal-body">
            {renderContent()}
          </div>
          <div className="modal-footer justify-content-center text-center bg-light">
            {step < 4 ? (
              <p className="text-muted small mb-0">
                Having trouble? <br />
                <strong>Please contact an HR Personnel for assistance.</strong>
              </p>
            ) : (
                <button type="button" className="btn btn-primary" onClick={handleClose}>
                    Back to Login
                </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordModal;
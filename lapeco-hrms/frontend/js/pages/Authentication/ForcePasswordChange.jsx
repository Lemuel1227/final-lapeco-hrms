import React, { useEffect, useState } from 'react';
import { authAPI } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import logo from '../../assets/logo.png';
import './Login.css';

const ForcePasswordChange = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);

  useEffect(() => {
    const verifyAccess = async () => {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        navigate('/login', { replace: true });
        return;
      }

      try {
        const response = await authAPI.getUser();
        const userData = response.data;

        if (!userData || userData.password_changed) {
          navigate('/dashboard', { replace: true });
          return;
        }

        // Keep local profile data in sync
        localStorage.setItem('user', JSON.stringify(userData));
      } catch (err) {
        navigate('/login', { replace: true });
        return;
      } finally {
        setIsCheckingAccess(false);
      }
    };

    verifyAccess();
  }, [navigate]);

  // Function to handle going back to login
  const handleBackToLogin = () => {
    // Clear user session data
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    
    // Navigate to login page
    navigate('/login', { replace: true });
  };

  // Get current user's email for accessibility
  const getCurrentUserEmail = () => {
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        return user.email || '';
      }
    } catch (error) {
      console.error('Error getting user data:', error);
    }
    return '';
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
      setError('All fields are required.');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    if (formData.newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await authAPI.changePassword({
        current_password: formData.currentPassword,
        password: formData.newPassword,
        password_confirmation: formData.confirmPassword
      });

      if (response.data) {
        // Update user data in localStorage to reflect password change
        const userData = localStorage.getItem('user');
        if (userData) {
          const user = JSON.parse(userData);
          user.password_changed = true;
          localStorage.setItem('user', JSON.stringify(user));
        }

        // Navigate to dashboard
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Password change error:', error);
      
      if (error.response?.status === 422) {
        const errorData = error.response.data;
        if (errorData.errors) {
          const firstError = Object.values(errorData.errors)[0];
          setError(Array.isArray(firstError) ? firstError[0] : firstError);
        } else if (errorData.message) {
          setError(errorData.message);
        } else {
          setError('Invalid current password or password requirements not met.');
        }
      } else if (error.response?.status === 401) {
        setError('Current password is incorrect.');
      } else {
        setError('Unable to change password. Please try again later.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingAccess) {
    return (
      <div className="vh-100 d-flex flex-column justify-content-center align-items-center bg-container login-page-wrapper">
        <div className="text-center text-light">
          <div className="spinner-border text-light mb-3" role="status">
            <span className="visually-hidden">Checking access…</span>
          </div>
          <p className="mb-0">Preparing secure password change flow...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="vh-100 d-flex flex-column justify-content-center align-items-center bg-container login-page-wrapper">
      <div className="logo-container text-center mb-4">
        <img src={logo} alt="Lapeco Logo" className="login-page-logo img-fluid" />
      </div>

      <div className="login-card bg-light bg-opacity-75 p-4 shadow-lg rounded">
        <div className="row justify-content-center">
          <div className="col-md-12">
            <h2 className="text-center mb-1 login-title">Change Your Password</h2>
            <p className="text-center text-muted mb-4 password-change-subtitle">
              You must change your default password before continuing
            </p>

            <div className="login-error-container mb-3">
              {error && (
                <div className="alert alert-danger py-2 fade show" role="alert">{error}</div>
              )}
            </div>

            <form onSubmit={handleSubmit} className="login-form">
              {/* Hidden username field for accessibility */}
              <input
                type="text"
                name="username"
                value={getCurrentUserEmail()}
                autoComplete="username"
                style={{ display: 'none' }}
                readOnly
                tabIndex="-1"
                aria-hidden="true"
              />
              
              <div className="mb-3">
                <label htmlFor="currentPassword" className="form-label login-label">Current Password</label>
                <div className="input-group">
                  <input
                    type={showPasswords.current ? "text" : "password"}
                    className="form-control login-input"
                    id="currentPassword"
                    name="currentPassword"
                    placeholder="Enter your current password"
                    value={formData.currentPassword}
                    onChange={handleInputChange}
                    required
                    disabled={isLoading}
                    autoComplete="current-password"
                  />
                  <span 
                    className="input-group-text login-input-group-text" 
                    onClick={() => togglePasswordVisibility('current')} 
                    style={{ cursor: 'pointer' }}
                  >
                    <i className={showPasswords.current ? 'bi bi-eye-slash' : 'bi bi-eye'}></i>
                  </span>
                </div>
              </div>

              <div className="mb-3">
                <label htmlFor="newPassword" className="form-label login-label">New Password</label>
                <div className="input-group">
                  <input
                    type={showPasswords.new ? "text" : "password"}
                    className="form-control login-input"
                    id="newPassword"
                    name="newPassword"
                    placeholder="Enter your new password"
                    value={formData.newPassword}
                    onChange={handleInputChange}
                    required
                    disabled={isLoading}
                    minLength="8"
                    autoComplete="new-password"
                  />
                  <span 
                    className="input-group-text login-input-group-text" 
                    onClick={() => togglePasswordVisibility('new')} 
                    style={{ cursor: 'pointer' }}
                  >
                    <i className={showPasswords.new ? 'bi bi-eye-slash' : 'bi bi-eye'}></i>
                  </span>
                </div>
              </div>

              <div className="mb-4">
                <label htmlFor="confirmPassword" className="form-label login-label">Confirm New Password</label>
                <div className="input-group">
                  <input
                    type={showPasswords.confirm ? "text" : "password"}
                    className="form-control login-input"
                    id="confirmPassword"
                    name="confirmPassword"
                    placeholder="Confirm your new password"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    required
                    disabled={isLoading}
                    minLength="8"
                    autoComplete="new-password"
                  />
                  <span 
                    className="input-group-text login-input-group-text" 
                    onClick={() => togglePasswordVisibility('confirm')} 
                    style={{ cursor: 'pointer' }}
                  >
                    <i className={showPasswords.confirm ? 'bi bi-eye-slash' : 'bi bi-eye'}></i>
                  </span>
                </div>
              </div>

              <button 
                type="submit" 
                className="btn btn-success w-100 login-button mb-3" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Changing Password...
                  </>
                ) : (
                  'Change Password'
                )}
              </button>

              <button 
                type="button" 
                className="btn btn-outline-secondary w-100" 
                onClick={handleBackToLogin}
                disabled={isLoading}
              >
                Back to Login
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForcePasswordChange;
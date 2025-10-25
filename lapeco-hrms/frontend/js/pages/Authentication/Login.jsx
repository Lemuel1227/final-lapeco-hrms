import React, { useState, useEffect, useRef } from 'react';
import './Login.css';
import ForgotPasswordModal from '../../modals/ForgotPasswordModal';
import { authAPI } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import logo from '../../assets/logo.png';

const Login = ({ onLoginSuccess, onSendCode, onVerifyCode, onResetPassword }) => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [login, setLogin] = useState(''); // Changed from email to login to accept both username and email
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [lockoutEndTime, setLockoutEndTime] = useState(null);
  const [remainingTime, setRemainingTime] = useState(0);
  const countdownInterval = useRef(null);

  const [modalStep, setModalStep] = useState(0);
  const [resetEmail, setResetEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Cleanup countdown on unmount
  useEffect(() => {
    return () => {
      if (countdownInterval.current) {
        clearInterval(countdownInterval.current);
      }
    };
  }, []);

  // Start countdown when lockout is set
  useEffect(() => {
    if (lockoutEndTime) {
      const updateCountdown = () => {
        const now = new Date().getTime();
        const timeLeft = Math.max(0, lockoutEndTime - now);
        
        if (timeLeft <= 0) {
          setLockoutEndTime(null);
          setRemainingTime(0);
          setError('');
          if (countdownInterval.current) {
            clearInterval(countdownInterval.current);
            countdownInterval.current = null;
          }
        } else {
          setRemainingTime(timeLeft);
        }
      };

      updateCountdown(); // Initial update
      countdownInterval.current = setInterval(updateCountdown, 1000);

      return () => {
        if (countdownInterval.current) {
          clearInterval(countdownInterval.current);
          countdownInterval.current = null;
        }
      };
    }
  }, [lockoutEndTime]);

  const formatTime = (milliseconds) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const parseLockoutMessage = (message) => {
    // Extract seconds from message like "Your account is temporarily locked. Please try again after 13.093784 seconds."
    const match = message.match(/after\s+([\d.]+)\s+seconds/);
    if (match) {
      const seconds = Math.ceil(parseFloat(match[1])); // Round up to nearest second
      const endTime = new Date().getTime() + (seconds * 1000);
      setLockoutEndTime(endTime);
      return `Your account is temporarily locked. Please try again after ${formatTime(seconds * 1000)}.`;
    }
    return message;
  };

  const togglePasswordVisibility = () => setShowPassword(!showPassword);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      const response = await authAPI.login({ login, password });
      
      // Store token and user data in localStorage
      localStorage.setItem('auth_token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      localStorage.setItem('currentUserId', response.data.user.id);
      
      if (onLoginSuccess) {
        onLoginSuccess(response.data.user.id);
      } else {
        // Navigate directly if no callback provided
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Login error:', error);
      
      // Improved error handling to show specific backend messages
      if (!error.response) {
        // Network error or server not available
        setError('Unable to connect to the server. Please try again later.');
      } else if (error.response.status === 422) {
        // Validation error - extract specific message from backend
        const errorData = error.response.data;
        if (errorData.errors && errorData.errors.email && errorData.errors.email[0]) {
          const errorMessage = errorData.errors.email[0];
          // Check if it's a lockout message
          if (errorMessage.includes('temporarily locked') && errorMessage.includes('seconds')) {
            const formattedMessage = parseLockoutMessage(errorMessage);
            setError(formattedMessage);
          } else {
            setError(errorMessage);
          }
        } else if (errorData.message) {
          setError(errorData.message);
        } else {
          setError('Invalid email or password. Please try again.');
        }
      } else if (error.response.status === 401) {
        // Authentication error (invalid credentials)
        setError('Invalid email or password. Please try again.');
      } else if (error.response.status >= 500) {
        // Server error
        setError('Server error. Please try again later or contact support.');
      } else {
        // Other errors
        setError('An error occurred. Please try again later.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseModals = () => {
    setModalStep(0);
    setResetEmail('');
    setIsLoading(false);
  };
  
  const handleSendCode = (email) => {
    setIsLoading(true);
    const result = onSendCode(email);
    if (result.success) {
      setResetEmail(email);
      setModalStep(2);
    } else {
      alert(result.message); 
    }
    setIsLoading(false);
  };

  const handleVerifyCode = (code) => {
    const success = onVerifyCode(resetEmail, code);
    if (success) {
      setModalStep(3); 
      return true;
    }
    return false;
  };

  const handleResetPassword = (newPassword) => {
    const success = onResetPassword(resetEmail, newPassword);
    if (success) {
      alert("Password has been reset successfully! You can now log in with your new password.");
      handleCloseModals();
    } else {
      alert("An error occurred. Please try again or contact HR.");
    }
  };

  return (
    <>
      <div className="vh-100 d-flex flex-column justify-content-center align-items-center bg-container login-page-wrapper">
        <div className="logo-container text-center mb-4">
          <img src={logo} alt="Lapeco Logo" className="login-page-logo img-fluid" />
        </div>

        <div className="login-card bg-light bg-opacity-75 p-4 shadow-lg rounded">
          <div className="row justify-content-center">
            <div className="col-md-12">
              <h2 className="text-center mb-1 login-title">Login</h2>

              <div className="login-error-container mb-3">
                {error && (
                  <div className="alert alert-danger py-2 fade show" role="alert">
                    {lockoutEndTime && remainingTime > 0 
                      ? `Your account is temporarily locked. Please try again after ${formatTime(remainingTime)}.`
                      : error
                    }
                  </div>
                )}
              </div>

              <form onSubmit={handleSubmit} className="login-form">
                <div className="mb-3">
                  <label htmlFor="login" className="form-label login-label">Username or Email</label>
                  <input type="text" name="login" className="form-control login-input" id="login" placeholder="Email or Username" value={login} onChange={(e) => setLogin(e.target.value)} required autoComplete="username" />
                </div>
                <div className="mb-3">
                  <label htmlFor="password" className="form-label login-label">Password</label>
                  <div className="input-group">
                    <input type={showPassword ? 'text' : 'password'} name="password" className="form-control login-input" id="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
                    <span className="input-group-text login-input-group-text" onClick={togglePasswordVisibility} style={{ cursor: 'pointer' }}>
                      <i className={showPassword ? 'bi bi-eye-slash' : 'bi bi-eye'}></i>
                    </span>
                  </div>
                </div>
                <div className="d-flex justify-content-end mb-4">
                  <a href="#" className="text-success text-decoration-none login-forgot-password" onClick={(e) => { e.preventDefault(); setModalStep(1); }}>
                    Forgot Password?
                  </a>
                </div>
                <button type="submit" className="btn btn-success w-100 login-button" disabled={isLoading}>
                  {isLoading ? 'Logging in...' : 'Login'}
                </button>
              </form>
              
              {/* Sample users info removed for production */}
            </div>
          </div>
        </div>
      </div>

      <ForgotPasswordModal
        show={modalStep === 1}
        onClose={handleCloseModals}
        onSendCode={handleSendCode}
        isLoading={isLoading}
      />
    </>
  );
};

export default Login;
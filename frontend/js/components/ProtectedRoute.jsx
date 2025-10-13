import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { authAPI } from '../services/api';

const ProtectedRoute = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(null); // null = loading, true/false = result
  const [needsPasswordChange, setNeedsPasswordChange] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = async () => {
    try {
      // Check if token exists in localStorage
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      // Verify token with backend
      const response = await authAPI.getUser();
      if (response.data) {
        setIsAuthenticated(true);
        // Check if user needs to change password
        const passwordChanged = response.data.password_changed;
        setNeedsPasswordChange(!passwordChanged);
        
        // Update user data in localStorage if needed
        localStorage.setItem('user', JSON.stringify(response.data));
      } else {
        setIsAuthenticated(false);
        // Clear invalid token
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
      }
    } catch (error) {
      setIsAuthenticated(false);
      // Clear invalid token
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Redirect to password change if user needs to change password
  // But allow users to go back to login from force password change page
  if (needsPasswordChange && location.pathname !== '/force-password-change') {
    return <Navigate to="/force-password-change" replace />;
  }

  // If user is on force password change page but doesn't need password change anymore
  // (e.g., they logged out and back in), redirect to dashboard
  if (!needsPasswordChange && location.pathname === '/force-password-change') {
    return <Navigate to="/dashboard" replace />;
  }

  // Render protected content if authenticated and password is changed
  return children;
};

export default ProtectedRoute;
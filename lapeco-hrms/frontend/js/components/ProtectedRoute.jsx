import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { authAPI } from '../services/api';
import { ROLE_ALLOWED_ROUTES, USER_ROLES } from '../constants/roles';

const ProtectedRoute = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(null); // null = loading, true/false = result
  const [needsPasswordChange, setNeedsPasswordChange] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const location = useLocation();

  useEffect(() => {
    checkAuthentication();
  }, []);

  useEffect(() => {
    // Hydrate role from local storage while awaiting fresh auth check
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        const resolvedRole = resolveUserRole(parsed);
        if (resolvedRole) {
          setUserRole(resolvedRole);
        }
      }
    } catch {
      /* noop */
    }
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

        const resolvedRole = resolveUserRole(response.data);
        setUserRole(resolvedRole);
      } else {
        setIsAuthenticated(false);
        // Clear invalid token
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        setUserRole(null);
      }
    } catch (error) {
      setIsAuthenticated(false);
      // Clear invalid token
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      setUserRole(null);
    } finally {
      setIsLoading(false);
    }
  };

  const resolveUserRole = (user) => {
    if (!user) return null;
    const rawRole = user.role || user.user_role || user.userRole;
    if (!rawRole || typeof rawRole !== 'string') return null;
    const normalized = rawRole.toUpperCase();
    return USER_ROLES[normalized] ? normalized : normalized;
  };

  const isRouteAllowedForRole = (role, path) => {
    if (!role || !path) return false;
    const allowedRoutes = ROLE_ALLOWED_ROUTES[role] || [];
    return allowedRoutes.some((route) => {
      if (!route) return false;
      if (route === '/dashboard') {
        return path === '/dashboard';
      }

      if (route === '/') {
        return path === '/';
      }

      if (path === route) {
        return true;
      }

      return path.startsWith(`${route}/`);
    });
  };

  const getDefaultRouteForRole = (role) => {
    const allowedRoutes = ROLE_ALLOWED_ROUTES[role];
    if (Array.isArray(allowedRoutes) && allowedRoutes.length > 0) {
      // Prefer dashboard when available, otherwise first allowed route
      const dashboardRoute = allowedRoutes.find((r) => r === '/dashboard');
      return dashboardRoute || allowedRoutes[0];
    }
    return '/dashboard';
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

  if (
    isAuthenticated &&
    userRole &&
    location.pathname !== '/force-password-change' &&
    !isRouteAllowedForRole(userRole, location.pathname)
  ) {
    return <Navigate to={getDefaultRouteForRole(userRole)} replace />;
  }

  // Render protected content if authenticated and password is changed
  return children;
};

export default ProtectedRoute;
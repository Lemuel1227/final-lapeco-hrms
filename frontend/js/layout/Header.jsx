import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './Header.css';
import placeholderAvatar from '../assets/placeholder-profile.jpg';
import NotificationDropdown from './NotificationDropdown';
import ThemeToggle from './ThemeToggle'; 
import { authAPI } from '@/services/api';

const Header = ({ currentUser, notifications, appLevelHandlers, theme, isMobileView, onToggleMobileSidebar }) => {
  const router = useNavigate();

  const handleLogout = async (e) => {
    e.preventDefault();
    try {
      await authAPI.logout();
    } catch {}
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    router('/login');
  };

  const formatRole = (role) => {
    const roleMap = {
      'HR_PERSONNEL': 'HR Personnel',
      'TEAM_LEADER': 'Team Leader',
      'REGULAR_EMPLOYEE': 'Employee'
    };
    return roleMap[role] || role;
  };

  const avatarSrc = currentUser?.image_url || placeholderAvatar;
  const displayName = currentUser?.name || '—';
  const displayRole = formatRole(currentUser?.role) || '';
  const displayEmployeeId = currentUser?.id || '';

  return (
    <header className="app-header">
      <div className="header-left">
        {isMobileView && (
          <button 
            className="btn btn-link sidebar-toggle-mobile"
            onClick={onToggleMobileSidebar}
          >
            <i className="bi bi-list"></i>
          </button>
        )}
      </div>
      <div className="header-right">
        <ThemeToggle theme={theme} onToggle={appLevelHandlers.toggleTheme} />

        <NotificationDropdown notifications={notifications} handlers={appLevelHandlers} currentUser={currentUser} />
        <div className="dropdown user-profile-menu">
          <div 
            className="user-info-wrapper"
            data-bs-toggle="dropdown" 
            aria-expanded="false"
          >
            <img 
              src={avatarSrc}
              alt="User Avatar" 
              className="user-avatar" 
              onError={(e) => { e.target.onerror = null; e.target.src=placeholderAvatar; }}
            />
            <div className="user-text-info">
              <span className="user-name">{displayName}</span>
              <span className="user-position">{displayRole}</span>
            </div>
            <i className="bi bi-chevron-down dropdown-caret"></i>
          </div>
          <ul className="dropdown-menu dropdown-menu-end" aria-labelledby="profileDropdown">
            <li className="dropdown-header-custom">
              <h6 className="mb-0">{displayName}</h6>
              <div className="text-muted small">ID: {displayEmployeeId}</div>
            </li>
            <li><hr className="dropdown-divider" /></li>
            <li><Link className="dropdown-item" to="/dashboard/my-profile"><i className="bi bi-person-fill me-2"></i> My Profile</Link></li>
            <li><Link className="dropdown-item" to="/dashboard/account-settings"><i className="bi bi-gear-fill me-2"></i> Settings</Link></li>
            <li><hr className="dropdown-divider" /></li>
            <li>
              <button className="dropdown-item text-danger" onClick={handleLogout}>
                <i className="bi bi-box-arrow-right me-2"></i> Logout
              </button>
            </li>
          </ul>
        </div>
      </div>
    </header>
  );
};

export default Header;
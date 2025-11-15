import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import './AccountSettingsPage.css';
import { USER_ROLES } from '../../constants/roles';
import ChangePassword from './ChangePassword';
import EmailVerification from './EmailVerification';
import ThemeSettings from './ThemeSettings';
import LoginActivity from './LoginActivity';
import ActivityLogs from './ActivityLogs';
import DataManagementSettings from './DataManagementSettings';

const AccountSettingsPage = () => {
  const context = useOutletContext() || {};
  const { handlers = {}, theme = 'light' } = context;
  const [activeSection, setActiveSection] = useState('changePassword');
  
  // Fallback handlers if not provided through context
  const fallbackHandlers = {
    toggleTheme: () => {
      console.warn('toggleTheme handler not available');
      alert('Theme toggle is not available. Please refresh the page.');
    },
    resetSelectedData: () => {
      console.warn('resetSelectedData handler not available');
    }
  };
  
  const safeHandlers = { ...fallbackHandlers, ...handlers };
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  
  const userRole = currentUser?.role || 'HR_PERSONNEL';

  const isHrUser = userRole === USER_ROLES.HR_PERSONNEL;

  const sections = {
    personal: [
      { key: 'changePassword', label: 'Change Password', icon: 'bi-key-fill' },
      { key: 'emailVerification', label: 'Email Verification', icon: 'bi-envelope-check-fill' },
      { key: 'theme', label: 'Theme & Appearance', icon: 'bi-palette-fill' },
      { key: 'loginActivity', label: 'Login Activity', icon: 'bi-shield-check' },
      { key: 'activityLogs', label: 'Activity Logs', icon: 'bi-activity' },
    ],
    admin: [
      { key: 'dataManagement', label: 'Data Management', icon: 'bi-database-fill-x' },
    ]
  };

    return (
      <div className="container-fluid p-0 page-module-container">
        <header className="page-header mb-4">
          <h1 className="page-main-title">Account Settings</h1>
        </header>
        <div className="account-settings-grid">
          <nav className="settings-nav">
            <div className="nav-heading">Personal Settings</div>
            {sections.personal.map(sec => (
              <button key={sec.key} className={`nav-link ${activeSection === sec.key ? 'active' : ''}`} onClick={() => setActiveSection(sec.key)}>
                <i className={sec.icon}></i> {sec.label}
              </button>
            ))}
            
            {isHrUser && (
              <>
                <div className="nav-heading">Admin Tools</div>
                {sections.admin.map(sec => (
                  <button key={sec.key} className={`nav-link ${activeSection === sec.key ? 'active' : ''}`} onClick={() => setActiveSection(sec.key)}>
                    <i className={sec.icon}></i> {sec.label}
                  </button>
                ))}
              </>
            )}
          </nav>
          <div className="settings-content">
              {activeSection === 'changePassword' && <ChangePassword currentUser={currentUser} handlers={safeHandlers} />}
              {activeSection === 'emailVerification' && <EmailVerification currentUser={currentUser} />}
              {activeSection === 'theme' && <ThemeSettings theme={theme} onToggleTheme={safeHandlers.toggleTheme} />}
              {activeSection === 'loginActivity' && <LoginActivity />}
              {activeSection === 'activityLogs' && <ActivityLogs />}

              {isHrUser && activeSection === 'dataManagement' && <DataManagementSettings onReset={safeHandlers.resetSelectedData} />}
          </div>
        </div>
      </div>
    );
  };

export default AccountSettingsPage;

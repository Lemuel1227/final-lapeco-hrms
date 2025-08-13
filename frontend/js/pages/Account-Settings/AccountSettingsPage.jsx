import React, { useState, useEffect } from 'react';
import './AccountSettingsPage.css';
import ChangePassword from './ChangePassword';
import NotificationSettings from './NotificationSettings';
import SecurityPolicies from './SecurityPolicies';
import ThemeSettings from './ThemeSettings';
import LoginActivity from './LoginActivity';
import { USER_ROLES } from '../../constants/roles';
import { useTheme } from '../../contexts/ThemeContext';

const AccountSettingsPage = () => {
    const { theme, toggleTheme } = useTheme();
    const [activeSection, setActiveSection] = useState('password');
    const [currentUser, setCurrentUser] = useState(null);
    const [userRole, setUserRole] = useState('HR_PERSONNEL');

    useEffect(() => {
        // Initialize from localStorage
        try {
            const stored = localStorage.getItem('user');
            if (stored) {
                const parsed = JSON.parse(stored);
                setCurrentUser(parsed);
                if (parsed?.role) setUserRole(parsed.role);
            }
        } catch {}
    }, []);

    const handlers = {
        toggleTheme
    };

    const isHrUser = userRole === USER_ROLES.HR_PERSONNEL;

    const renderSection = () => {
        switch (activeSection) {
            case 'password':
                return <ChangePassword currentUser={currentUser} handlers={handlers} />;
            case 'notifications':
                return <NotificationSettings />;
            case 'appearance':
                return <ThemeSettings currentTheme={theme} onToggleTheme={toggleTheme} />;
            case 'activity':
                return <LoginActivity />;
            case 'security':
                return isHrUser ? <SecurityPolicies /> : null; 
            default:
                return <ChangePassword currentUser={currentUser} handlers={handlers} />;
        }
    };

    return (
        <div className="container-fluid p-0 page-module-container">
            <header className="page-header mb-4">
                <h1 className="page-main-title">Settings</h1>
                <p className="text-muted">Manage your personal preferences and system settings.</p>
            </header>

            <div className="account-settings-grid">
                <nav className="settings-nav">
                    <h6 className="nav-heading">Personal Settings</h6>
                    <button className={`nav-link ${activeSection === 'password' ? 'active' : ''}`} onClick={() => setActiveSection('password')}>
                        <i className="bi bi-key-fill"></i><span>Password</span>
                    </button>
                    <button className={`nav-link ${activeSection === 'notifications' ? 'active' : ''}`} onClick={() => setActiveSection('notifications')}>
                        <i className="bi bi-bell-fill"></i><span>Notifications</span>
                    </button>
                    <button className={`nav-link ${activeSection === 'appearance' ? 'active' : ''}`} onClick={() => setActiveSection('appearance')}>
                        <i className="bi bi-palette-fill"></i><span>Appearance</span>
                    </button>
                    <button className={`nav-link ${activeSection === 'activity' ? 'active' : ''}`} onClick={() => setActiveSection('activity')}>
                        <i className="bi bi-clock-history"></i><span>Login Activity</span>
                    </button>
                    
                    {isHrUser && (
                        <>
                            <hr className="my-2"/>
                            <h6 className="nav-heading">Admin</h6>
                            <button className={`nav-link ${activeSection === 'security' ? 'active' : ''}`} onClick={() => setActiveSection('security')}>
                                <i className="bi bi-shield-lock-fill"></i><span>Security Policies</span>
                            </button>
                        </>
                    )}
                </nav>

                <div className="settings-content">
                    {renderSection()}
                </div>
            </div>
        </div>
    );
};

export default AccountSettingsPage;
import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import SideBar from './SideBar';
import Header from './Header';
import './Layout.css';
import { useTheme } from '../contexts/ThemeContext';

const Layout = ({ onLogout = () => {}, userRole: userRoleProp, currentUser: currentUserProp, notifications = [], children }) => {
  const { theme, toggleTheme } = useTheme();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [currentUser, setCurrentUser] = useState(currentUserProp || null);
  const [userRole, setUserRole] = useState(userRoleProp || 'HR_PERSONNEL');

  useEffect(() => {
    // Initialize from localStorage if not provided via props
    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        const parsed = JSON.parse(stored);
        setCurrentUser(parsed);
        if (parsed?.role) setUserRole(parsed.role);
      }
    } catch {}
  }, []);

  useEffect(() => {
    // If props change, prefer them
    if (currentUserProp) setCurrentUser(currentUserProp);
    if (userRoleProp) setUserRole(userRoleProp);
  }, [currentUserProp, userRoleProp]);

  const handleToggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const appLevelHandlers = {
    toggleTheme
  };

  return (
    <div className="app-layout">
      <SideBar 
        userRole={userRole} 
        isCollapsed={isSidebarCollapsed} 
      />
      <button
        className={`sidebar-toggle-button ${isSidebarCollapsed ? 'collapsed' : ''}`}
        onClick={handleToggleSidebar}
        title={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
      >
        <i className={`bi ${isSidebarCollapsed ? 'bi-chevron-double-right' : 'bi-chevron-double-left'}`}></i>
      </button>
      <div className={`content-wrapper ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <Header 
          onLogout={onLogout} 
          currentUser={currentUser || {}}
          notifications={notifications}
          appLevelHandlers={appLevelHandlers}
          theme={theme}
        />
        <main className="page-content">
          <Outlet />
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
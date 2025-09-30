import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import SideBar from './SideBar';
import Header from './Header';
import './Layout.css';
import { useTheme } from '../contexts/ThemeContext';

const MOBILE_BREAKPOINT = 992;

const Layout = ({ onLogout = () => {}, userRole: userRoleProp, currentUser: currentUserProp, notifications = [], children }) => {
  const [isMobileSidebarVisible, setIsMobileSidebarVisible] = useState(false);
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < MOBILE_BREAKPOINT);
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

  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth < MOBILE_BREAKPOINT;
      setIsMobileView(isMobile);
      if (!isMobile) {
        setIsMobileSidebarVisible(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleToggleDesktopSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const handleToggleMobileSidebar = () => {
    setIsMobileSidebarVisible(!isMobileSidebarVisible);
  };

  return (
    <div className={`app-layout ${isMobileSidebarVisible ? 'mobile-sidebar-active' : ''}`}>
      <SideBar 
        userRole={userRole} 
        isCollapsed={isSidebarCollapsed && !isMobileView} 
        isMobileVisible={isMobileSidebarVisible}
        onMobileNavItemClick={handleToggleMobileSidebar}
      />
      {isMobileView && isMobileSidebarVisible && (
        <div className="app-overlay" onClick={handleToggleMobileSidebar}></div>
      )}

      {!isMobileView && (
        <button
          className={`sidebar-toggle-button ${isSidebarCollapsed ? 'collapsed' : ''}`}
          onClick={handleToggleDesktopSidebar}
          title={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          <i className={`bi ${isSidebarCollapsed ? 'bi-chevron-double-right' : 'bi-chevron-double-left'}`}></i>
        </button>
      )}

      <div className={`content-wrapper ${isSidebarCollapsed && !isMobileView ? 'sidebar-collapsed' : ''}`}>
        <Header 
          onLogout={onLogout} 
          currentUser={currentUser || {}}
          notifications={notifications}
          appLevelHandlers={appLevelHandlers}
          theme={theme}
          isMobileView={isMobileView}
          onToggleMobileSidebar={handleToggleMobileSidebar}
        />
        <main className="page-content">
          <Outlet context={{ handlers: appLevelHandlers, theme }} />
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
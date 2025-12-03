import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import SideBar from './SideBar';
import Header from './Header';
import './Layout.css';
import { useTheme } from '../contexts/ThemeContext';
import { notificationAPI } from '../services/api';

const MOBILE_BREAKPOINT = 992;
const NOTIFICATION_POLL_INTERVAL = 30000; // 30 seconds

const Layout = ({ onLogout = () => {}, userRole: userRoleProp, currentUser: currentUserProp, notifications: notificationsProp = [], children }) => {
  const [isMobileSidebarVisible, setIsMobileSidebarVisible] = useState(false);
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < MOBILE_BREAKPOINT);
  const { theme, toggleTheme } = useTheme();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [currentUser, setCurrentUser] = useState(currentUserProp || null);
  const [userRole, setUserRole] = useState(userRoleProp || 'SUPER_ADMIN');
  const [notifications, setNotifications] = useState(notificationsProp);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);

  useEffect(() => {
    // Initialize from localStorage if not provided via props
    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        const parsed = JSON.parse(stored);
        setCurrentUser(parsed);
        if (parsed?.role) {
          const r = String(parsed.role).toUpperCase();
          const aliases = { HR_PERSONNEL: 'SUPER_ADMIN', EMPLOYEE: 'REGULAR_EMPLOYEE' };
          setUserRole(aliases[r] || r);
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    // If props change, prefer them
    if (currentUserProp) setCurrentUser(currentUserProp);
    if (userRoleProp) setUserRole(userRoleProp);
  }, [currentUserProp, userRoleProp]);

  // Fetch notifications from API
  const fetchNotifications = async () => {
    try {
      setIsLoadingNotifications(true);
      const response = await notificationAPI.getAll();
      if (response.data && response.data.data) {
        // Transform backend notification format to frontend format
        const transformedNotifications = response.data.data.map(notification => ({
          id: notification.id,
          type: notification.type || 'system_update',
          message: notification.message,
          timestamp: notification.created_at,
          read: !!notification.read_at,
          title: notification.title,
          data: notification.data || null
        }));
        setNotifications(transformedNotifications);
      }
    } catch (error) {
      console.error('🔔 Failed to fetch notifications:', error);
    } finally {
      setIsLoadingNotifications(false);
    }
  };

  // Mark notification as read
  const markNotificationAsRead = async (notificationId) => {
    try {
      await notificationAPI.markAsRead(notificationId);
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, read: true }
            : notification
        )
      );
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  // Mark all notifications as read
  const markAllNotificationsAsRead = async () => {
    try {
      await notificationAPI.markAllAsRead();
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, read: true }))
      );
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  // Clear all notifications
  const clearAllNotifications = async () => {
    try {
      // Delete all notifications from backend
      const deletePromises = notifications.map(notification => 
        notificationAPI.delete(notification.id)
      );
      await Promise.all(deletePromises);
      setNotifications([]);
    } catch (error) {
      console.error('Failed to clear all notifications:', error);
    }
  };

  // Initial fetch and polling setup
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) return;

    // Initial fetch
    fetchNotifications();

    // Set up polling for new notifications
    const pollInterval = setInterval(fetchNotifications, NOTIFICATION_POLL_INTERVAL);

    return () => clearInterval(pollInterval);
  }, []);

  const handleToggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const appLevelHandlers = {
    toggleTheme,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    clearAllNotifications
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
        currentUser={currentUser || {}}
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

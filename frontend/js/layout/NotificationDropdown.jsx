import React from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import NotificationItem from './NotificationItem';

const groupNotifications = (notifications) => {
  if (!notifications || notifications.length === 0) {
    return [];
  }

  const groups = {
    Today: [],
    Yesterday: [],
    Older: [],
  };

  notifications.forEach(notification => {
    const notificationDate = new Date(notification.timestamp);
    if (isToday(notificationDate)) {
      groups.Today.push(notification);
    } else if (isYesterday(notificationDate)) {
      groups.Yesterday.push(notification);
    } else {
      groups.Older.push(notification);
    }
  });

  return Object.entries(groups)
    .map(([title, items]) => ({ title, items }))
    .filter(group => group.items.length > 0);
};


const NotificationDropdown = ({ notifications = [], handlers }) => {
  const unreadCount = notifications.filter(n => !n.read).length;
  const groupedNotifications = groupNotifications(notifications);

  return (
    <div className="dropdown notification-menu">
      <button 
        className="btn btn-link me-2 position-relative notification-btn"
        data-bs-toggle="dropdown" 
        aria-expanded="false"
        onClick={(e) => e.stopPropagation()} 
      >
        <i className="bi bi-bell-fill fs-5"></i>
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      <div className="dropdown-menu dropdown-menu-end notification-dropdown-pane" onClick={(e) => e.stopPropagation()}>
        <div className="notification-dropdown-header">
          <h6 className="mb-0">Notifications</h6>
          {unreadCount > 0 && (
            <button className="btn btn-sm btn-link py-0" onClick={handlers.markAllNotificationsAsRead}>
              Mark all as read
            </button>
          )}
        </div>
        
        <div className="notification-list-container">
          {groupedNotifications.length > 0 ? (
            groupedNotifications.map(group => (
              <div key={group.title} className="notification-group">
                <h7 className="notification-group-title">{group.title}</h7>
                <ul className="notification-list">
                  {group.items.map(n => (
                    <NotificationItem 
                      key={n.id} 
                      notification={n} 
                      onMarkAsRead={handlers.markNotificationAsRead}
                    />
                  ))}
                </ul>
              </div>
            ))
          ) : (
            <div className="notification-empty-state">
              <i className="bi bi-check2-circle"></i>
              <p>You're all caught up!</p>
              <small>No new notifications right now.</small>
            </div>
          )}
        </div>

        {notifications.length > 0 && (
            <div className="notification-dropdown-footer">
                <button className="btn btn-sm btn-light w-100" onClick={handlers.clearAllNotifications}>
                    Clear All Notifications
                </button>
            </div>
        )}
      </div>
    </div>
  );
};

export default NotificationDropdown;
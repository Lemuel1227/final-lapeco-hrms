import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

const NotificationItem = ({ notification, onMarkAsRead, currentUser }) => {
  const navigate = useNavigate();
  
  const getIconForType = (type) => {
    switch (type) {
      case 'leave_request':
        return { icon: 'bi-calendar-event-fill', color: 'text-info' };
      case 'leave_status_update':
        // Use different colors based on the status in notification data
        if (notification.data?.status === 'Declined') {
          return { icon: 'bi-calendar-x-fill', color: 'text-danger' };
        }
        return { icon: 'bi-calendar-check-fill', color: 'text-success' };
      case 'holiday_reminder':
        return { icon: 'bi-flag-fill', color: 'text-warning' };
      case 'payroll_generated':
        return { icon: 'bi-cash-stack', color: 'text-success' };
      case 'performance_review':
        return { icon: 'bi-clipboard-check-fill', color: 'text-warning' };
      case 'recruitment':
        return { icon: 'bi-person-plus-fill', color: 'text-success' };
      case 'system_update':
        return { icon: 'bi-info-circle-fill', color: 'text-primary' };
      case 'training':
        return { icon: 'bi-mortarboard-fill', color: 'text-secondary' };
      default:
        return { icon: 'bi-bell-fill', color: 'text-muted' };
    }
  };

  const { icon, color } = getIconForType(notification.type);
  const timeAgo = formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true });

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Mark as read if unread
    if (!notification.read) {
      onMarkAsRead(notification.id);
    }
    
    // Navigate based on notification type and data
    if (notification.type === 'leave_request') {
      navigate('/dashboard/leave-management');
    } else if (notification.type === 'leave_status_update') {
      navigate('/dashboard/my-leave');
    } else if (notification.type === 'holiday_reminder') {
      // HR goes to Holiday Management, others go to My Attendance
      if (currentUser?.role === 'HR_PERSONNEL') {
        navigate('/dashboard/holiday-management');
      } else {
        navigate('/dashboard/my-attendance');
      }
    } else if (notification.data?.action_url) {
      navigate(notification.data.action_url);
    }
    
    // Close the dropdown by clicking outside
    setTimeout(() => {
      document.body.click();
    }, 100);
  };

  return (
    <li className={`notification-item ${notification.read ? 'read' : 'unread'}`}>
      <a href="#" className="notification-link" onClick={handleClick}>
        <div className="notification-icon">
          <i className={`bi ${icon} ${color}`}></i>
        </div>
        <div className="notification-content">
          <p className="notification-message">{notification.message}</p>
          <span className="notification-timestamp">{timeAgo}</span>
        </div>
        {!notification.read && <div className="unread-dot" title="Mark as read"></div>}
      </a>
    </li>
  );
};

export default NotificationItem;

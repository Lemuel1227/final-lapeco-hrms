import React, { useEffect } from 'react';
import './ToastNotification.css';

const ToastNotification = ({ message, type = 'success', onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4000); // Auto-dismiss after 4 seconds

    return () => clearTimeout(timer);
  }, [onClose]);

  const iconMap = {
    success: 'bi-check-circle-fill',
    error: 'bi-x-circle-fill',
    warning: 'bi-exclamation-triangle-fill',
    info: 'bi-info-circle-fill',
  };

  const titleMap = {
    success: 'Success',
    error: 'Error',
    warning: 'Warning',
    info: 'Information',
  };

  return (
    <div className={`toast-notification show toast-${type}`}>
      <div className="toast-icon">
        <i className={`bi ${iconMap[type]}`}></i>
      </div>
      <div className="toast-content">
        <div className="toast-title">{titleMap[type]}</div>
        <div className="toast-message" style={{ whiteSpace: 'pre-line' }}>{message}</div>
      </div>
      <button className="toast-close-btn" onClick={onClose}>
        <i className="bi bi-x"></i>
      </button>
    </div>
  );
};

export default ToastNotification;
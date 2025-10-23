import React from 'react';
import placeholderAvatar from '../../assets/placeholder-profile.jpg';

const StatusListItem = ({ employee, status, onView }) => {
  const isPending = status === 'pending';
  
  // Handle different employee data structures
  const employeeName = employee.name || 
    (employee.employee ? 
      `${employee.employee.firstName} ${employee.employee.lastName}` : 
      (employee.firstName && employee.lastName ? 
        `${employee.firstName} ${employee.lastName}` : 
        'Unknown Employee'));
  
  const profilePic = employee.profilePictureUrl || 
    employee.imageUrl || 
    employee.employee?.profilePictureUrl || 
    placeholderAvatar;

  return (
    <li className="status-list-item">
      <div className="status-indicator">
        {isPending ? (
          <i className="bi bi-clock-history text-warning" title="Pending"></i>
        ) : (
          <i className="bi bi-check-circle-fill text-success" title="Completed"></i>
        )}
      </div>
      <img 
        src={profilePic} 
        alt={employeeName} 
        className="rounded-circle"
        style={{ width: '32px', height: '32px', objectFit: 'cover' }}
      />
      <span className="employee-name">{employeeName}</span>
      {isPending ? null : (
        <button 
          className="btn btn-sm btn-outline-secondary view-btn"
          onClick={onView}
        >
          View
        </button>
      )}
    </li>
  );
};

export default StatusListItem;
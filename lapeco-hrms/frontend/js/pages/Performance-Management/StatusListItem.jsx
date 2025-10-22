import React from 'react';

const StatusListItem = ({ employee, status, onView }) => {
  const isPending = status === 'pending';
  
  // Handle different employee data structures
  const employeeName = employee.name || 
    (employee.employee ? 
      `${employee.employee.firstName} ${employee.employee.lastName}` : 
      (employee.firstName && employee.lastName ? 
        `${employee.firstName} ${employee.lastName}` : 
        'Unknown Employee'));
  
  const profilePic = employee.imageUrl || 
    (employee.employee?.profilePictureUrl || 
    employee.profilePictureUrl || 
    '/placeholder-profile.jpg');

  return (
    <li className="status-list-item">
      <div className="status-indicator">
        {isPending ? (
          <i className="bi bi-clock-history text-warning" title="Pending"></i>
        ) : (
          <i className="bi bi-check-circle-fill text-success" title="Completed"></i>
        )}
      </div>
      <img src={profilePic} alt={employeeName} size="sm" />
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
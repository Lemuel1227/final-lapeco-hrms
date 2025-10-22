import React from 'react';

const StatusListItem = ({ employee, status, onView }) => {
  const isPending = status === 'pending';

  return (
    <li className="status-list-item">
      <div className="status-indicator">
        {isPending ? (
          <i className="bi bi-clock-history text-warning" title="Pending"></i>
        ) : (
          <i className="bi bi-check-circle-fill text-success" title="Completed"></i>
        )}
      </div>
      <img src={employee.imageUrl} alt={employee.name} size="sm" />
      <span className="employee-name">{employee.name}</span>
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
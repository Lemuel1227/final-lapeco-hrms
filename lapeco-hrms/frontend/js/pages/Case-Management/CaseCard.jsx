import React from 'react';
import { format } from 'date-fns';
import placeholderAvatar from '../../assets/placeholder-profile.jpg';

const CaseCard = ({ caseInfo, employee, onView, onDelete }) => {
  const statusClass = caseInfo.status.toLowerCase();

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    onDelete(caseInfo);
  };

  return (
    <div className="case-card-revised" onClick={() => onView(caseInfo)}>
      <div className="case-card-revised-header">
        <div className="employee-info">
          <img src={employee?.imageUrl || placeholderAvatar} alt={employee?.name} className="avatar" />
          <div>
            <div className="name">{employee?.name || 'Unknown'}</div>
            <div className="id">{caseInfo.employeeId}</div>
          </div>
        </div>
 <div className="dropdown">
            <button className="btn btn-sm btn-light" type="button" data-bs-toggle="dropdown" onClick={(e) => e.stopPropagation()} aria-expanded="false">
                <i className="bi bi-three-dots-vertical"></i>
            </button>
            <ul className="dropdown-menu dropdown-menu-end">
                <li>
                    <a className="dropdown-item text-danger" href="#" onClick={handleDeleteClick}>
                        <i className="bi bi-trash-fill me-2"></i>Delete Case
                    </a>
                </li>
            </ul>
        </div>
      </div>

      <div className="case-card-revised-body">
        <div className="detail-row">
          <i className="bi bi-journal-text"></i>
          <span className="label">{caseInfo.reason}</span>
        </div>
        <div className="detail-row">
          <i className="bi bi-shield-exclamation"></i>
          <span className="label">{caseInfo.actionType}</span>
        </div>
        <div className="detail-row">
          <i className="bi bi-calendar-event"></i>
          <span className="text-muted">Incident on {format(new Date(caseInfo.issueDate), 'MMM dd, yyyy')}</span>
        </div>
      </div>
      <div className="case-card-revised-footer">
        <span className={`status-badge status-${statusClass}`}>{caseInfo.status}</span>
      </div>
    </div>
  );
};

export default CaseCard;
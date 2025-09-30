import React from 'react';
import { format } from 'date-fns';
import placeholderAvatar from '../../assets/placeholder-profile.jpg';

const CaseCard = ({ caseInfo, employee, onView }) => {
  const statusClass = caseInfo.status.toLowerCase();

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
        <span className={`status-badge status-${statusClass}`}>{caseInfo.status}</span>
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
    </div>
  );
};

export default CaseCard;
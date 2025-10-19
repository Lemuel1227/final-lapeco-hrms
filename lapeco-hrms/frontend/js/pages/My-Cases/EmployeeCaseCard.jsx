import React from 'react';
import { format } from 'date-fns';

const EmployeeCaseCard = ({ caseInfo, onView }) => {
    const statusClass = caseInfo.status.toLowerCase();

    return (
        <div className="employee-case-card" onClick={onView}>
            <div className="employee-case-card-header">
                <h5 className="case-reason">{caseInfo.reason}</h5>
                <span className={`status-badge status-${statusClass}`}>{caseInfo.status}</span>
            </div>
            <div className="employee-case-card-body">
                <div className="detail-item">
                    <i className="bi bi-shield-exclamation"></i>
                    <span className="label">{caseInfo.actionType}</span>
                </div>
                <div className="detail-item">
                    <i className="bi bi-calendar-event"></i>
                    <span className="text-muted">Incident on {format(new Date(caseInfo.issueDate + 'T00:00:00'), 'MMM dd, yyyy')}</span>
                </div>
            </div>
            <div className="employee-case-card-footer">
                <button className="btn btn-sm btn-outline-secondary" onClick={onView}>
                    View Details
                </button>
            </div>
        </div>
    );
};

export default EmployeeCaseCard;
import React from 'react';
import ActionsDropdown from '../../common/ActionsDropdown';

const PeriodCard = ({ period, evaluationsCount, totalTargetEvaluations, onEdit, onDelete, onViewResults }) => {

  const activationStart = period.activationStart || period.openDate || null;
  const activationEnd = period.activationEnd || period.closeDate || null;

  const statusMap = {
    active: { text: 'Active', className: 'active', icon: 'bi-broadcast-pin' },
    upcoming: { text: 'Upcoming', className: 'upcoming', icon: 'bi-calendar-event' },
    closed: { text: 'Closed', className: 'closed', icon: 'bi-archive-fill' },
  };

  const statusKey = (period.status || '').toLowerCase();
  const status = statusMap[statusKey] ?? { text: 'Unknown', className: 'closed', icon: 'bi-question-circle' };

  const completionPercentage = totalTargetEvaluations > 0 ? (evaluationsCount / totalTargetEvaluations) * 100 : 0;

  const getProgressBarClass = (percentage) => {
    if (percentage < 50) return 'bg-danger';
    if (percentage < 90) return 'bg-warning';
    return 'bg-success';
  };

  return (
    <div className={`period-card status-${status.className}`}>
      <div className="period-card-header">
        <h5 className="period-name">{period.name}</h5>
        <div className="period-actions">
          <ActionsDropdown>
            <a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); onViewResults(); }} disabled={evaluationsCount === 0}>
              <i className="bi bi-card-list me-2"></i>View Results
            </a>
            <a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); onEdit(); }}>
              <i className="bi bi-pencil-fill me-2"></i>Edit Period
            </a>
            <div className="dropdown-divider"></div>
            <a className="dropdown-item text-danger" href="#" onClick={(e) => { e.preventDefault(); onDelete(); }}>
              <i className="bi bi-trash-fill me-2"></i>Delete Period
            </a>
          </ActionsDropdown>
        </div>
      </div>
      <div className="period-card-body">
        <div className="period-detail">
          <i className="bi bi-calendar-range"></i>
          <div>
            <span className="detail-label d-block">Evaluating Period</span>
            <span>{period.evaluationStart} to {period.evaluationEnd}</span>
          </div>
        </div>
        <div className="period-detail">
          <i className="bi bi-calendar-check"></i>
          <div>
            <span className="detail-label d-block">Open for Submissions</span>
            <span>{activationStart || 'N/A'} to {activationEnd || 'N/A'}</span>
          </div>
        </div>
      </div>
      <div className="period-progress-section">
        <div className="progress-info">
          <span className="progress-label">Completion Progress</span>
          <span className="progress-value">{evaluationsCount} / {totalTargetEvaluations}</span>
        </div>
        <div className="progress" style={{height: '8px'}}>
          <div 
            className={`progress-bar ${getProgressBarClass(completionPercentage)}`} 
            role="progressbar" 
            style={{width: `${completionPercentage}%`}} 
            aria-valuenow={completionPercentage} 
            aria-valuemin="0" 
            aria-valuemax="100"
          ></div>
        </div>
      </div>
      <div className="period-card-footer">
        <span className={`card-status-badge status-${status.className}`}>
            <i className={`bi ${status.icon} me-2`}></i>
            {status.text}
        </span>
      </div>
    </div>
  );
};

export default PeriodCard;
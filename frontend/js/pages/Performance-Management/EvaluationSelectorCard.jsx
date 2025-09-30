import React, { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import placeholderAvatar from '../../../assets/placeholder-profile.jpg';

const EvaluationSelectorCard = ({ employee, positionTitle, lastEvaluation, onAction }) => {
  const { status, statusClass, lastEvalDateFormatted } = useMemo(() => {
    if (!lastEvaluation) {
      return { status: 'Due for Review', statusClass: 'due', lastEvalDateFormatted: 'N/A' };
    }
    
    const lastEvalDate = parseISO(lastEvaluation.periodEnd);
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const isDue = lastEvalDate < sixMonthsAgo;

    return {
      status: isDue ? 'Due for Review' : 'Completed',
      statusClass: isDue ? 'due' : 'completed',
      lastEvalDateFormatted: format(lastEvalDate, 'MMM dd, yyyy')
    };
  }, [lastEvaluation]);

  return (
    <div className="evaluation-selector-card-revised">
      <div className="card-main-info">
        <img 
          src={employee.imageUrl || placeholderAvatar} 
          alt={employee.name} 
          className="selector-avatar"
        />
        <div className="selector-info">
          <h5 className="selector-name">{employee.name}</h5>
          <p className="selector-position text-muted mb-0">{positionTitle}</p>
        </div>
      </div>
      <div className="card-status-panel">
        <div className="status-item">
          <span className="status-label">Last Evaluation</span>
          <span className="status-value">{lastEvalDateFormatted}</span>
        </div>
        <div className="status-item">
          <span className="status-label">Status</span>
          <span className={`status-badge-revised status-${statusClass}`}>{status}</span>
        </div>
        <div className="card-action-button">
          {status === 'Completed' && (
            <button 
              className="btn btn-sm btn-outline-secondary"
              onClick={() => onAction('view', lastEvaluation)}
            >
              View Last
            </button>
          )}
          <button 
            className="btn btn-sm btn-success"
            onClick={() => onAction('start', employee)}
          >
            {status === 'Completed' ? 'Start New' : 'Start Evaluation'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EvaluationSelectorCard;
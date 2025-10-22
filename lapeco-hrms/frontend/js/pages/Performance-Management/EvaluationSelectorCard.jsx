import React, { useMemo, useEffect, useRef } from 'react';
import { format, parseISO } from 'date-fns';
import { Tooltip } from 'bootstrap';
import ScoreIndicator from './ScoreIndicator';

const EvaluationSelectorCard = ({ employee, positionTitle, lastEvaluation, onAction, activePeriod, submissionForActivePeriod, isEditable }) => {
  const buttonRef = useRef(null);

  useEffect(() => {
    let tooltipInstance;
    if (buttonRef.current && !activePeriod && !submissionForActivePeriod) {
      tooltipInstance = new Tooltip(buttonRef.current, {
        title: 'No active evaluation period set by HR',
        placement: 'top',
        trigger: 'hover',
      });
    }
    return () => {
      if (tooltipInstance) {
        tooltipInstance.dispose();
      }
    };
  }, [activePeriod, submissionForActivePeriod]);

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

  const avatarSrc = employee.avatarUrl || employee.imageUrl || undefined;

  const renderActionButtons = () => {
    if (submissionForActivePeriod) {
      return (
        <>
          <button 
            className="btn btn-sm btn-outline-secondary"
            onClick={() => onAction('review', submissionForActivePeriod)} // Pass submission data
          >
            Review Evaluation
          </button>
          {isEditable && (
            <button 
              className="btn btn-sm btn-success"
              onClick={() => onAction('edit', { employee, submission: submissionForActivePeriod })}
            >
              Edit Submission
            </button>
          )}
        </>
      );
    }
    
    return (
        <span ref={buttonRef} className={`${!activePeriod ? 'd-inline-block' : ''}`} tabIndex="0">
          <button 
            className="btn btn-sm btn-success"
            onClick={() => onAction('start', { employee })}
            disabled={!activePeriod}
            style={!activePeriod ? { pointerEvents: 'none' } : {}}
          >
            Start Evaluation
          </button>
        </span>
    );
  }

  return (
    <div className="evaluation-selector-card-revised">
      <div className="card-main-info">
        <Avatar
          src={avatarSrc}
          alt={employee.name}
          size="lg"
          className="selector-avatar"
        />
        <div className="selector-info">
          <h5 className="selector-name">{employee.name}</h5>
          <p className="selector-position text-muted mb-0">{positionTitle}</p>
        </div>
        <div className="selector-score">
          {lastEvaluation ? (
            <ScoreIndicator score={lastEvaluation.overallScore} />
          ) : (
            <span className="text-muted fst-italic">Not yet rated</span>
          )}
        </div>
      </div>
      <div className="card-status-panel">

        <div className="status-item-revised">
            <i className={`bi ${statusClass === 'due' ? 'bi-hourglass-split' : 'bi-check2-circle'} status-icon-revised ${statusClass}`}></i>
            <span className="status-label">Evaluation Status:</span>
            <span className={`status-badge-revised status-${statusClass}`}>{status}</span>
        </div>
        <div className="card-action-buttons-revised">
          {renderActionButtons()}
        </div>
      </div>
    </div>
  );
};

export default EvaluationSelectorCard;
import React, { useEffect, useRef } from 'react';
import { Tooltip } from 'bootstrap';

const RecommendedActions = ({ employee, onAction }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const tooltipTriggerList = [].slice.call(containerRef.current.querySelectorAll('[data-bs-toggle="tooltip"]'));
    const tooltipList = tooltipTriggerList.map(el => new Tooltip(el));
    return () => {
      tooltipList.forEach(tooltip => tooltip.dispose());
    };
  }, [employee]);

  // Employee with no evaluation data
  if (employee.latestScore === null) {
    return (
      <div ref={containerRef} className="card action-panel-card">
        <div className="card-header"><h6 className="mb-0"><i className="bi bi-lightning-charge-fill me-2"></i>Action Plan for {employee.name.split(' ')[0]}</h6></div>
        <div className="card-body">
          <button 
            className="btn btn-primary w-100 action-button-primary"
            onClick={() => onAction('scheduleEvaluation', employee)}
            data-bs-toggle="tooltip"
            title="Open the evaluation module to conduct this employee's first review."
          >
            <i className="bi bi-clipboard-plus me-2"></i>Schedule First Evaluation
          </button>
          <button className="btn btn-outline-secondary w-100 action-button-secondary" onClick={() => onAction('viewProfile', employee)}>
            <i className="bi bi-person-lines-fill me-2"></i>View Full Profile
          </button>
        </div>
      </div>
    );
  }

  // Regular action plan for employees with data
  return (
    <div ref={containerRef} className="card action-panel-card">
      <div className="card-header"><h6 className="mb-0"><i className="bi bi-lightning-charge-fill me-2"></i>Action Plan for {employee.name.split(' ')[0]}</h6></div>
      <div className="card-body">
        {employee.isTurnoverRisk && employee.riskFactors.performance.score > 50 && (
          <button 
            className="btn btn-warning w-100 action-button-primary"
            onClick={() => onAction('startPip', employee)}
            data-bs-toggle="tooltip"
            title="Initiates a formal Performance Improvement Plan case."
          >
            <i className="bi bi-clipboard-data me-2"></i>Start Performance Improvement Plan
          </button>
        )}
        {employee.isTurnoverRisk && employee.riskFactors.attendance.score > 40 && (
           <button 
            className="btn btn-warning w-100 action-button-primary"
            onClick={() => onAction('reviewAttendance', employee)}
            data-bs-toggle="tooltip"
            title="Creates a case to formally address attendance issues."
          >
            <i className="bi bi-calendar-x me-2"></i>Initiate Attendance Review
          </button>
        )}
        {employee.isHighPotential && (
          <button 
            className="btn btn-info w-100 action-button-primary"
            onClick={() => onAction('nominateForTraining', employee)}
            data-bs-toggle="tooltip"
            title="Enroll this employee in a relevant training program."
          >
            <i className="bi bi-award me-2"></i>Nominate for Training
          </button>
        )}
        <button className="btn btn-outline-secondary w-100 action-button-secondary" onClick={() => onAction('viewProfile', employee)}>
          <i className="bi bi-person-lines-fill me-2"></i>View Full Profile
        </button>
      </div>
    </div>
  );
};

export default RecommendedActions;
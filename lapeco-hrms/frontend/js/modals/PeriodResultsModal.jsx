import React, { useEffect, useMemo, useState } from 'react';
import { performanceAPI } from '../services/api';

const PeriodResultsModal = ({ show, period, onClose, onViewSubmission, onError }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [periodData, setPeriodData] = useState(null);
  const evaluations = useMemo(() => Array.isArray(periodData?.evaluations) ? periodData.evaluations : [], [periodData]);
  const [selectedEvaluationId, setSelectedEvaluationId] = useState(evaluations[0]?.id ?? null);

  useEffect(() => {
    if (!show || !period?.id) {
      setPeriodData(null);
      setSelectedEvaluationId(null);
      return;
    }

    const fetchResults = async () => {
      try {
        setIsLoading(true);
        const response = await performanceAPI.getPeriodicEvaluations(period.id);
        const payload = response.data || {};
        const fetchedPeriod = payload.period || null;

        if (fetchedPeriod) {
          const normalizedEvaluations = Array.isArray(fetchedPeriod.evaluations) ? fetchedPeriod.evaluations.map(ev => ({
            id: ev.id,
            employeeId: ev.employeeId,
            employee: ev.employee,
            employeeName: ev.employeeName,
            responsesCount: ev.responsesCount ?? (ev.responses ? ev.responses.length : 0),
            averageScore: ev.averageScore,
            responses: Array.isArray(ev.responses) ? ev.responses.map(resp => ({
              id: resp.id,
              evaluatorId: resp.evaluatorId,
              evaluator: resp.evaluator,
              evaluatorName: resp.evaluatorName,
              evaluatedOn: resp.evaluatedOn,
              overallScore: resp.overallScore,
            })) : [],
          })) : [];

          setPeriodData({ ...fetchedPeriod, evaluations: normalizedEvaluations });
          setSelectedEvaluationId(normalizedEvaluations[0]?.id ?? null);
        } else {
          setPeriodData({ ...period, evaluations: [] });
          setSelectedEvaluationId(null);
        }
      } catch (error) {
        console.error('Failed to load period results', error);
        setPeriodData({ ...period, evaluations: [] });
        setSelectedEvaluationId(null);
        onError?.({ message: 'Failed to load period results.', type: 'error' });
      } finally {
        setIsLoading(false);
      }
    };

    fetchResults();
  }, [show, period, onError]);

  const selectedEvaluation = useMemo(() => evaluations.find(ev => ev.id === selectedEvaluationId) || null, [evaluations, selectedEvaluationId]);
  const responses = useMemo(() => Array.isArray(selectedEvaluation?.responses) ? selectedEvaluation.responses : [], [selectedEvaluation]);

  const getEmployeeName = (employee) => {
    if (!employee) return 'Unknown Employee';
    const parts = [employee.firstName, employee.middleName, employee.lastName].filter(Boolean);
    return parts.length ? parts.join(' ') : employee.email || 'Unknown Employee';
  };

  const getEvaluatorName = (evaluator) => {
    if (!evaluator) return 'Unknown Evaluator';
    const parts = [evaluator.firstName, evaluator.middleName, evaluator.lastName].filter(Boolean);
    return parts.length ? parts.join(' ') : evaluator.email || 'Unknown Evaluator';
  };

  if (!show) return null;

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-xl modal-dialog-scrollable">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              {periodData?.name || period?.name || 'Evaluation Period'}
              {periodData?.evaluationStart && periodData?.evaluationEnd && (
                <span className="d-block small text-muted">{periodData.evaluationStart} to {periodData.evaluationEnd}</span>
              )}
            </h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            {isLoading && (
              <div className="text-center p-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            )}
            {!isLoading && evaluations.length === 0 && (
              <div className="text-center text-muted p-5">
                <i className="bi bi-inboxes fs-1 d-block mb-3"></i>
                <p className="mb-0">No evaluations were recorded for this period.</p>
              </div>
            )}
            {!isLoading && evaluations.length > 0 && (
              <div className="row g-3">
                <div className="col-md-5">
                  <div className="card h-100">
                    <div className="card-header">
                      <strong>Evaluated Employees</strong>
                    </div>
                    <div className="card-body p-0">
                      <div className="list-group list-group-flush">
                        {evaluations.map(ev => {
                          const evResponsesCount = Array.isArray(ev.responses) ? ev.responses.length : (ev.responsesCount || 0);
                          return (
                          <button
                            key={ev.id}
                            type="button"
                            className={`list-group-item list-group-item-action d-flex justify-content-between align-items-start ${selectedEvaluationId === ev.id ? 'active' : ''}`}
                            onClick={() => setSelectedEvaluationId(ev.id)}
                          >
                            <div className="me-3">
                              <div className="fw-semibold">{getEmployeeName(ev.employee)}</div>
                              <div className="small">Responses: {evResponsesCount}</div>
                              {ev.averageScore !== null && ev.averageScore !== undefined && (
                                <div className="small text-muted">Average Score: {Number(ev.averageScore).toFixed(2)}</div>
                              )}
                            </div>
                            <i className="bi bi-chevron-right"></i>
                          </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-md-7">
                  <div className="card h-100">
                    <div className="card-header d-flex justify-content-between align-items-center">
                      <strong>Evaluators</strong>
                      {selectedEvaluation && (
                        <span className="small text-muted">{getEmployeeName(selectedEvaluation.employee)}</span>
                      )}
                    </div>
                    <div className="card-body">
                      {!selectedEvaluation && (
                        <div className="text-muted text-center py-4">Select an employee to view evaluator submissions.</div>
                      )}
                      {selectedEvaluation && responses.length === 0 && (
                        <div className="text-muted text-center py-4">No submissions received for this employee.</div>
                      )}
                      {selectedEvaluation && responses.length > 0 && (
                        <div className="list-group">
                          {responses.map(response => (
                            <div key={response.id} className="list-group-item d-flex justify-content-between align-items-center">
                              <div>
                                <div className="fw-semibold">{getEvaluatorName(response.evaluator)}</div>
                                {response.evaluatedOn && (
                                  <div className="small text-muted">{new Date(response.evaluatedOn).toLocaleString()}</div>
                                )}
                                {response.overallScore !== null && response.overallScore !== undefined && (
                                  <div className="small text-muted">Overall Score: {Number(response.overallScore).toFixed(2)}</div>
                                )}
                              </div>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-secondary"
                                onClick={() => onViewSubmission({
                                  employeeId: selectedEvaluation.employeeId,
                                  employeeName: getEmployeeName(selectedEvaluation.employee),
                                  submissionId: response.id,
                                })}
                                disabled={!response.id}
                              >
                                View
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PeriodResultsModal;

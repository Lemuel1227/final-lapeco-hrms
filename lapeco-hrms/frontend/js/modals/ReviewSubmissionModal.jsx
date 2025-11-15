import React, { useState, useEffect } from 'react';
import { parseISO } from 'date-fns';
import { formatDate as formatMDY } from '../utils/dateUtils';
import StarRating from '../pages/Performance-Management/StarRating';
import { performanceAPI } from '../services/api';
import { evaluationFactorsConfig } from '../config/evaluation.config';

const ReviewSubmissionModal = ({ show, onClose, employeeId, employeeName, submissionId }) => {
  const [loading, setLoading] = useState(true);
  const [responseData, setResponseData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!show || !submissionId) return;

    const fetchResponseData = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await performanceAPI.getEvaluationResponseDetail(submissionId);
        const data = response.data || response;
        setResponseData(data);
      } catch (err) {
        console.error('Error fetching response:', err);
        setError('Failed to load evaluation details');
      } finally {
        setLoading(false);
      }
    };

    fetchResponseData();
  }, [show, submissionId]);

  if (!show) return null;

  const getScoreForFactor = (factorId) => {
    if (!responseData?.response?.scores) return null;
    
    const fieldMap = {
      'factor_attendance': 'attendance',
      'factor_dedication': 'dedication',
      'factor_job_knowledge': 'performance_job_knowledge',
      'factor_efficiency': 'performance_work_efficiency_professionalism',
      'factor_task_acceptance': 'cooperation_task_acceptance',
      'factor_adaptability': 'cooperation_adaptability',
      'factor_autonomy': 'initiative_autonomy',
      'factor_pressure': 'initiative_under_pressure',
      'factor_communication': 'communication',
      'factor_teamwork': 'teamwork',
      'factor_character': 'character',
      'factor_responsiveness': 'responsiveness',
      'factor_personality': 'personality',
      'factor_appearance': 'appearance',
      'factor_work_habits': 'work_habits'
    };

    const backendField = fieldMap[factorId];
    return responseData.response.scores[backendField] || null;
  };

  return (
    <div className={`modal fade ${show ? 'show d-block' : ''}`} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-lg modal-dialog-scrollable">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Review Evaluation - {employeeName}</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          
          <div className="modal-body">
            {loading && (
              <div className="text-center p-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            )}

            {error && (
              <div className="alert alert-danger">{error}</div>
            )}

            {!loading && !error && responseData && (
              <>
                {/* Evaluation Info */}
                <div className="card mb-3">
                  <div className="card-body">
                    <div className="row">
                      <div className="col-md-6">
                        <p className="mb-1"><strong>Evaluated By:</strong> {responseData.evaluator?.name || 'Unknown'}</p>
                        <p className="mb-1"><strong>Evaluated On:</strong> {responseData.response?.evaluatedOn ? formatMDY(parseISO(responseData.response.evaluatedOn), 'long') : 'N/A'}</p>
                      </div>
                      <div className="col-md-6 text-end">
                        <p className="mb-1"><strong>Overall Score:</strong></p>
                        <h3 className="text-primary mb-0">
                          {responseData.response?.overallScore 
                            ? `${((responseData.response.overallScore / 5) * 100).toFixed(2)}%` 
                            : 'N/A'}
                        </h3>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Evaluation Criteria */}
                {evaluationFactorsConfig.filter(f => f.type === 'criterion').map(criterion => (
                  <div className="card mb-3" key={criterion.id}>
                    <div className="card-header">
                      <h6 className="mb-0">{criterion.title}</h6>
                    </div>
                    <div className="card-body">
                      {criterion.items.map(item => {
                        const score = getScoreForFactor(item.id);
                        return (
                          <div key={item.id} className="mb-3 pb-3 border-bottom">
                            <div className="d-flex justify-content-between align-items-start">
                              <div className="flex-grow-1">
                                <strong>{item.title}</strong>
                                <p className="text-muted small mb-0">{item.description}</p>
                              </div>
                              <div className="ms-3">
                                {score ? (
                                  <StarRating score={score} />
                                ) : (
                                  <span className="text-muted">Not rated</span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {/* Comments */}
                {(responseData.response?.commentSummary || responseData.response?.commentDevelopment) && (
                  <div className="card">
                    <div className="card-header">
                      <h6 className="mb-0">Comments</h6>
                    </div>
                    <div className="card-body">
                      {responseData.response.commentSummary && (
                        <div className="mb-3">
                          <strong>Summary:</strong>
                          <p className="mb-0">{responseData.response.commentSummary}</p>
                        </div>
                      )}
                      {responseData.response.commentDevelopment && (
                        <div>
                          <strong>Development Areas:</strong>
                          <p className="mb-0">{responseData.response.commentDevelopment}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
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

export default ReviewSubmissionModal;

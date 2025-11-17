import React, { useState, useMemo, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import RatingScaleRow from './RatingScaleRow';
import TextareaSection from './TextareaSection';
import RatingScaleGuide from './RatingScaleGuide';
import ConfirmationModal from '../../modals/ConfirmationModal';
import ToastNotification from '../../common/ToastNotification';
import { performanceAPI } from '../../services/api';
import { evaluationFactorsConfig } from '../../config/evaluation.config';
import './EvaluationPages.css';

const EvaluationFormPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { employeeId, employeeName, evaluationStart, evaluationEnd, evaluationId, responseId } = location.state || {};

  const isEditMode = Boolean(responseId);
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  
  const [factorScores, setFactorScores] = useState({});
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showIncompleteConfirm, setShowIncompleteConfirm] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // Fetch existing evaluation if editing
  useEffect(() => {
    const fetchData = async () => {
      if (!employeeId || !employeeName) {
        setError('No employee specified');
        setLoading(false);
        return;
      }

      if (!evaluationId) {
        setError('No evaluation period found');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // If editing, fetch existing evaluation response
        if (isEditMode && responseId) {
          const response = await performanceAPI.getEvaluationResponseDetail(responseId);
          const data = response.data || response;
          
          // Map backend field names back to factor IDs
          const backendToFactorMap = {
            'attendance': 'factor_attendance',
            'dedication': 'factor_dedication',
            'performance_job_knowledge': 'factor_job_knowledge',
            'performance_work_efficiency_professionalism': 'factor_efficiency',
            'cooperation_task_acceptance': 'factor_task_acceptance',
            'cooperation_adaptability': 'factor_adaptability',
            'initiative_autonomy': 'factor_autonomy',
            'initiative_under_pressure': 'factor_pressure',
            'communication': 'factor_communication',
            'teamwork': 'factor_teamwork',
            'character': 'factor_character',
            'responsiveness': 'factor_responsiveness',
            'personality': 'factor_personality',
            'appearance': 'factor_appearance',
            'work_habits': 'factor_work_habits'
          };
          
          // Convert backend response to factorScores format
          const scores = {};
          
          // Check if data has the nested structure
          const responseData = data.response || data;
          const scoresData = responseData.scores || data;
          
          
          Object.entries(backendToFactorMap).forEach(([backendField, factorId]) => {
            const scoreValue = scoresData[backendField] || data[backendField];
            if (scoreValue) {
              scores[factorId] = {
                score: scoreValue
              };
            }
          });
          
          // Add comment fields (map backend fields to config IDs)
          const commentSummary = responseData.commentSummary || data.evaluators_comment_summary;
          const commentDevelopment = responseData.commentDevelopment || data.evaluators_comment_development;
          
          if (commentSummary) {
            scores['factor_evaluator_summary'] = {
              value: commentSummary
            };
          }
          if (commentDevelopment) {
            scores['factor_development_areas'] = {
              value: commentDevelopment
            };
          }
          
          setFactorScores(scores);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching evaluation data:', err);
        setError(err.message || 'Failed to load evaluation data');
        setLoading(false);
      }
    };

    fetchData();
  }, [employeeId, employeeName, evaluationId, responseId, isEditMode]);

  const evaluationCriteria = useMemo(() => evaluationFactorsConfig.filter(f => f.type === 'criterion'), []);
  const textareaFactors = useMemo(() => evaluationFactorsConfig.filter(f => f.type === 'textarea'), []);
  const allRateableItems = useMemo(() => evaluationCriteria.flatMap(c => c.items), [evaluationCriteria]);

  const finalScore = useMemo(() => {
    let totalScore = 0;
    let scoredItems = 0;
    
    allRateableItems.forEach(item => {
      const score = factorScores[item.id]?.score;
      if (score !== undefined && score > 0) {
        totalScore += score;
        scoredItems++;
      }
    });
    
    if (scoredItems === 0) return '0.00';
    
    const averageOutOf5 = totalScore / scoredItems;
    const percentage = (averageOutOf5 / 5) * 100;

    return percentage.toFixed(2);
  }, [factorScores, allRateableItems]);

  const handleFactorChange = (itemId, field, value) => {
    setFactorScores(prev => ({ ...prev, [itemId]: { ...prev[itemId], [field]: value } }));
  };

  const handleCancel = () => {
    setShowCancelConfirm(true);
  };

  const handleConfirmCancel = () => {
    navigate(-1);
    setShowCancelConfirm(false);
  };

  const handleConfirmSubmit = async () => {
    try {
      setSubmitting(true);
      
      // Get CSRF cookie first (required for stateful authentication)
      await fetch('https://api.lapeco.org/sanctum/csrf-cookie', {
        credentials: 'include'
      });
      
      // Convert factorScores to flat field format expected by backend
      const payload = {};
      
      // Map factor IDs from config to backend field names
      const factorFieldMap = {
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
      
      // Convert factorScores to flat fields
      Object.entries(factorScores).forEach(([factorId, data]) => {
        const fieldName = factorFieldMap[factorId];
        if (fieldName && data.score) {
          payload[fieldName] = parseInt(data.score);
        }
      });
      
      // Add comment fields if they exist (map from config IDs to backend field names)
      if (factorScores['factor_evaluator_summary']?.value) {
        payload.evaluators_comment_summary = factorScores['factor_evaluator_summary'].value;
      }
      if (factorScores['factor_development_areas']?.value) {
        payload.evaluators_comment_development = factorScores['factor_development_areas'].value;
      }

      if (isEditMode && responseId) {
        // Update existing response
        await performanceAPI.updateResponse(responseId, payload);
      } else if (evaluationId) {
        // Submit new response to the evaluation
        await performanceAPI.submitResponse(evaluationId, payload);
      } else {
        throw new Error('No evaluation ID provided');
      }
      
      setToast({
        show: true,
        message: `Evaluation ${isEditMode ? 'updated' : 'submitted'} successfully!`,
        type: 'success'
      });
      
      // Navigate back after showing toast
      setTimeout(() => navigate(-1), 1500);
    } catch (err) {
      console.error('Error submitting evaluation:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to submit evaluation. Please try again.';
      setToast({
        show: true,
        message: errorMessage,
        type: 'error'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = () => {
    const ratedItemCount = allRateableItems.filter(item => factorScores[item.id]?.score > 0).length;
    if (ratedItemCount < allRateableItems.length && !isEditMode) {
      setShowIncompleteConfirm(true);
      return;
    }
    
    handleConfirmSubmit();
  };

  if (loading) {
    return (
      <div className="container-fluid p-4 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (error || !employeeId || !employeeName) {
    return (
      <div className="container-fluid p-4 text-center">
        <h2>Invalid Evaluation Data</h2>
        <p>{error || 'Employee or evaluation period not specified.'}</p>
        <Link to="/dashboard/evaluate-team" className="btn btn-primary">Go Back</Link>
      </div>
    );
  }

  return (
    <>
      <div className="container-fluid p-0 page-module-container evaluation-form-page">
        <div className="evaluation-header">
          <div className="header-info">
            <h1>{isEditMode ? 'Edit Evaluation for ' : 'Evaluate '}{employeeName}</h1>
            <p className="text-muted mb-0">Evaluation Period: {evaluationStart} to {evaluationEnd}</p>
          </div>
          <button className="btn btn-outline-secondary" onClick={handleCancel}>
            <i className="bi bi-x-lg me-2"></i>Cancel
          </button>
        </div>
        
        <div className="evaluation-body">
          <RatingScaleGuide />
          {evaluationCriteria.map(criterion => (
            <div className="card" key={criterion.id}>
              <div className="card-header">
                <h5 className="mb-0">{criterion.title}</h5>
              </div>
              <div className="card-body p-0">
                {criterion.items.map(item => (
                  <RatingScaleRow
                    key={item.id}
                    factor={item}
                    scoreData={factorScores[item.id]}
                    onScoreChange={handleFactorChange}
                  />
                ))}
              </div>
            </div>
          ))}
          {textareaFactors.map(factor => (
            <TextareaSection
              key={factor.id}
              factor={factor}
              value={factorScores[factor.id]?.value}
              onValueChange={handleFactorChange}
            />
          ))}
        </div>

        <div className="evaluation-footer">
          <div className="overall-score">Overall Score: <span>{finalScore}%</span></div>
          <div className="footer-actions">
            <button 
              className="btn btn-success" 
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : (isEditMode ? 'Update Submission' : 'Submit Evaluation')}
            </button>
          </div>
        </div>
      </div>

      <ConfirmationModal
        show={showCancelConfirm}
        onClose={() => setShowCancelConfirm(false)}
        onConfirm={handleConfirmCancel}
        title="Confirm Cancellation"
        confirmText="Yes, Discard Changes"
        confirmVariant="danger"
      >
        <p>Are you sure you want to cancel?</p>
        <p className="fw-bold">All unsaved changes will be lost.</p>
      </ConfirmationModal>

      <ConfirmationModal
        show={showIncompleteConfirm}
        onClose={() => setShowIncompleteConfirm(false)}
        onConfirm={handleConfirmSubmit}
        title="Incomplete Evaluation"
        confirmText="Submit Anyway"
        confirmVariant="warning"
      >
        <p>You have not rated all {allRateableItems.length} criteria. Are you sure you want to submit the evaluation as is?</p>
        <p className="text-muted small">It is recommended to complete all criteria for an accurate final score.</p>
      </ConfirmationModal>

      {/* Toast Notification */}
      {toast.show && (
        <ToastNotification
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ ...toast, show: false })}
        />
      )}
    </>
  );
};

export default EvaluationFormPage;
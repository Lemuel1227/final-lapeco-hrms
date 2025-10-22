import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './EvaluationPages.css';
import EvaluationSelectorCard from './EvaluationSelectorCard';
import ReviewSubmissionModal from '../../modals/ReviewSubmissionModal';
import { performanceAPI } from '../../services/api';
import { evaluationFactorsConfig } from '../../config/evaluation.config';

const EvaluateLeaderPage = () => {
  const navigate = useNavigate();
  
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingEvaluation, setViewingEvaluation] = useState(null);
  const [teamLeader, setTeamLeader] = useState(null);
  const [activePeriod, setActivePeriod] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLeaderData = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await performanceAPI.getLeaderToEvaluate();
        const data = response.data || response; // Handle both axios response and direct data
        setTeamLeader(data.teamLeader);
        setActivePeriod(data.activePeriod);
      } catch (err) {
        console.error('Error fetching leader to evaluate:', err);
        setError(err.message || 'Failed to load evaluation data');
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderData();
  }, []);

  const modalProps = useMemo(() => {
    if (!viewingEvaluation || !teamLeader) return null;
    return { 
      evaluation: viewingEvaluation, 
      employee: teamLeader,
      position: { id: teamLeader.positionId, title: teamLeader.position }
    };
  }, [viewingEvaluation, teamLeader]);

  const { submissionForActivePeriod, isEditable } = useMemo(() => {
    if (!teamLeader || !activePeriod) {
      return { submissionForActivePeriod: null, isEditable: false };
    }
    
    const submission = teamLeader.submissionId ? {
      id: teamLeader.submissionId,
      overallScore: teamLeader.submissionScore,
      evaluatedOn: teamLeader.submittedAt
    } : null;
    
    const isEditable = activePeriod.closeDate ? new Date() <= new Date(activePeriod.closeDate) : false;

    return { submissionForActivePeriod: submission, isEditable };
  }, [teamLeader, activePeriod]);
  
  const handleAction = (action, data) => {
    if ((action === 'start' || action === 'edit') && teamLeader && activePeriod) {
        const state = {
            employeeId: teamLeader.id,
            employeeName: teamLeader.name,
            evaluationStart: activePeriod.evaluationStart,
            evaluationEnd: activePeriod.evaluationEnd,
            evaluationId: teamLeader.evaluationId // The evaluation record ID for the active period
        };
        if (action === 'edit' && data.submission) {
            state.responseId = data.submission.id; // This is the response ID, not evaluation ID
        }
        navigate('/dashboard/performance/evaluate', { state });
    } else if (action === 'review') {
      // data contains { employee, submission }
      setViewingEvaluation({ 
        employeeId: data.employee.id,
        submissionId: data.submission.id 
      });
      setShowViewModal(true);
    }
  };
  
  if (loading) {
    return (
      <div className="container-fluid p-0 page-module-container">
        <div className="text-center p-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3 text-muted">Loading evaluation data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-fluid p-0 page-module-container">
        <div className="alert alert-danger" role="alert">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          {error}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="container-fluid p-0 page-module-container">
        <header className="page-header mb-4">
          <h1 className="page-main-title">Evaluate Your Leader</h1>
          <p className="page-subtitle text-muted">Provide your feedback on your team leader's performance.</p>
        </header>
        
        {activePeriod ? (
          <div className="alert alert-success d-flex align-items-center" role="alert">
            <i className="bi bi-broadcast-pin me-3 fs-4"></i>
            <div>
              <h6 className="alert-heading mb-0">ACTIVE: {activePeriod.name}</h6>
              <small>You are evaluating performance for the period of <strong>{activePeriod.evaluationStart} to {activePeriod.evaluationEnd}</strong>. Submissions are open until <strong>{activePeriod.closeDate}</strong>.</small>
            </div>
          </div>
        ) : (
          <div className="alert alert-warning d-flex align-items-center" role="alert">
            <i className="bi bi-exclamation-triangle-fill me-3 fs-4"></i>
            <div>
              <h6 className="alert-heading mb-0">Evaluations Currently Closed</h6>
              <small>There is no active evaluation period. Please wait for HR to open a new evaluation cycle.</small>
            </div>
          </div>
        )}
        
        {teamLeader ? (
          <div className="evaluation-selector-grid mt-4">
            <EvaluationSelectorCard
              employee={{
                id: teamLeader.id,
                name: teamLeader.name,
                imageUrl: teamLeader.profilePictureUrl,
                email: teamLeader.email
              }}
              positionTitle={`Team Leader, ${teamLeader.position || 'Unassigned'}`}
              lastEvaluation={teamLeader.currentEvaluation}
              onAction={handleAction}
              activePeriod={activePeriod}
              submissionForActivePeriod={submissionForActivePeriod}
              isEditable={isEditable}
            />
          </div>
        ) : (
          <div className="text-center p-5 bg-light rounded mt-4">
              <i className="bi bi-person-video3 fs-1 text-muted mb-3 d-block"></i>
              <h5 className="text-muted">No Team Leader Assigned</h5>
              <p className="text-muted">You are not currently assigned to a team with a designated leader.</p>
          </div>
        )}
      </div>

      {viewingEvaluation && teamLeader && (
        <ReviewSubmissionModal
          show={showViewModal}
          onClose={() => setShowViewModal(false)}
          employeeId={viewingEvaluation.employeeId}
          employeeName={teamLeader.name}
          submissionId={viewingEvaluation.submissionId}
        />
      )}
    </>
  );
};

export default EvaluateLeaderPage;
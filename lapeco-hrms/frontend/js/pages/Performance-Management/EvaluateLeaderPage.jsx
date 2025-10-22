import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './EvaluationPages.css';
import EvaluationSelectorCard from './EvaluationSelectorCard';
import ViewEvaluationModal from '../../modals/ViewEvaluationModal';

const EvaluateLeaderPage = ({ currentUser, employees, positions, evaluations, activeEvaluationPeriod, evaluationFactors }) => {
  const navigate = useNavigate();
  const positionMap = useMemo(() => new Map(positions.map(p => [p.id, p.title])), [positions]);
  const employeeMap = useMemo(() => new Map(employees.map(e => [e.id, e])), [employees]); 

  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingEvaluation, setViewingEvaluation] = useState(null);

  const modalProps = useMemo(() => {
    if (!viewingEvaluation) return null;
    const employee = employeeMap.get(viewingEvaluation.employeeId);
    const position = employee ? positions.find(p => p.id === employee.positionId) : null;
    return { evaluation: viewingEvaluation, employee, position };
  }, [viewingEvaluation, employeeMap, positions]);

  const teamLeader = useMemo(() => {
    if (!currentUser?.positionId) return null;
    return employees.find(emp => 
      emp.positionId === currentUser.positionId && emp.isTeamLeader
    );
  }, [currentUser, employees]);

  const { leaderLastEvaluation, submissionForActivePeriod, isEditable } = useMemo(() => {
    if (!teamLeader) return { leaderLastEvaluation: null, submissionForActivePeriod: null, isEditable: false };
    
    const leaderEvals = (evaluations || [])
      .filter(ev => ev.employeeId === teamLeader.id)
      .sort((a, b) => new Date(b.periodEnd) - new Date(a.periodEnd));
      
    const lastEval = leaderEvals[0] || null;

    const submission = activeEvaluationPeriod ? leaderEvals.find(ev => 
        ev.evaluatorId === currentUser.id &&
        ev.periodStart === activeEvaluationPeriod.evaluationStart &&
        ev.periodEnd === activeEvaluationPeriod.evaluationEnd
    ) : null;
    
    const editable = activeEvaluationPeriod ? new Date() <= new Date(activeEvaluationPeriod.activationEnd) : false;

    return { leaderLastEvaluation: lastEval, submissionForActivePeriod: submission, isEditable: editable };
  }, [teamLeader, evaluations, currentUser, activeEvaluationPeriod]);
  
  const handleAction = (action, data) => {
    if ((action === 'start' || action === 'edit') && teamLeader && activeEvaluationPeriod) {
        const state = {
            employeeId: teamLeader.id,
            evaluationStart: activeEvaluationPeriod.evaluationStart,
            evaluationEnd: activeEvaluationPeriod.evaluationEnd
        };
        if (action === 'edit' && data.submission) {
            state.evalId = data.submission.id;
        }
        navigate('/dashboard/performance/evaluate', { state });
    } else if (action === 'review') {
      // --- MODIFIED LOGIC ---
      setViewingEvaluation(data);
      setShowViewModal(true);
      // --- END MODIFICATION ---
    }
  };
  
  return (
    <>
      <div className="container-fluid p-0 page-module-container">
        <header className="page-header mb-4">
          <h1 className="page-main-title">Evaluate Your Leader</h1>
          <p className="page-subtitle text-muted">Provide your feedback on your team leader's performance.</p>
        </header>
        
        {activeEvaluationPeriod ? (
          <div className="alert alert-success d-flex align-items-center" role="alert">
            <i className="bi bi-broadcast-pin me-3 fs-4"></i>
            <div>
              <h6 className="alert-heading mb-0">ACTIVE: {activeEvaluationPeriod.name}</h6>
              <small>You are evaluating performance for the period of <strong>{activeEvaluationPeriod.evaluationStart} to {activeEvaluationPeriod.evaluationEnd}</strong>. Submissions are open until <strong>{activeEvaluationPeriod.activationEnd}</strong>.</small>
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
              employee={teamLeader}
              positionTitle={`Team Leader, ${positionMap.get(teamLeader.positionId) || 'Unassigned'}`}
              lastEvaluation={leaderLastEvaluation}
              onAction={handleAction}
              activePeriod={activeEvaluationPeriod}
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

      {modalProps && (
        <ViewEvaluationModal
          show={showViewModal}
          onClose={() => setShowViewModal(false)}
          evaluation={modalProps.evaluation}
          employee={modalProps.employee}
          position={modalProps.position}
          evaluationFactors={evaluationFactors}
        />
      )}
    </>
  );
};

export default EvaluateLeaderPage;
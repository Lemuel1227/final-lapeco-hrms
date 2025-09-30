import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import placeholderAvatar from '../../assets/placeholder-profile.jpg';
import StartEvaluationModal from '../../modals/StartEvaluationModal';
import './EvaluationPages.css';

const EvaluateLeaderPage = ({ currentUser, employees, positions }) => {
  const navigate = useNavigate();
  const positionMap = useMemo(() => new Map(positions.map(p => [p.id, p.title])), [positions]);
  
  const [showModal, setShowModal] = useState(false);

  const teamLeader = useMemo(() => {
    if (!currentUser?.positionId) return null;
    return employees.find(emp => 
      emp.positionId === currentUser.positionId && emp.isTeamLeader
    );
  }, [currentUser, employees]);
  
  const handleStartEvaluation = (startData) => {
    navigate('/dashboard/performance/evaluate', { state: startData });
    setShowModal(false);
  };

  return (
    <div className="container-fluid p-0 page-module-container">
      <header className="page-header mb-4">
        <h1 className="page-main-title">Evaluate Your Leader</h1>
        <p className="page-subtitle text-muted">Provide your feedback on your team leader's performance.</p>
      </header>
      
      {teamLeader ? (
        <div className="evaluation-selector-grid">
          <div className="card evaluation-selector-card">
            <div className="card-body d-flex align-items-center">
              <img 
                src={teamLeader.avatarUrl || placeholderAvatar} 
                alt={teamLeader.name} 
                className="selector-avatar"
              />
              <div className="selector-info">
                <h5 className="selector-name">{teamLeader.name}</h5>
                <p className="selector-position text-muted mb-0">
                  Team Leader, {positionMap.get(teamLeader.positionId) || 'Unassigned'}
                </p>
              </div>
              <button 
                className="btn btn-success ms-auto"
                onClick={() => setShowModal(true)}
              >
                Start Evaluation
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center p-5 bg-light rounded">
          <p>Your team leader is not currently assigned. Please contact HR.</p>
        </div>
      )}

      {showModal && teamLeader && (
        <StartEvaluationModal
            show={showModal}
            onClose={() => setShowModal(false)}
            onStart={handleStartEvaluation}
            employees={[teamLeader]}
        />
      )}
    </div>
  );
};

export default EvaluateLeaderPage;
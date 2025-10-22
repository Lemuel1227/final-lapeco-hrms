import React from 'react';
import { Accordion } from 'react-bootstrap';
import StatusListItem from './StatusListItem';

const TeamEvaluationCard = ({ team, eventKey, onViewEvaluation }) => {
  const { positionTitle, teamLeader, leaderStatus, completedMembers, pendingMembers } = team;

  const totalMembers = completedMembers.length + pendingMembers.length;
  // Total tasks = leader's own eval (1) + leader evaluating each member (totalMembers) + each member evaluating leader (totalMembers)
  const totalTasks = (teamLeader ? 1 : 0) + (teamLeader ? totalMembers : 0) + totalMembers;
  
  // Completed tasks = leader's eval (1 if done) + evals done BY leader + evals of leader done BY members
  const completedTasks = 
      (leaderStatus?.isEvaluated ? 1 : 0) + 
      (teamLeader ? totalMembers - leaderStatus.pendingMemberEvals.length : 0) + 
      (leaderStatus?.evalsOfLeaderByMembers || 0);

  const completionPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  const getProgressBarClass = (percentage) => {
    if (percentage < 50) return 'bg-danger';
    if (percentage < 90) return 'bg-warning';
    return 'bg-success';
  };

  return (
    <Accordion.Item eventKey={eventKey} className="team-evaluation-accordion-item">
      <Accordion.Header>
        <div className="accordion-header-content">
          <div className="header-team-info">
            <h5 className="team-position-title">{positionTitle}</h5>
          </div>
          <div className="header-progress-info">
            <div className="progress-text">{completedTasks} / {totalTasks} Complete</div>
            <div className="progress" style={{ height: '8px' }}>
              <div 
                className={`progress-bar ${getProgressBarClass(completionPercentage)}`}
                style={{ width: `${completionPercentage}%` }}
              ></div>
            </div>
          </div>
        </div>
      </Accordion.Header>
      <Accordion.Body>
        <div className="team-status-body-split">
          {teamLeader && (
            <div className="status-list-container leader-tasks-container">
              <h6>Leader's Tasks</h6>
              <div className="leader-info">
                <div className={`status-indicator ${leaderStatus.isEvaluated ? 'completed' : 'pending'}`}>
                  <i 
                    className={`bi ${leaderStatus.isEvaluated ? 'bi-check-circle-fill text-success' : 'bi-clock-history text-warning'}`}
                    title={leaderStatus.isEvaluated ? 'Evaluation Completed' : 'Evaluation Pending'}
                  ></i>
                </div>
                <Avatar src={teamLeader.imageUrl} alt={teamLeader.name} size="md" />
                <div className="leader-name">{teamLeader.name}</div>
                {leaderStatus.isEvaluated && (
                    <button 
                        className="btn btn-sm btn-outline-secondary view-btn"
                        onClick={() => onViewEvaluation(leaderStatus.evaluation)}
                    >
                        View
                    </button>
                )}
              </div>
              <div className="pending-evals-for-leader">
                <div className="sub-heading">Needs to Evaluate ({leaderStatus.pendingMemberEvals.length})</div>
                {leaderStatus.pendingMemberEvals.length > 0 ? (
                  <ul className="pending-evals-list">
                    {leaderStatus.pendingMemberEvals.map(member => (
                      <li key={member.id}>
                        <img src={member.imageUrl} size="sm" alt={member.name} />
                        <span>{member.name}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted small mb-0">All team members evaluated.</p>
                )}
              </div>
            </div>
          )}
          <div className="status-list-container">
            <h6>Team Members' Status</h6>
            
            <div className="sub-heading">Pending ({pendingMembers.length})</div>
            {pendingMembers.length > 0 ? (
              <ul className="status-list">
                {pendingMembers.map(emp => (
                  <StatusListItem 
                    key={emp.id} 
                    employee={emp} 
                    status="pending"
                  />
                ))}
              </ul>
            ) : <p className="text-muted small mb-0">All members have been evaluated.</p>}

            <div className="sub-heading mt-3">Completed ({completedMembers.length})</div>
            {completedMembers.length > 0 ? (
              <ul className="status-list">
                {completedMembers.map(emp => (
                  <StatusListItem 
                    key={emp.id} 
                    employee={emp} 
                    status="completed"
                    onView={() => onViewEvaluation(emp.evaluation)}
                  />
                ))}
              </ul>
            ) : <p className="text-muted small mb-0">No evaluations completed yet.</p>}
          </div>
        </div>
      </Accordion.Body>
    </Accordion.Item>
  );
};

export default TeamEvaluationCard;
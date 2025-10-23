import React from 'react';
import { Accordion } from 'react-bootstrap';
import StatusListItem from './StatusListItem';
import placeholderAvatar from '../../assets/placeholder-profile.jpg';

const TeamEvaluationCard = ({ team = {}, eventKey, onViewEvaluation }) => {
  const positionTitle = team.positionTitle || 'Unnamed Team';
  const teamLeader = team.teamLeader || null;
  const leaderStatus = team.leaderStatus || {};
  const completedMembers = Array.isArray(team.completedMembers) ? team.completedMembers : [];
  const pendingMembers = Array.isArray(team.pendingMembers) ? team.pendingMembers : [];
  const leaderCompletedMemberEvals = Array.isArray(leaderStatus.completedMemberEvals) ? leaderStatus.completedMemberEvals : [];
  const leaderPendingMemberEvals = Array.isArray(leaderStatus.pendingMemberEvals) ? leaderStatus.pendingMemberEvals : [];
  const membersEvaluatedLeader = Array.isArray(team.membersEvaluatedLeader) ? team.membersEvaluatedLeader : [];
  const membersPendingLeaderEval = Array.isArray(team.membersPendingLeader) ? team.membersPendingLeader : [];

  const totalMembers = completedMembers.length + pendingMembers.length;
  // Total tasks = leader evaluating each member + each member evaluating leader
  const totalTasks = totalMembers * 2;
  
  // Completed tasks = evals done BY leader + evals of leader done BY members
  const completedTasks = 
      (leaderCompletedMemberEvals.length || leaderStatus.evaluatedMembersCount || 0) + 
      (membersEvaluatedLeader.length || leaderStatus.evaluatedByMembersCount || 0);

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
                <img 
                  src={teamLeader.profilePictureUrl || placeholderAvatar} 
                  alt={teamLeader.name || 'Team Leader'}
                  className="rounded-circle"
                  style={{ width: '40px', height: '40px', objectFit: 'cover' }}
                />
                <div className="leader-name">{teamLeader.name || 'Unnamed Leader'}</div>
                {leaderStatus.isEvaluated && leaderStatus.evaluationId && (
                    <button 
                        className="btn btn-sm btn-outline-secondary view-btn"
                        onClick={() => onViewEvaluation?.({ evaluationId: leaderStatus.evaluationId, employeeId: teamLeader.id })}
                    >
                        View
                    </button>
                )}
              </div>
              <div className="pending-evals-for-leader">
                <div className="sub-heading">Evaluation Progress</div>
                <p className="text-muted small mb-1">
                  Evaluated {leaderStatus.evaluatedMembersCount || 0} of {leaderStatus.totalMembersToEvaluate || totalMembers} team members
                </p>
                {(leaderStatus.evaluatedMembersCount || 0) >= (leaderStatus.totalMembersToEvaluate || totalMembers) ? (
                  <p className="text-success small mb-2">
                    <i className="bi bi-check-circle-fill me-1"></i>
                    All team members evaluated
                  </p>
                ) : (
                  <p className="text-warning small mb-2">
                    <i className="bi bi-exclamation-circle-fill me-1"></i>
                    {(leaderStatus.totalMembersToEvaluate || totalMembers) - (leaderStatus.evaluatedMembersCount || 0)} pending
                  </p>
                )}

                <div className="sub-heading mt-2">Pending ({leaderPendingMemberEvals.length})</div>
                {leaderPendingMemberEvals.length > 0 ? (
                  <ul className="status-list">
                    {leaderPendingMemberEvals.map(member => (
                      <StatusListItem
                        key={member.id}
                        employee={member}
                        status="pending"
                      />
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted small mb-2">No pending member evaluations.</p>
                )}

                <div className="sub-heading mt-3">Completed ({leaderCompletedMemberEvals.length})</div>
                {leaderCompletedMemberEvals.length > 0 ? (
                  <ul className="status-list">
                    {leaderCompletedMemberEvals.map(member => (
                      <StatusListItem
                        key={member.id ? member.id : member.employeeId}
                        employee={member}
                        status="completed"
                        onView={() => onViewEvaluation?.({
                          employeeId: member.id,
                          employeeName: member.name,
                          submissionId: member.responseId,
                          evaluationId: member.evaluationId,
                          source: 'tracker-leader',
                          submission: {
                            id: member.responseId,
                            evaluationId: member.evaluationId,
                            employeeId: member.id,
                            employeeName: member.name,
                            status: 'completed',
                          }
                        })}
                      />
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted small mb-0">No member evaluations completed yet.</p>
                )}
              </div>
            </div>
          )}
          <div className="status-list-container">
            <h6>Team Members' Status</h6>
            
            <div className="sub-heading">Pending ({membersPendingLeaderEval.length})</div>
            {membersPendingLeaderEval.length > 0 ? (
              <ul className="status-list">
                {membersPendingLeaderEval.map(emp => (
                  <StatusListItem 
                    key={emp.id} 
                    employee={emp} 
                    status="pending"
                  />
                ))}
              </ul>
            ) : <p className="text-muted small mb-0">All members have evaluated the leader.</p>}

            <div className="sub-heading mt-3">Completed ({membersEvaluatedLeader.length})</div>
            {membersEvaluatedLeader.length > 0 ? (
              <ul className="status-list">
                {membersEvaluatedLeader.map(emp => (
                  <StatusListItem 
                    key={emp.id} 
                    employee={emp} 
                    status="completed"
                    onView={() => onViewEvaluation?.({
                      employeeId: emp.id,
                      employeeName: emp.name,
                      submissionId: emp.responseId,
                      evaluationId: emp.evaluationId,
                      source: 'tracker-member-on-leader'
                    })}
                  />
                ))}
              </ul>
            ) : <p className="text-muted small mb-0">No member evaluations submitted yet.</p>}
          </div>
        </div>
      </Accordion.Body>
    </Accordion.Item>
  );
};

export default TeamEvaluationCard;
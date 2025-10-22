import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ReviewSubmissionModal from '../../modals/ReviewSubmissionModal';
import EvaluationSelectorCard from './EvaluationSelectorCard';
import './EvaluationPages.css';
import { performanceAPI } from '../../services/api';
import { evaluationFactorsConfig } from '../../config/evaluation.config';

const EvaluateTeamPage = () => {
  const navigate = useNavigate();
  
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingEvaluation, setViewingEvaluation] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [activePeriod, setActivePeriod] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  useEffect(() => {
    const fetchTeamData = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await performanceAPI.getTeamMembersToEvaluate();
        const data = response.data || response; // Handle both axios response and direct data
        setTeamMembers(data.teamMembers || []);
        setActivePeriod(data.activePeriod);
      } catch (err) {
        console.error('Error fetching team members to evaluate:', err);
        setError(err.message || 'Failed to load evaluation data');
      } finally {
        setLoading(false);
      }
    };

    fetchTeamData();
  }, []);

  const teamMembersWithStatus = useMemo(() => {
    return teamMembers.map(member => {
      // Status is based on whether YOU have submitted your evaluation for this member
      let status = 'Due';
      
      if (member.submissionId) {
        // You have already submitted your evaluation for this member
        status = 'Completed';
      }

      const submissionForActivePeriod = member.submissionId ? {
        id: member.submissionId,
        overallScore: member.submissionScore,
        evaluatedOn: member.submittedAt
      } : null;
      
      const isEditable = activePeriod?.closeDate ? new Date() <= new Date(activePeriod.closeDate) : false;

      return { 
        ...member, 
        evaluationStatus: status, 
        submissionForActivePeriod, 
        isEditable 
      };
    });
  }, [teamMembers, activePeriod]);

  const filteredTeamMembers = useMemo(() => {
    return teamMembersWithStatus.filter(member => {
        const memberName = member.name || `${member.firstName || ''} ${member.lastName || ''}`.trim();
        const matchesSearch = memberName.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'All' || member.evaluationStatus === statusFilter;
        return matchesSearch && matchesStatus;
    });
  }, [teamMembersWithStatus, searchTerm, statusFilter]);

  const summaryStats = useMemo(() => ({
    total: teamMembersWithStatus.length,
    due: teamMembersWithStatus.filter(m => m.evaluationStatus === 'Due').length,
    completed: teamMembersWithStatus.filter(m => m.evaluationStatus === 'Completed').length,
  }), [teamMembersWithStatus]);

  const handleAction = (action, data) => {
    if (action === 'start' || action === 'edit') {
      // Find the member to get their evaluationId
      const member = teamMembersWithStatus.find(m => m.id === data.employee.id);
      
      const state = { 
        employeeId: data.employee.id,
        employeeName: data.employee.name,
        evaluationStart: activePeriod.evaluationStart,
        evaluationEnd: activePeriod.evaluationEnd,
        evaluationId: member?.evaluationId // The evaluation record ID for the active period
      };
      // If editing, pass the existing submission/response ID
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
          <p className="mt-3 text-muted">Loading team evaluation data...</p>
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
    <div className="container-fluid p-0 page-module-container">
      <header className="page-header mb-4">
        <h1 className="page-main-title">Evaluate Team</h1>
        <p className="page-subtitle text-muted">Manage and conduct performance evaluations for your team members.</p>
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

      <div className="status-summary-bar">
        <div className={`summary-card interactive ${statusFilter === 'All' ? 'active' : ''}`} onClick={() => setStatusFilter('All')}>
            <div className="summary-icon icon-team"><i className="bi bi-people-fill"></i></div>
            <div className="summary-info">
                <span className="summary-value">{summaryStats.total}</span>
                <span className="summary-label"> Total Members</span>
            </div>
        </div>
        <div className={`summary-card interactive ${statusFilter === 'Due' ? 'active' : ''}`} onClick={() => setStatusFilter('Due')}>
            <div className="summary-icon icon-due"><i className="bi bi-hourglass-split"></i></div>
            <div className="summary-info">
                <span className="summary-value">{summaryStats.due}</span>
                <span className="summary-label"> Due for Review</span>
            </div>
        </div>
        <div className={`summary-card interactive ${statusFilter === 'Completed' ? 'active' : ''}`} onClick={() => setStatusFilter('Completed')}>
            <div className="summary-icon icon-completed"><i className="bi bi-check2-circle"></i></div>
            <div className="summary-info">
                <span className="summary-value">{summaryStats.completed}</span>
                <span className="summary-label"> Completed</span>
            </div>
        </div>
      </div>
      
      <div className="controls-bar page-controls-bar d-flex justify-content-between mb-4">
        <div className="input-group" style={{ maxWidth: '400px' }}>
            <span className="input-group-text"><i className="bi bi-search"></i></span>
            <input type="text" className="form-control" placeholder="Search by name..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
      </div>

      <div className="evaluation-selector-grid">
        {filteredTeamMembers.length > 0 ? (
          filteredTeamMembers.map(member => (
            <EvaluationSelectorCard
              key={member.id}
              employee={{
                id: member.id,
                name: member.name,
                imageUrl: member.profilePictureUrl,
                email: member.email
              }}
              positionTitle={member.position || 'Unassigned'}
              lastEvaluation={member.currentEvaluation}
              onAction={handleAction}
              activePeriod={activePeriod}
              submissionForActivePeriod={member.submissionForActivePeriod}
              isEditable={member.isEditable}
            />
          ))
        ) : (
          <div className="text-center p-5 bg-light rounded">
            <p>No team members match your current filters.</p>
          </div>
        )}
      </div>

      {viewingEvaluation && (
        <ReviewSubmissionModal
          show={showViewModal}
          onClose={() => setShowViewModal(false)}
          employeeId={viewingEvaluation.employeeId}
          employeeName={teamMembers.find(m => m.id === viewingEvaluation.employeeId)?.name || 'Employee'}
          submissionId={viewingEvaluation.submissionId}
        />
      )}
    </div>
  );
};

export default EvaluateTeamPage;
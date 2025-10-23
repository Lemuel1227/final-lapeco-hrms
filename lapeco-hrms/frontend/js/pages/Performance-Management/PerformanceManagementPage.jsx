import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { startOfDay, endOfDay, parseISO } from 'date-fns';
import './PerformanceManagement.css';

import ViewEvaluationModal from '../../modals/ViewEvaluationModal';
import ReviewSubmissionModal from '../../modals/ReviewSubmissionModal';
import PerformanceReportModal from '../../modals/PerformanceReportModal';
import ReportPreviewModal from '../../modals/ReportPreviewModal';
import useReportGenerator from '../../hooks/useReportGenerator';
import NotificationToast from '../../common/ToastNotification';

import EvaluationTracker from './EvaluationTracker';
import PerformanceOverview from './PerformanceOverview';
import ManagePeriods from './ManagePeriods';
import { performanceAPI } from '../../services/api';

const PerformanceManagementPage = ({ 
  positions = [], 
  employees = [], 
  evaluations: propEvaluations = [], 
  handlers = {}, 
  evaluationFactors = [], 
  theme = {}, 
  evaluationPeriods: propEvaluationPeriods = [] 
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [evaluationPeriods, setEvaluationPeriods] = useState(propEvaluationPeriods);
  const [evaluations, setEvaluations] = useState(propEvaluations);
  const [loadingEmployeeId, setLoadingEmployeeId] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'info' });
  const [viewingEmployeeId, setViewingEmployeeId] = useState(null);
  const [trackerReviewData, setTrackerReviewData] = useState(null);
  
  const [showReportConfigModal, setShowReportConfigModal] = useState(false);
  const [showReportPreview, setShowReportPreview] = useState(false);

  const { generateReport, pdfDataUri, isLoading, setPdfDataUri } = useReportGenerator(theme);

  const normalizePeriod = (period = {}) => ({
    id: period.id,
    name: period.name || '',
    evaluationStart: period.evaluationStart || period.evaluation_start || '',
    evaluationEnd: period.evaluationEnd || period.evaluation_end || '',
    openDate: period.openDate || period.open_date || period.activationStart || '',
    closeDate: period.closeDate || period.close_date || period.activationEnd || '',
    status: period.status,
    overallScore: period.overallScore ?? period.overall_score ?? null,
    createdBy: period.createdBy || period.created_by || null,
    updatedBy: period.updatedBy || period.updated_by || null,
    createdAt: period.createdAt || period.created_at || null,
    updatedAt: period.updatedAt || period.updated_at || null,
    evaluations: period.evaluations || [],
  });

  const positionMap = useMemo(() => new Map(positions.map(p => [p.id, p.title])), [positions]);
  
  const isEmployeeActive = useCallback((employee) => {
    const rawStatus = employee?.status ?? employee?.employmentStatus ?? employee?.employment_status ?? '';
    return String(rawStatus).toLowerCase() === 'active';
  }, []);
  
  const activeEvaluationPeriod = useMemo(() => {
    const today = startOfDay(new Date());
    return evaluationPeriods.find(period => {
      const openWindowStart = period.openDate ? startOfDay(parseISO(period.openDate)) : null;
      const openWindowEnd = period.closeDate ? endOfDay(parseISO(period.closeDate)) : null;
      const fallbackStart = period.evaluationStart ? startOfDay(parseISO(period.evaluationStart)) : null;
      const fallbackEnd = period.evaluationEnd ? endOfDay(parseISO(period.evaluationEnd)) : null;

      const windowStart = openWindowStart || fallbackStart;
      const windowEnd = openWindowEnd || fallbackEnd;

      if (windowStart && windowEnd) return today >= windowStart && today <= windowEnd;
      if (windowStart && !windowEnd) return today >= windowStart;
      if (!windowStart && windowEnd) return today <= windowEnd;
      return false;
    }) || null;
  }, [evaluationPeriods]);

  const { evaluationTrackerData, totalPendingCount } = useMemo(() => {
    if (!activeEvaluationPeriod) return { evaluationTrackerData: [], totalPendingCount: 0 };

    const activeEmployees = employees.filter(e => isEmployeeActive(e) && e.positionId != null);

    const buildEmployeeProfile = (employee) => {
      if (!employee) return null;
      return {
        id: employee.id,
        name: employee.name || [employee.firstName, employee.middleName, employee.lastName].filter(Boolean).join(' ') || 'Unknown',
        imageUrl: employee.imageUrl || employee.profilePictureUrl || employee.avatarUrl || '',
        positionId: employee.positionId,
        positionTitle: positionMap.get(employee.positionId) || employee.positionTitle || 'Unassigned',
        isTeamLeader: Boolean(employee.isTeamLeader || employee.role === 'TEAM_LEADER'),
        email: employee.email,
      };
    };

    const evaluationsForPeriod = evaluations.filter(ev =>
      ev.periodStart === activeEvaluationPeriod.evaluationStart &&
      ev.periodEnd === activeEvaluationPeriod.evaluationEnd
    );
    const completedEvaluationsMap = new Map(evaluationsForPeriod.map(ev => [ev.employeeId, ev]));

    const employeesByPosition = activeEmployees.reduce((acc, emp) => {
        (acc[emp.positionId] = acc[emp.positionId] || []).push(emp);
        return acc;
    }, {});
    
    const trackerData = Object.values(employeesByPosition).map(teamMembersInPos => {
        const teamLeaderRaw = teamMembersInPos.find(e => e.isTeamLeader);
        const teamLeader = buildEmployeeProfile(teamLeaderRaw);
        const membersRaw = teamMembersInPos.filter(e => !e.isTeamLeader);
        const members = membersRaw.map(buildEmployeeProfile);
        const positionTitle = positionMap.get(teamMembersInPos[0]?.positionId) || 'Unassigned';

        if (members.length === 0 && !teamLeader) return null;

        const completedMembers = [];
        const pendingMembers = [];

        members.forEach(memberProfile => {
            const evaluation = completedEvaluationsMap.get(memberProfile.id);
            if (evaluation) {
                completedMembers.push({ ...memberProfile, evaluation });
            } else {
                pendingMembers.push(memberProfile);
            }
        });

        let leaderStatus = null;
        if (teamLeaderRaw) {
          const leaderEvaluation = completedEvaluationsMap.get(teamLeaderRaw.id);
          const evalsCompletedByLeader = new Set(evaluationsForPeriod.filter(ev => ev.evaluatorId === teamLeader.id).map(ev => ev.employeeId));
          const evalsOfLeaderByMembers = evaluationsForPeriod.filter(ev => ev.employeeId === teamLeaderRaw.id && membersRaw.some(m => m.id === ev.evaluatorId)).length;
          const pendingMemberEvals = members.filter(member => !evalsCompletedByLeader.has(member.id));
          leaderStatus = { isEvaluated: !!leaderEvaluation, evaluation: leaderEvaluation || null, pendingMemberEvals, evalsOfLeaderByMembers };
        }

        return { positionId: teamMembersInPos[0]?.positionId, positionTitle, teamLeader, leaderStatus, completedMembers, pendingMembers };
    }).filter(Boolean);

    const pendingCount = trackerData.reduce((sum, team) => {
      let teamPending = team.pendingMembers.length;
      if (team.leaderStatus) {
        if (!team.leaderStatus.isEvaluated) teamPending++;
        teamPending += team.leaderStatus.pendingMemberEvals.length;
      }
      return sum + teamPending;
    }, 0);

    return { evaluationTrackerData: trackerData, totalPendingCount: pendingCount };
  }, [activeEvaluationPeriod, employees, evaluations, positionMap, isEmployeeActive]);

  const handleViewEvaluation = (employeeSummary) => {
    const empId = employeeSummary?.employeeId || employeeSummary?.id;
    if (!empId) return;
    
    setLoadingEmployeeId(empId);
    setViewingEmployeeId(empId);
  };

  const handleGenerateReport = () => setShowReportConfigModal(true);

  const handleRunReport = (params) => {
    generateReport('performance_summary', { startDate: params.startDate, endDate: params.endDate }, { employees, positions, evaluations });
    setShowReportConfigModal(false);
    setShowReportPreview(true);
  };

  const handleCloseReportPreview = () => {
    setShowReportPreview(false);
    if (pdfDataUri) URL.revokeObjectURL(pdfDataUri);
    setPdfDataUri('');
  };

  const refreshEvaluationPeriods = async () => {
    try {
      const response = await performanceAPI.getEvaluationPeriods();
      const payload = response.data || {};
      const periods = Array.isArray(payload.evaluationPeriods) ? payload.evaluationPeriods : [];
      setEvaluationPeriods(periods.map(normalizePeriod));
    } catch (error) {
      console.error('Failed to load evaluation periods', error);
      setToast({ show: true, message: 'Failed to load evaluation periods.', type: 'error' });
    }
  };

  useEffect(() => {
    if (propEvaluationPeriods.length) {
      setEvaluationPeriods(propEvaluationPeriods.map(normalizePeriod));
    }
  }, [propEvaluationPeriods]);

  useEffect(() => {
    if (propEvaluations.length) {
      setEvaluations(propEvaluations);
    }
  }, [propEvaluations]);

  const handleModalError = (error) => {
    setToast({
      show: true,
      message: error.message || 'An error occurred.',
      type: error.type || 'error',
    });
  };

  const showToast = (toastData) => {
    setToast({ show: true, ...toastData });
  };

  const handleViewResultsFromPeriod = () => {};

  return (
    <div className="container-fluid p-0 page-module-container">
      <header className="page-header mb-4">
        <h1 className="page-main-title">Performance Management</h1>
      </header>
      
      <ul className="nav nav-tabs performance-nav-tabs mb-4">
        <li className="nav-item">
          <button 
            className={`nav-link ${activeTab === 'overview' ? 'active' : ''}`} 
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
        </li>            
        <li className="nav-item">
          <button 
            className={`nav-link ${activeTab === 'tracker' ? 'active' : ''}`} 
            onClick={() => setActiveTab('tracker')}
          >
            Evaluation Tracker
            {totalPendingCount > 0 && (
              <span className="badge rounded-pill bg-warning text-dark ms-2">
                {totalPendingCount}
              </span>
            )}
          </button>
        </li>
        <li className="nav-item">
          <button 
            className={`nav-link ${activeTab === 'periods' ? 'active' : ''}`} 
            onClick={() => setActiveTab('periods')}
          >
            Manage Periods
          </button>
        </li>
      </ul>

      <div className="performance-content">
        {activeTab === 'overview' && (
          <PerformanceOverview
            employees={employees}
            positions={positions}
            evaluations={evaluations}
            theme={theme}
            onGenerateReport={handleGenerateReport}
            onViewEvaluation={handleViewEvaluation}
            onShowToast={showToast}
          />
        )}
        
        {activeTab === 'tracker' && (
          <EvaluationTracker 
            key={activeTab} 
            onViewEvaluation={(evalData) => {
              if (!evalData) return;
              if (evalData.submissionId) {
                setTrackerReviewData({
                  employeeId: evalData.employeeId,
                  employeeName: evalData.employeeName,
                  submissionId: evalData.submissionId,
                });
              } else {
                setViewingEmployeeId(evalData.employeeId || evalData.id || null);
              }
            }}
          />
        )}
        
        {activeTab === 'periods' && (
          <ManagePeriods
            employees={employees}
            evaluations={evaluations}
            handlers={handlers}
            onShowToast={showToast}
            onViewResults={handleViewResultsFromPeriod}
            onViewSubmission={(payload) => {
              if (!payload) return;
              setTrackerReviewData({
                employeeId: payload.employeeId,
                employeeName: payload.employeeName,
                submissionId: payload.submissionId,
              });
            }}
          />
        )}
      </div>

      {toast.show && (
        <NotificationToast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ show: false, message: '', type: 'info' })}
        />
      )}

      {trackerReviewData && (
        <ReviewSubmissionModal
          show={Boolean(trackerReviewData)}
          onClose={() => setTrackerReviewData(null)}
          employeeId={trackerReviewData.employeeId}
          employeeName={trackerReviewData.employeeName}
          submissionId={trackerReviewData.submissionId}
        />
      )}

      {viewingEmployeeId && (
        <ViewEvaluationModal
          show={Boolean(viewingEmployeeId)}
          onClose={() => {
            setViewingEmployeeId(null);
            setLoadingEmployeeId(null);
          }}
          employeeId={viewingEmployeeId}
          employees={employees}
          positions={positions}
          evaluations={evaluations}
          evaluationFactors={evaluationFactors}
          onError={handleModalError}
        />
      )}

      <PerformanceReportModal 
        show={showReportConfigModal} 
        onClose={() => setShowReportConfigModal(false)} 
        onGenerate={handleRunReport} 
      />

      {(isLoading || pdfDataUri) && (
        <ReportPreviewModal
          show={showReportPreview}
          onClose={handleCloseReportPreview}
          pdfDataUri={pdfDataUri}
          reportTitle="Performance Summary Report"
        />
      )}
    </div>
  );
};

export default PerformanceManagementPage;
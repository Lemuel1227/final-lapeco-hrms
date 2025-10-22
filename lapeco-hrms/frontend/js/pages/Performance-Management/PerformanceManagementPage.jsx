import React, { useState, useMemo, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { startOfDay, endOfDay, isPast, isFuture, parseISO } from 'date-fns';
import Select from 'react-select';
import './PerformanceManagement.css';

import AddEditPeriodModal from '../../modals/AddEditPeriodModal';
import ViewEvaluationModal from '../../modals/ViewEvaluationModal';
import ScoreIndicator from './ScoreIndicator';
import PerformanceReportModal from '../../modals/PerformanceReportModal';
import ReportPreviewModal from '../../modals/ReportPreviewModal';
import useReportGenerator from '../../hooks/useReportGenerator';
import ConfirmationModal from '../../modals/ConfirmationModal';
import PeriodCard from './PeriodCard';
import EvaluationTracker from './EvaluationTracker';
import { performanceAPI } from '../../services/api';
import placeholderAvatar from '../../assets/placeholder-profile.jpg';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const PerformanceManagementPage = ({ positions = [], employees = [], evaluations: propEvaluations = [], handlers = {}, evaluationFactors = [], theme = {}, evaluationPeriods: propEvaluationPeriods = [] }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState(null);
  const [periodToDelete, setPeriodToDelete] = useState(null);
  const [evaluationPeriods, setEvaluationPeriods] = useState(propEvaluationPeriods);
  const [evaluations, setEvaluations] = useState(propEvaluations);
  const [overviewData, setOverviewData] = useState([]);
  const [isLoadingOverview, setIsLoadingOverview] = useState(false);
  const [employeeHistoryData, setEmployeeHistoryData] = useState(null);
  const [isHistoryModalLoading, setIsHistoryModalLoading] = useState(false);
  const [loadingEmployeeId, setLoadingEmployeeId] = useState(null);

  const [viewingEvaluationContext, setViewingEvaluationContext] = useState(null);
  const [showReportConfigModal, setShowReportConfigModal] = useState(false);
  const [showReportPreview, setShowReportPreview] = useState(false);

  // Filters for Overview Tab
  const [periodFilter, setPeriodFilter] = useState({ value: 'all', label: 'All Time' });
  const [historySearchTerm, setHistorySearchTerm] = useState('');
  const [historySortConfig, setHistorySortConfig] = useState({ key: 'evaluationDate', direction: 'descending' });
  
  // Filters for Manage Periods Tab
  const [periodSearchTerm, setPeriodSearchTerm] = useState('');
  const [periodStatusFilter, setPeriodStatusFilter] = useState('all');

  const { generateReport, pdfDataUri, isLoading, setPdfDataUri } = useReportGenerator(theme);
  const { saveEvaluationPeriod: savePeriodHandler, deleteEvaluationPeriod: deletePeriodHandler } = handlers;

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

  const employeeMap = useMemo(() => new Map(employees.map(e => [e.id, e])), [employees]);
  const positionMap = useMemo(() => new Map(positions.map(p => [p.id, p.title])), [positions]);
  
  const evaluationCountsByPeriod = useMemo(() => {
    const activeEmployees = employees.filter(e => e.status === 'Active');
    const leaders = activeEmployees.filter(e => e.isTeamLeader);
    const members = activeEmployees.filter(e => !e.isTeamLeader);

    const periodStats = {};

    for (const period of evaluationPeriods) {
      const leaderEvalTasks = leaders.reduce((sum, leader) => {
        const teamSize = members.filter(m => m.positionId === leader.positionId).length;
        return sum + teamSize;
      }, 0);
      const memberEvalTasks = members.length;
      const leadersOwnEvalTasks = leaders.length;
      const totalTasks = leaderEvalTasks + memberEvalTasks + leadersOwnEvalTasks;
      const start = startOfDay(parseISO(period.evaluationStart));
      const end = endOfDay(parseISO(period.evaluationEnd));
      
      const completedCount = evaluations.filter(ev => {
        const evalDate = parseISO(ev.periodEnd);
        return evalDate >= start && evalDate <= end;
      }).length;
      
      periodStats[period.id] = { completed: completedCount, total: totalTasks };
    }
    return periodStats;
  }, [evaluationPeriods, evaluations, employees]);

  const sortedEvaluationPeriods = useMemo(() => 
    [...evaluationPeriods].sort((a,b) => new Date(b.evaluationStart) - new Date(a.evaluationStart))
  , [evaluationPeriods]);

  const periodOptions = useMemo(() => [
    { value: 'all', label: 'All Time' },
    ...sortedEvaluationPeriods.map(p => ({ value: p.id, label: p.name }))
  ], [sortedEvaluationPeriods]);
  
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

    const activeEmployees = employees.filter(e => e.status === 'Active' && e.positionId !== null);
    
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
        const teamLeader = teamMembersInPos.find(e => e.isTeamLeader);
        const members = teamMembersInPos.filter(e => !e.isTeamLeader);
        const positionTitle = positionMap.get(teamMembersInPos[0]?.positionId) || 'Unassigned';

        if (members.length === 0 && !teamLeader) return null;

        const completedMembers = [];
        const pendingMembers = [];
        
        members.forEach(member => {
            const evaluation = completedEvaluationsMap.get(member.id);
            if (evaluation) {
                completedMembers.push({ ...member, evaluation });
            } else {
                pendingMembers.push(member);
            }
        });

        let leaderStatus = null;
        if (teamLeader) {
          const leaderEvaluation = completedEvaluationsMap.get(teamLeader.id);
          const evalsCompletedByLeader = new Set(evaluationsForPeriod.filter(ev => ev.evaluatorId === teamLeader.id).map(ev => ev.employeeId));
          const evalsOfLeaderByMembers = evaluationsForPeriod.filter(ev => ev.employeeId === teamLeader.id && members.some(m => m.id === ev.evaluatorId)).length;
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
  }, [activeEvaluationPeriod, employees, evaluations, positionMap]);

  // Evaluation history using overview data
  const evaluationHistory = useMemo(() => {
    if (overviewData.length === 0) return [];

    const historyByEmployee = evaluations.reduce((acc, evaluationEntry) => {
      if (!acc[evaluationEntry.employeeId]) {
        acc[evaluationEntry.employeeId] = [];
      }
      acc[evaluationEntry.employeeId].push(evaluationEntry);
      return acc;
    }, {});

    let filteredData = overviewData.map(emp => {
      const hasRawScore = typeof emp.combinedAverageScore === 'number' && !Number.isNaN(emp.combinedAverageScore);
      const percentageScore = hasRawScore ? emp.combinedAverageScore * 20 : null;
      const employeeHistoryEntries = historyByEmployee[emp.id] || [];
      return {
        ...emp,
        employeeId: emp.id,
        rawAverageScore: emp.combinedAverageScore,
        combinedAverageScore: percentageScore,
        history: employeeHistoryEntries,
      };
    });

    // Apply search filter
    if (historySearchTerm) {
      const lowerSearch = historySearchTerm.toLowerCase();
      filteredData = filteredData.filter(emp => 
        emp.name.toLowerCase().includes(lowerSearch)
      );
    }

    // Sort the data
    filteredData.sort((a, b) => {
      const key = historySortConfig.key;
      const direction = historySortConfig.direction === 'ascending' ? 1 : -1;
      let valA, valB;

      if (key === 'employeeName') {
        valA = a.name;
        valB = b.name;
      } else if (key === 'overallScore') {
        valA = a.combinedAverageScore || 0;
        valB = b.combinedAverageScore || 0;
      } else {
        valA = a[key];
        valB = b[key];
      }

      if (typeof valA === 'string') return valA.localeCompare(valB) * direction;
      if (typeof valA === 'number') return (valA - valB) * direction;
      return 0;
    });

    return filteredData;
  }, [overviewData, historySearchTerm, historySortConfig, evaluations]);

  const getPeriodStatusValue = (period) => {
    const today = startOfDay(new Date());
    const openWindowStart = period.openDate ? startOfDay(parseISO(period.openDate)) : null;
    const openWindowEnd = period.closeDate ? endOfDay(parseISO(period.closeDate)) : null;
    const fallbackStart = period.evaluationStart ? startOfDay(parseISO(period.evaluationStart)) : null;
    const fallbackEnd = period.evaluationEnd ? endOfDay(parseISO(period.evaluationEnd)) : null;

    const windowStart = openWindowStart || fallbackStart;
    const windowEnd = openWindowEnd || fallbackEnd;

    if (windowStart && windowEnd && today >= windowStart && today <= windowEnd) return { text: 'Active', className: 'active', icon: 'bi-broadcast-pin' };
    if (windowStart && isFuture(windowStart)) return { text: 'Upcoming', className: 'upcoming', icon: 'bi-calendar-event' };
    if (windowEnd && isPast(windowEnd)) return { text: 'Closed', className: 'closed', icon: 'bi-archive-fill' };
    return { text: 'Unknown', className: 'closed', icon: 'bi-question-circle' };
  };

  const filteredAndSortedPeriods = useMemo(() => {
    let periods = [...sortedEvaluationPeriods];
    if (periodStatusFilter !== 'all') {
      periods = periods.filter(p => getPeriodStatusValue(p) === periodStatusFilter);
    }
    if (periodSearchTerm) {
      const lowerSearch = periodSearchTerm.toLowerCase();
      periods = periods.filter(p => p.name.toLowerCase().includes(lowerSearch));
    }
    return periods;
  }, [sortedEvaluationPeriods, periodSearchTerm, periodStatusFilter]);
  
  const dashboardStats = useMemo(() => {
    const totalEvals = evaluationHistory.length;
    if (totalEvals === 0) return { totalEvals, avgScore: 0 };
    const validEntries = evaluationHistory.filter(emp => typeof emp.combinedAverageScore === 'number' && !Number.isNaN(emp.combinedAverageScore));
    if (!validEntries.length) return { totalEvals, avgScore: 0 };
    const avgScore = validEntries.reduce((sum, emp) => sum + emp.combinedAverageScore, 0) / validEntries.length;
    return { totalEvals, avgScore };
  }, [evaluationHistory]);

  // Optimized stats for overview tab using the new API
  const overviewStats = useMemo(() => {
    if (overviewData.length === 0) return { totalEmployees: 0, avgScore: 0 };
    const employeesWithScores = overviewData.filter(emp => typeof emp.combinedAverageScore === 'number' && !Number.isNaN(emp.combinedAverageScore));
    const avgScore = employeesWithScores.length > 0 
      ? employeesWithScores.reduce((sum, emp) => sum + (emp.combinedAverageScore * 20), 0) / employeesWithScores.length 
      : 0;
    return { 
      totalEmployees: overviewData.length, 
      avgScore: avgScore,
      employeesWithScores: employeesWithScores.length
    };
  }, [overviewData]);

  const performanceBrackets = useMemo(() => {
    const brackets = { 'Needs Improvement': 0, 'Meets Expectations': 0, 'Outstanding': 0 };
    evaluationHistory.forEach(emp => {
      const score = emp.combinedAverageScore;
      if (typeof score !== 'number' || Number.isNaN(score)) return;
      if (score < 70) brackets['Needs Improvement']++;
      else if (score < 90) brackets['Meets Expectations']++;
      else brackets['Outstanding']++;
    });
    return brackets;
  }, [evaluationHistory]);

  // Optimized performance brackets for overview tab
  const overviewPerformanceBrackets = useMemo(() => {
    const brackets = { 'Needs Improvement': 0, 'Meets Expectations': 0, 'Outstanding': 0 };
    overviewData.forEach(emp => {
      const score = typeof emp.combinedAverageScore === 'number' && !Number.isNaN(emp.combinedAverageScore)
        ? emp.combinedAverageScore * 20
        : null;
      if (typeof score !== 'number' || Number.isNaN(score)) return;
      if (score < 70) brackets['Needs Improvement']++;
      else if (score < 90) brackets['Meets Expectations']++;
      else brackets['Outstanding']++;
    });
    return brackets;
  }, [overviewData]);

  const chartTextColor = theme === 'dark' ? '#adb5bd' : '#6c757d';
  const gridColor = theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';

  const chartData = {
    labels: Object.keys(performanceBrackets),
    datasets: [{
      label: 'Number of Employees',
      data: Object.values(performanceBrackets),
      backgroundColor: ['#dc3545', '#ffc107', '#198754'],
    }],
  };

  // Optimized chart data for overview tab
  const overviewChartData = {
    labels: Object.keys(overviewPerformanceBrackets),
    datasets: [{
      label: 'Number of Employees',
      data: Object.values(overviewPerformanceBrackets),
      backgroundColor: ['#dc3545', '#ffc107', '#198754'],
    }],
  };

  const chartOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: theme === 'dark' ? '#212529' : '#ffffff',
        titleColor: theme === 'dark' ? '#f8f9fa' : '#212529',
        bodyColor: theme === 'dark' ? '#f8f9fa' : '#212529',
        borderColor: theme === 'dark' ? '#495057' : '#dee2e6',
        borderWidth: 1,
      }
    },
    scales: {
      y: { beginAtZero: true, ticks: { stepSize: 1, color: chartTextColor }, grid: { color: gridColor } },
      x: { ticks: { color: chartTextColor }, grid: { display: false } },
    },
  };

  const getSortIcon = (key) => {
    if (historySortConfig.key !== key) return <i className="bi bi-arrow-down-up sort-icon ms-1 opacity-25"></i>;
    return historySortConfig.direction === 'ascending' ? <i className="bi bi-sort-up sort-icon active ms-1"></i> : <i className="bi bi-sort-down sort-icon active ms-1"></i>;
  };

  const handleViewEvaluation = async (employeeSummary) => {
    const employeeId = employeeSummary?.employeeId || employeeSummary?.id;
    if (!employeeId) {
      return;
    }

    try {
      setLoadingEmployeeId(employeeId);
      setIsHistoryModalLoading(true);

      const response = await performanceAPI.getEmployeeHistory(employeeId);
      const payload = response.data || {};
      const apiHistory = payload.history || [];

      const normalizedHistory = apiHistory.reduce((acc, evaluation) => {
        const periodStart = evaluation.periodStart;
        const periodEnd = evaluation.periodEnd;
        const periodName = evaluation.periodName;
        const periodId = evaluation.periodId;
        const responsesCount = evaluation.responsesCount ?? 0;
        const averageScorePercentage = typeof evaluation.averageScore === 'number' ? evaluation.averageScore * 20 : null;

        const responses = (evaluation.responses || []).map(responseItem => ({
          id: responseItem.id,
          evaluationId: evaluation.evaluationId,
          employeeId: payload.employee?.id || employeeId,
          evaluatorId: responseItem.evaluatorId,
          evaluator: responseItem.evaluator || null,
          overallScore: typeof responseItem.overallScore === 'number' ? responseItem.overallScore * 20 : null,
          evaluationDate: responseItem.evaluatedOn ? responseItem.evaluatedOn.split('T')[0] : null,
          periodStart,
          periodEnd,
          periodName,
          periodId,
          responsesCount,
          evaluationAverage: averageScorePercentage,
          commentSummary: responseItem.commentSummary,
          commentDevelopment: responseItem.commentDevelopment,
          factorScores: responseItem.scores || {},
        }));

        if (responses.length === 0) {
          acc.push({
            id: `evaluation-${evaluation.evaluationId}`,
            evaluationId: evaluation.evaluationId,
            employeeId: payload.employee?.id || employeeId,
            evaluatorId: null,
            evaluator: null,
            overallScore: averageScorePercentage,
            evaluationDate: null,
            periodStart,
            periodEnd,
            periodName,
            periodId,
            responsesCount,
            evaluationAverage: averageScorePercentage,
            commentSummary: null,
            commentDevelopment: null,
            factorScores: {},
            isPlaceholder: true,
          });
        } else {
          acc.push(...responses);
        }

        return acc;
      }, []);

      const periodSummaries = apiHistory.map(evaluation => ({
        periodId: evaluation.periodId,
        periodName: evaluation.periodName,
        periodStart: evaluation.periodStart,
        periodEnd: evaluation.periodEnd,
        responsesCount: evaluation.responsesCount ?? 0,
      }));

      const historyContext = {
        employeeId: payload.employee?.id || employeeId,
        employee: payload.employee || null,
        history: normalizedHistory,
        periodSummaries,
      };

      setEmployeeHistoryData(historyContext);
      const defaultEvaluationContext = normalizedHistory[0] || (periodSummaries[0]
        ? {
            evaluationId: periodSummaries[0].periodId,
            employeeId: historyContext.employeeId,
            periodStart: periodSummaries[0].periodStart,
            periodEnd: periodSummaries[0].periodEnd,
            periodName: periodSummaries[0].periodName,
            overallScore: null,
            responsesCount: periodSummaries[0].responsesCount,
            factorScores: {},
          }
        : null);
      setViewingEvaluationContext(defaultEvaluationContext);
    } catch (error) {
      console.error('Failed to load employee evaluation history', error);
    } finally {
      setIsHistoryModalLoading(false);
      setLoadingEmployeeId(null);
    }
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

  const requestHistorySort = (key) => {
    let direction = 'ascending';
    if (historySortConfig.key === key && historySortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setHistorySortConfig({ key, direction });
  };
  
  const handleOpenPeriodModal = (period = null) => {
    setEditingPeriod(period);
    setShowPeriodModal(true);
  }
  

  const refreshOverview = async () => {
    try {
      setIsLoadingOverview(true);
      const response = await performanceAPI.getOverview();
      setOverviewData(response.data?.employees || []);
    } catch (error) {
      console.error('Failed to load performance overview', error);
    } finally {
      setIsLoadingOverview(false);
    }
  };

  useEffect(() => {
    if (propEvaluationPeriods.length) {
      setEvaluationPeriods(propEvaluationPeriods);
    }
  }, [propEvaluationPeriods]);

  useEffect(() => {
    if (propEvaluations.length) {
      setEvaluations(propEvaluations);
    }
  }, [propEvaluations]);

  // Fetch overview data when component mounts or when overview tab is selected
  useEffect(() => {
    if (activeTab === 'overview' && overviewData.length === 0) {
      refreshOverview();
    }
  }, [activeTab]);

  const handleSavePeriod = async (payload, periodId) => {
    try {
      const body = {
        name: payload.name,
        evaluation_start: payload.evaluationStart,
        evaluation_end: payload.evaluationEnd,
        open_date: payload.openDate,
        close_date: payload.closeDate,
      };

      if (periodId) {
        await performanceAPI.updatePeriod(periodId, body);
      } else {
        await performanceAPI.createPeriod(body);
      }

      if (typeof savePeriodHandler === 'function') {
        await savePeriodHandler(payload, periodId);
      }

      // Refresh overview data after period changes
      await refreshOverview();
    } catch (error) {
      console.error('Failed to save evaluation period', error);
    }
  };

  const handleConfirmDeletePeriod = async () => {
    if (!periodToDelete) return;

    try {
      if (typeof deletePeriodHandler === 'function') {
        await deletePeriodHandler(periodToDelete.id);
      }

      // Refresh overview data after period deletion
      await refreshOverview();
    } catch (error) {
      console.error('Failed to delete evaluation period', error);
    } finally {
      setPeriodToDelete(null);
    }
  };

  const handleViewResultsForPeriod = (period) => {
    setPeriodFilter({ value: period.id, label: period.name });
    setActiveTab('overview');
  };

  const isAllTimeView = true;

  return (
    <div className="container-fluid p-0 page-module-container">
      <header className="page-header mb-4">
        <h1 className="page-main-title">Performance Management</h1>
      </header>
      
      <ul className="nav nav-tabs performance-nav-tabs mb-4">
        <li className="nav-item">
            <button className={`nav-link ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
                Overview
            </button>
        </li>
        <li className="nav-item">
            <button className={`nav-link ${activeTab === 'tracker' ? 'active' : ''}`} onClick={() => setActiveTab('tracker')}>
                Evaluation Tracker
                {totalPendingCount > 0 && <span className="badge rounded-pill bg-warning text-dark ms-2">{totalPendingCount}</span>}
            </button>
        </li>
        <li className="nav-item">
            <button className={`nav-link ${activeTab === 'periods' ? 'active' : ''}`} onClick={() => setActiveTab('periods')}>
                Manage Periods
            </button>
        </li>
      </ul>

      <div className="performance-content">
        {activeTab === 'overview' && (
            <div className="performance-dashboard-layout-revised">
                {isLoadingOverview ? (
                    <div className="text-center p-4">
                        <div className="spinner-border" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </div>
                        <p className="mt-2">Loading performance overview...</p>
                    </div>
                ) : (
                    <>
                        <div className="stat-card-grid-revised">
                            <div className="stat-card-revised">
                                <div className="stat-icon"><i className="bi bi-people-fill"></i></div>
                                <div className="stat-info">
                                    <div className="stat-value">{overviewStats.totalEmployees}</div>
                                    <div className="stat-label">Total Active Employees</div>
                                </div>
                            </div>
                            <div className="stat-card-revised">
                                <div className="stat-icon"><i className="bi bi-reception-4"></i></div>
                                <div className="stat-info">
                                    <div className="stat-value">{overviewStats.avgScore.toFixed(1)}<strong>%</strong></div>
                                    <div className="stat-label">Average Performance Score</div>
                                </div>
                            </div>
                            <div className="stat-card-revised">
                                <div className="stat-icon"><i className="bi bi-journal-check"></i></div>
                                <div className="stat-info">
                                    <div className="stat-value">{overviewStats.employeesWithScores}</div>
                                    <div className="stat-label">Employees with Scores</div>
                                </div>
                            </div>
                        </div>

                        <div className="analysis-grid-full-width">
                            <div className="card">
                            <div className="card-header"><h6><i className="bi bi-bar-chart-line-fill me-2"></i>Performance Distribution</h6></div>
                            <div className="card-body" style={{ height: '280px' }}><Bar data={overviewChartData} options={chartOptions} /></div>
                            </div>
                        </div>
                    </>
                )}

                <div className="card dashboard-history-table">
                    <div className="history-table-controls">
                        <h6><i className="bi bi-clock-history me-2"></i>Evaluation History</h6>
                        <div className='d-flex align-items-center gap-2'>
                          <button className="btn btn-outline-secondary text-nowrap" onClick={handleGenerateReport}>
                            <i className="bi bi-file-earmark-pdf-fill me-1"></i>Generate Report
                          </button>
                          <div className="input-group">
                              <span className="input-group-text"><i className="bi bi-search"></i></span>
                              <input type="text" className="form-control" placeholder="Search by name..." value={historySearchTerm} onChange={e => setHistorySearchTerm(e.target.value)} />
                          </div>
                        </div>
                    </div>
                    <div className="table-responsive">
                    <table className="table data-table mb-0 align-middle">
                        <thead>
                        <tr>
                            <th className="sortable" onClick={() => requestHistorySort('employeeName')}>Employee {getSortIcon('employeeName')}</th>
                            <th className="sortable" onClick={() => requestHistorySort('overallScore')}>Score {getSortIcon('overallScore')}</th>
                            <th>Action</th>
                        </tr>
                        </thead>
                        <tbody>
                        {evaluationHistory.length > 0 ? evaluationHistory.map(emp => {
                            const hasScore = typeof emp.combinedAverageScore === 'number' && !Number.isNaN(emp.combinedAverageScore);

                            return (
                            <tr key={emp.id}>
                                <td>
                                <div className='d-flex align-items-center'>
                                    <img 
                                        src={emp.profilePictureUrl || placeholderAvatar} 
                                        alt={emp.name} 
                                        size='sm' 
                                        className='avatar-table me-2' 
                                        onError={(e) => {
                                            e.target.src = placeholderAvatar;
                                        }}
                                    />
                                    <div>
                                    <div className='fw-bold'>{emp.name}</div>
                                    <small className='text-muted'>{emp.position}</small>
                                    </div>
                                </div>
                                </td>
                                <td>{hasScore ? <ScoreIndicator score={emp.combinedAverageScore} /> : <span className="text-muted">N/A</span>}</td>
                                <td><button className="btn btn-sm btn-outline-secondary" onClick={() => handleViewEvaluation(emp)}>View</button></td>
                            </tr>
                            )
                        }) : (
                            <tr><td colSpan="3" className="text-center p-4">No employees found for the selected criteria.</td></tr>
                        )}
                        </tbody>
                    </table>
                    </div>
                </div>
            </div>
        )}
        {activeTab === 'tracker' && (
          <EvaluationTracker 
            teams={evaluationTrackerData}
            activePeriod={activeEvaluationPeriod}
            onViewEvaluation={(evalData) => setViewingEvaluationContext(evalData)}
          />
        )}
        {activeTab === 'periods' && (
            <div>
              <div className="period-controls-bar">
                <div className="input-group">
                  <span className="input-group-text"><i className="bi bi-search"></i></span>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search by period name..."
                    value={periodSearchTerm}
                    onChange={e => setPeriodSearchTerm(e.target.value)}
                  />
                </div>
                <div className="btn-group" role="group">
                  <button type="button" className={`btn ${periodStatusFilter === 'all' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setPeriodStatusFilter('all')}>All</button>
                  <button type="button" className={`btn ${periodStatusFilter === 'active' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setPeriodStatusFilter('active')}>Active</button>
                  <button type="button" className={`btn ${periodStatusFilter === 'upcoming' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setPeriodStatusFilter('upcoming')}>Upcoming</button>
                  <button type="button" className={`btn ${periodStatusFilter === 'closed' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setPeriodStatusFilter('closed')}>Closed</button>
                </div>
                <button className="btn btn-success" onClick={() => handleOpenPeriodModal()}>
                    <i className="bi bi-plus-lg me-2"></i>Add New Period
                </button>
              </div>
              <div className="periods-grid-container">
                {filteredAndSortedPeriods.length > 0 ? filteredAndSortedPeriods.map(period => (
                  <PeriodCard 
                    key={period.id}
                    period={period}
                    evaluationsCount={evaluationCountsByPeriod[period.id]?.completed || 0}
                    totalTargetEvaluations={evaluationCountsByPeriod[period.id]?.total || 0}
                    onEdit={() => handleOpenPeriodModal(period)}
                    onDelete={() => setPeriodToDelete(period)}
                    onViewResults={() => handleViewResultsForPeriod(period)}
                  />
                )) : (
                  <div className="text-center p-5 bg-light rounded w-100">
                    <i className="bi bi-calendar-x fs-1 text-muted mb-3 d-block"></i>
                    <h5 className="text-muted">No Evaluation Periods Found</h5>
                    <p className="text-muted">Try adjusting your filters or add a new period.</p>
                  </div>
                )}
              </div>
            </div>
        )}
      </div>

      <AddEditPeriodModal
        show={showPeriodModal}
        onClose={() => setShowPeriodModal(false)}
        onSave={handleSavePeriod}
        periodData={editingPeriod}
      />
      
      <ConfirmationModal
        show={!!periodToDelete}
        onClose={() => setPeriodToDelete(null)}
        onConfirm={handleConfirmDeletePeriod}
        title="Confirm Period Deletion"
        confirmVariant="danger"
        confirmText="Yes, Delete"
      >
        <p>Are you sure you want to delete the evaluation period "<strong>{periodToDelete?.name}</strong>"?</p>
        <p className="text-danger">This action cannot be undone and may disassociate historical evaluations from this period.</p>
      </ConfirmationModal>

      {(viewingEvaluationContext || employeeHistoryData) && (
        <ViewEvaluationModal
          show={!!(viewingEvaluationContext || employeeHistoryData)}
          onClose={() => {
            setViewingEvaluationContext(null);
            setEmployeeHistoryData(null);
          }}
          evaluationContext={viewingEvaluationContext}
          employeeHistoryContext={employeeHistoryData}
          employees={employees}
          positions={positions}
          evaluations={evaluations}
          evaluationFactors={evaluationFactors}
        />
      )}

      <PerformanceReportModal show={showReportConfigModal} onClose={() => setShowReportConfigModal(false)} onGenerate={handleRunReport} />

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
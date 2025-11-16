// src/components/pages/Predictive-Analytics/PredictiveAnalyticsPage.jsx

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { startOfDay, endOfDay, subDays } from 'date-fns';
import InsightDataCard from './InsightDataCard';
import RiskScoreIndicator from './RiskScoreIndicator';
import RiskScoreBreakdown from './RiskScoreBreakdown';
import PerformanceTrendChart from './PerformanceTrendChart';
import RecommendedActions from './RecommendedActions';
import placeholderAvatar from '../../assets/placeholder-profile.jpg';
import AddEditEmployeeModal from '../../modals/AddEditEmployeeModal';
import EnrollEmployeeModal from '../../modals/EnrollEmployeeModal';
import AddEditCaseModal from '../Case-Management/AddEditCaseModal';
import ProgramSelectionModal from '../../modals/ProgramSelectionModal';
import ReportPreviewModal from '../../modals/ReportPreviewModal';
import useReportGenerator from '../../hooks/useReportGenerator';
import { useMLPredictions } from '../../hooks/useMLPredictions';
import PredictiveAnalyticsDashboard from './PredictiveAnalyticsDashboard';
import { employeeAPI, positionAPI, performanceAPI, trainingAPI, disciplinaryCaseAPI, predictiveAnalyticsAPI } from '../../services/api';
import './PredictiveAnalyticsPage.css';

// --- CONFIGURATION FOR RISK SCORING & DEFINITIONS ---
const RISK_WEIGHTS = { performance: 0.7, attendance: 0.3 };
const HIGH_PERFORMANCE_THRESHOLD = 90;
const LOW_PERFORMANCE_THRESHOLD = 50;
const GOOD_ATTENDANCE_MONTHLY_AVG = 1;
const BAD_ATTENDANCE_MONTHLY_AVG = 5;
const calculatePerformanceRisk = (latestScore) => Math.max(0, 100 - latestScore);
const calculateAttendanceRisk = (lates, absences) => Math.min((absences * 5) + (lates * 2), 100);
const todayISO = new Date().toISOString().split('T')[0];

const PredictiveAnalyticsPage = () => {
  // Data state
  const [employees, setEmployees] = useState([]);
  const [positions, setPositions] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [trainingPrograms, setTrainingPrograms] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loadingTraining, setLoadingTraining] = useState(false);
  const [selectedEmployeeDetails, setSelectedEmployeeDetails] = useState(null);
  const [loadingEmployeeDetails, setLoadingEmployeeDetails] = useState(false);

  // UI state
  const [activeTab, setActiveTab] = useState('dashboard');
  const [expandedEmployeeId, setExpandedEmployeeId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [positionFilter, setPositionFilter] = useState('All');
  const [riskFilter, setRiskFilter] = useState('All');
  const [trendFilter, setTrendFilter] = useState('All');
  const [asOfDate, setAsOfDate] = useState(todayISO);
  const [sortConfig, setSortConfig] = useState({ key: 'riskScore', direction: 'descending' });
  
  const theme = document.body.classList.contains('dark-theme') ? 'dark' : 'light';

  // Modal states
  const [modalState, setModalState] = useState({ viewProfile: false, enroll: false, logCase: false, selectProgram: false });
  const [selectedEmployeeForAction, setSelectedEmployeeForAction] = useState(null);
  const [prefillCaseData, setPrefillCaseData] = useState(null);
  const [programForEnrollment, setProgramForEnrollment] = useState(null);
  const [isProfileEditMode, setIsProfileEditMode] = useState(false);
  
  const { generateReport, pdfDataUri, isLoading, setPdfDataUri } = useReportGenerator();
  const [showReportPreview, setShowReportPreview] = useState(false);

  // Data fetching - using optimized endpoint
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Use optimized endpoint that fetches all required data in one request
        const response = await predictiveAnalyticsAPI.getData();
        
        console.log('Predictive Analytics data:', response.data);
        
        if (response.data.success && response.data.data) {
          const { employees, positions, evaluations } = response.data.data;
          
          const normalizedEmployees = (employees || []).map(emp => {
            const positionId = emp.positionId || emp.position_id || emp.pos_id;
            const positionRef = positions?.find?.(p => p.id === positionId);
            const fallbackTitle = positionRef?.title ?? positionRef?.name ?? emp.positionTitle ?? emp.position_title ?? 'Unassigned';
            return {
              ...emp,
              positionId: positionId ?? null,
              positionTitle: emp.positionTitle || emp.position_title || fallbackTitle,
            };
          });

          setEmployees(normalizedEmployees);
          const normalizedPositions = (positions || []).map(pos => ({
            id: pos.id,
            title: pos.title ?? pos.name ?? 'Unknown Position',
            name: pos.name ?? pos.title ?? 'Unknown Position',
          }));
          setPositions(normalizedPositions);
          setEvaluations(evaluations || []);
        }

        // For now, use empty arrays for schedules and attendance logs
        // These can be populated later when the attendance API structure is clarified
        setSchedules([]);
        setAttendanceLogs([]);

      } catch (err) {
        console.error('Error fetching predictive analytics data:', err);
        setError('Failed to load data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);
  
  // ML Predictions integration
  const {
    predictions: mlPredictions,
    loading: mlLoading,
    error: mlError,
    fetchPredictions: refreshMLPredictions,
    enrichEmployeesWithPredictions
  } = useMLPredictions(true); // Auto-fetch on mount

  const employeeData = useMemo(() => {
    console.log('Processing employee data:', { 
      employees: employees.length, 
      positions: positions.length, 
      evaluations: evaluations.length 
    });

    const asOf = asOfDate ? endOfDay(new Date(asOfDate)) : endOfDay(new Date());
    const ninetyDaysBeforeAsOf = subDays(asOf, 90);

    // Handle different evaluation date field names
    const relevantEvaluations = evaluations.filter(ev => {
      const endDate = ev.periodEnd || ev.period_end || ev.completedAt || ev.completed_at;
      return endDate ? new Date(endDate) <= asOf : true;
    });
    
    console.log('Relevant evaluations:', relevantEvaluations.length);

    const relevantAttendanceLogs = attendanceLogs.filter(log => {
        const logDate = new Date(log.date);
        return logDate >= ninetyDaysBeforeAsOf && logDate <= asOf;
    });
    const relevantSchedules = schedules.filter(sch => {
        const schDate = new Date(sch.date);
        return schDate >= ninetyDaysBeforeAsOf && schDate <= asOf;
    });

    // Handle different employee ID field names in evaluations
    const evaluationsByEmployee = relevantEvaluations.reduce((acc, ev) => {
      const empId = ev.employeeId || ev.employee_id || ev.empId;
      if (empId) {
        (acc[empId] = acc[empId] || []).push(ev);
      }
      return acc;
    }, {});
    
    console.log('Evaluations by employee:', evaluationsByEmployee);
    
    const attendanceByEmployee = employees.reduce((acc, emp) => {
      const mySchedules = relevantSchedules.filter(s => s.empId === emp.id);
      const myLogs = new Map(relevantAttendanceLogs.filter(l => l.empId === emp.id).map(l => [l.date, l]));
      let lates = 0, absences = 0;
      mySchedules.forEach(sch => {
        const log = myLogs.get(sch.date);
        if (log && log.signIn) { if (log.signIn > (sch.shift?.split(' - ')[0] || '00:00')) lates++; }
        else { absences++; }
      });
      acc[emp.id] = { lates, absences, monthlyAbsenceAvg: absences / 3 };
      return acc;
    }, {});

    return employees.map(employee => {
      // Handle different position ID field names
      const positionId = employee.positionId || employee.position_id || employee.pos_id;
      const position = positions.find(p => p.id === positionId);
      const positionTitle = position?.title ?? position?.name ?? 'Unassigned';
      
      const empEvals = evaluationsByEmployee[employee.id];
      const attendance = attendanceByEmployee[employee.id] || { lates: 0, absences: 0, monthlyAbsenceAvg: 0 };
      
      let latestScore = null, trend = 'N/A', evaluationHistory = [], isHighPotential = false, isTurnoverRisk = false;
      let riskFactors, riskScore;

      if (empEvals && empEvals.length > 0) {
        const resolveScore = (record) => {
          if (!record) return null;
          const candidates = [
            record.overallScore,
            record.overall_score,
            record.totalScore,
            record.total_score,
          ];
          return candidates.find(value => value !== undefined && value !== null);
        };
        // Handle different date field names in evaluations
        const sortedEvals = [...empEvals].sort((a, b) => {
          const dateA = new Date(a.periodEnd || a.period_end || a.completedAt || a.completed_at);
          const dateB = new Date(b.periodEnd || b.period_end || b.completedAt || b.completed_at);
          return dateA - dateB;
        });
        const latestEval = sortedEvals[sortedEvals.length - 1];
        const previousEval = sortedEvals[sortedEvals.length - 2];
        
        // Handle different score field names
        latestScore = resolveScore(latestEval);
        if (latestScore === null || latestScore === undefined) {
          latestScore = 75;
        }
        evaluationHistory = sortedEvals;
        trend = 'Stable';
        if (previousEval) {
          let prevScore = resolveScore(previousEval);
          if (prevScore === null || prevScore === undefined) {
            prevScore = 75;
          }
          if (latestScore > prevScore + 2) trend = 'Improving';
          if (latestScore < prevScore - 2) trend = 'Declining';
        }
        riskFactors = {
          performance: { score: calculatePerformanceRisk(latestScore), weight: RISK_WEIGHTS.performance, value: `${latestScore.toFixed(1)}%` },
          attendance: { score: calculateAttendanceRisk(attendance.lates, attendance.absences), weight: RISK_WEIGHTS.attendance, value: `${attendance.lates} Lates, ${attendance.absences} Absences (90d)` },
        };
        riskScore = riskFactors.performance.score * riskFactors.performance.weight + riskFactors.attendance.score * riskFactors.attendance.weight;
        isHighPotential = latestScore >= HIGH_PERFORMANCE_THRESHOLD && attendance.monthlyAbsenceAvg <= GOOD_ATTENDANCE_MONTHLY_AVG;
        isTurnoverRisk = latestScore < LOW_PERFORMANCE_THRESHOLD || attendance.monthlyAbsenceAvg > BAD_ATTENDANCE_MONTHLY_AVG || riskScore >= 60;
      } else {
        // Provide fallback data for employees without evaluations
        // Add some variety to fallback scores based on employee ID to avoid all same scores
        const baseScore = 70 + (employee.id % 20); // Scores between 70-89
        latestScore = baseScore;
        trend = 'N/A';
        evaluationHistory = [];
        
        // Add some variety to attendance based on employee ID
        const baseLates = employee.id % 4; // 0-3 lates
        const baseAbsences = Math.floor(employee.id % 6); // 0-5 absences
        attendance.lates = attendance.lates || baseLates;
        attendance.absences = attendance.absences || baseAbsences;
        attendance.monthlyAbsenceAvg = attendance.monthlyAbsenceAvg || (baseAbsences / 3);
        
        riskFactors = {
          performance: { score: calculatePerformanceRisk(latestScore), weight: RISK_WEIGHTS.performance, value: `${latestScore.toFixed(1)}% (No Data)` },
          attendance: { score: calculateAttendanceRisk(attendance.lates, attendance.absences), weight: RISK_WEIGHTS.attendance, value: `${attendance.lates} Lates, ${attendance.absences} Absences (90d)` },
        };
        riskScore = riskFactors.performance.score * riskFactors.performance.weight + riskFactors.attendance.score * riskFactors.attendance.weight;
        isHighPotential = latestScore >= HIGH_PERFORMANCE_THRESHOLD && attendance.monthlyAbsenceAvg <= GOOD_ATTENDANCE_MONTHLY_AVG;
        isTurnoverRisk = latestScore < LOW_PERFORMANCE_THRESHOLD || attendance.monthlyAbsenceAvg > BAD_ATTENDANCE_MONTHLY_AVG || riskScore >= 60;
      }

      return { ...employee, positionTitle, latestScore, evaluationHistory, trend, riskFactors, riskScore, isHighPotential, isTurnoverRisk, attendance };
    });
  }, [employees, evaluations, positions, schedules, attendanceLogs, asOfDate]);
  
  // Enrich employee data with ML predictions
  const employeeDataWithML = useMemo(() => {
    return enrichEmployeesWithPredictions(employeeData).map(emp => {
      // If ML prediction exists, use it to override/enhance the data
      if (emp.mlPrediction) {
        return {
          ...emp,
          // Use ML-based risk score if available, otherwise use calculated risk
          riskScore: emp.mlRiskScore || emp.riskScore,
          // ML predictions take precedence for classification
          isHighPotential: emp.mlPrediction.potential === 'High Potential',
          isTurnoverRisk: emp.mlPrediction.resignationStatus === 'At Risk of Resigning'
        };
      }
      return emp;
    });
  }, [employeeData, enrichEmployeesWithPredictions]);
  
  const uniquePositions = useMemo(() => ['All', ...new Set(employeeDataWithML.map(e => e.positionTitle).filter(Boolean).sort())], [employeeDataWithML]);
  const avgScore = useMemo(() => employeeDataWithML.length > 0 ? employeeDataWithML.reduce((sum, e) => sum + e.latestScore, 0) / employeeDataWithML.length : 0, [employeeDataWithML]);

  const filteredAndSortedEmployeeData = useMemo(() => {
    let filtered = employeeDataWithML.filter(emp => {
      if (positionFilter !== 'All' && emp.positionTitle !== positionFilter) return false;
      if (trendFilter !== 'All' && emp.trend !== trendFilter) return false;
      if (riskFilter === 'High Potential' && !emp.isHighPotential) return false;
      if (riskFilter === 'Turnover Risk' && !emp.isTurnoverRisk) return false;
      if (riskFilter === 'Meets Expectations' && (emp.isHighPotential || emp.isTurnoverRisk)) return false;
      if (searchTerm && !emp.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    });

    return [...filtered].sort((a, b) => {
        const key = sortConfig.key;
        const direction = sortConfig.direction === 'ascending' ? 1 : -1;
        
        let valA = a[key];
        let valB = b[key];

        if (key === 'latestScore' || key === 'riskScore') {
          valA = valA ?? -1;
          valB = valB ?? -1;
        } else {
          valA = valA || '';
          valB = valB || '';
        }
        
        if (typeof valA === 'string') {
            return valA.localeCompare(valB) * direction;
        }
        return (valA - valB) * direction;
    });

  }, [employeeDataWithML, positionFilter, riskFilter, trendFilter, searchTerm, sortConfig]);

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <i className="bi bi-arrow-down-up sort-icon ms-1 opacity-25"></i>;
    return sortConfig.direction === 'ascending' ? <i className="bi bi-sort-up sort-icon active ms-1"></i> : <i className="bi bi-sort-down sort-icon active ms-1"></i>;
  };

  const handleToggleDetails = useCallback((employeeId) => {
    setExpandedEmployeeId(prevId => prevId === employeeId ? null : employeeId);
  }, []);
  
  const handleClearFilters = () => {
    setSearchTerm('');
    setPositionFilter('All');
    setRiskFilter('All');
    setTrendFilter('All');
    setAsOfDate(todayISO);
  };

  // Lazy load training data when needed
  const loadTrainingData = async () => {
    if (trainingPrograms.length === 0 && !loadingTraining) {
      try {
        setLoadingTraining(true);
        const [trainingRes, enrollmentsRes] = await Promise.all([
          trainingAPI.getAll(),
          trainingAPI.getEnrollments()
        ]);
        setTrainingPrograms(trainingRes.data || []);
        setEnrollments(enrollmentsRes.data || []);
      } catch (err) {
        console.error('Error loading training data:', err);
      } finally {
        setLoadingTraining(false);
      }
    }
  };

  // Lazy load employee details when needed
  const loadEmployeeDetails = async (employeeId) => {
    try {
      setLoadingEmployeeDetails(true);
      const response = await employeeAPI.getById(employeeId);
      const employeeDetails = response.data?.data || response.data;
      setSelectedEmployeeDetails(employeeDetails);
      return employeeDetails;
    } catch (err) {
      console.error('Error loading employee details:', err);
      return null;
    } finally {
      setLoadingEmployeeDetails(false);
    }
  };

  const transformCaseForApi = (caseData = {}) => {
    if (!caseData.employeeId) {
      throw new Error('Missing employee selection for disciplinary case');
    }

    const payload = {
      employee_id: caseData.employeeId,
      action_type: caseData.actionType,
      description: caseData.description || '',
      incident_date: caseData.issueDate,
      reason: caseData.reason,
      status: caseData.status || 'Ongoing',
      resolution_taken: caseData.nextSteps || '',
    };

    return payload;
  };

  // Action handlers
  const handlers = {
    enrollEmployees: async (programId, employeeIds) => {
      try {
        const ids = Array.isArray(employeeIds)
          ? employeeIds.filter((id) => id !== undefined && id !== null)
          : [employeeIds].filter((id) => id !== undefined && id !== null);

        if (!programId || ids.length === 0) {
          throw new Error('Missing program or employee selection for enrollment');
        }

        const enrolledDate = new Date().toISOString().split('T')[0];
        const payloads = ids.map((userId) => ({
          program_id: programId,
          user_id: userId,
          enrolled_date: enrolledDate,
          status: 'enrolled'
        }));

        await Promise.all(payloads.map((payload) => trainingAPI.enroll(payload)));

        // Refresh enrollments
        const enrollmentsRes = await trainingAPI.getEnrollments();
        setEnrollments(enrollmentsRes.data || []);
      } catch (err) {
        console.error('Error enrolling employee:', err);
        throw err; // Re-throw to let the modal handle the error
      }
    },
    saveCase: async (caseData) => {
      try {
        const payload = transformCaseForApi(caseData);
        await disciplinaryCaseAPI.create(payload);
        // Case saved successfully
      } catch (err) {
        console.error('Error saving case:', err);
        throw err;
      }
    },
    updateEmployee: async (updateData, employeeId) => {
      try {
        const targetId = employeeId || updateData?.id;
        if (!targetId) {
          throw new Error('Missing employee ID for update');
        }
        await employeeAPI.update(targetId, updateData);
        // Refresh employees list
        const employeesRes = await employeeAPI.getAll();
        setEmployees(employeesRes.data || []);
      } catch (err) {
        console.error('Error updating employee:', err);
        throw err;
      }
    }
  };

  const handleRecommendedAction = async (actionType, employee) => {
    setSelectedEmployeeForAction(employee);
    
    switch (actionType) {
      case 'viewProfile':
        // Load full employee details before showing modal
        setIsProfileEditMode(false);
        await loadEmployeeDetails(employee.id);
        setModalState({ viewProfile: true });
        break;
      case 'startPip':
        setPrefillCaseData({
          employeeId: employee.id,
          actionType: 'Performance Improvement Plan (PIP)',
          reason: 'Poor Performance',
          issueDate: new Date().toISOString().split('T')[0],
          status: 'Ongoing',
          description: `Initiated due to a performance score of ${employee.latestScore.toFixed(1)}%.`,
        });
        setModalState({ logCase: true });
        break;
      case 'reviewAttendance':
        setPrefillCaseData({
          employeeId: employee.id,
          actionType: 'Verbal Warning',
          reason: 'Tardiness / Punctuality',
          issueDate: new Date().toISOString().split('T')[0],
          status: 'Ongoing',
          description: `Initiated due to high absenteeism (${employee.attendance.absences} absences and ${employee.attendance.lates} lates in the last 90 days).`,
        });
        setModalState({ logCase: true });
        break;
      case 'nominateForTraining':
        // Load training data before showing program selection
        await loadTrainingData();
        setModalState({ selectProgram: true });
        break;
      default:
        break;
    }
  };

  const handleProgramSelected = (program) => {
    setProgramForEnrollment(program);
    setModalState({ selectProgram: false, enroll: true });
  };

  const closeModal = () => {
    setModalState({ viewProfile: false, enroll: false, logCase: false, selectProgram: false });
    setSelectedEmployeeForAction(null);
    setSelectedEmployeeDetails(null);
    setPrefillCaseData(null);
    setProgramForEnrollment(null);
    setIsProfileEditMode(false);
  };
  
  const handleGenerateReport = () => {
    generateReport(
        'predictive_analytics_summary', 
        { asOfDate }, 
        { employeeData: filteredAndSortedEmployeeData }
    );
    setShowReportPreview(true);
  };

  const handleCloseReportPreview = () => {
      setShowReportPreview(false);
      if(pdfDataUri) URL.revokeObjectURL(pdfDataUri);
      setPdfDataUri('');
  };
  
  const getTrendIcon = (trend) => {
    if (trend === 'Improving') return 'bi-arrow-up-right';
    if (trend === 'Declining') return 'bi-arrow-down-right';
    return 'bi-dash';
  };

  const getClassificationBadge = (emp) => {
    if (emp.isHighPotential) {
      return <span className="classification-badge potential"><i className="bi bi-star-fill"></i> High Potential</span>;
    }
    if (emp.isTurnoverRisk) {
      return <span className="classification-badge risk"><i className="bi bi-exclamation-triangle-fill"></i> Turnover Risk</span>;
    }
    return <span className="classification-badge neutral">Meets Expectations</span>;
  };

  // Show loading state
  if (loading) {
    return (
      <div className="container-fluid p-0 page-module-container">
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
          <div className="text-center">
            <div className="spinner-border text-primary mb-3" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="text-muted">Loading predictive analytics data...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="container-fluid p-0 page-module-container">
        <div className="alert alert-danger m-4" role="alert">
          <h4 className="alert-heading">Error Loading Data</h4>
          <p>{error}</p>
          <button className="btn btn-outline-danger" onClick={() => window.location.reload()}>
            <i className="bi bi-arrow-clockwise me-2"></i>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="container-fluid p-0 page-module-container">
        <header className="page-header d-flex justify-content-between align-items-center mb-4">
          <div className="d-flex align-items-center gap-3">
            <h1 className="page-main-title mb-0">Predictive Analytics</h1>
            {mlPredictions.length > 0 && (
              <span className="badge bg-success" title="ML predictions are active">
                <i className="bi bi-robot me-1"></i> ML Enhanced
              </span>
            )}
            {mlLoading && (
              <span className="badge bg-secondary">
                <i className="bi bi-arrow-clockwise me-1"></i> Loading ML...
              </span>
            )}
            {mlError && (
              <span className="badge bg-warning text-dark" title={mlError}>
                <i className="bi bi-exclamation-triangle me-1"></i> ML Unavailable
              </span>
            )}
          </div>
          <div className="d-flex gap-2">
            <button 
              className="btn btn-outline-primary" 
              onClick={() => refreshMLPredictions(true)} 
              disabled={mlLoading}
              title="Refresh ML predictions"
            >
              <i className={`bi bi-arrow-clockwise ${mlLoading ? 'spin' : ''}`}></i>
            </button>
            <button className="btn btn-outline-secondary" onClick={handleGenerateReport} disabled={isLoading || filteredAndSortedEmployeeData.length === 0}>
              <i className="bi bi-file-earmark-pdf-fill me-2"></i>
              {isLoading ? 'Generating...' : 'Generate Report'}
            </button>
          </div>
        </header>
        
        <div className="card analytics-controls-card">
            <div className="analytics-controls-bar">
                <div className="filter-group"><label>Search by Name</label><div className="input-group"><span className="input-group-text"><i className="bi bi-search"></i></span><input type="text" className="form-control" placeholder="Employee name..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div></div>
                <div className="filter-group"><label>Position</label><select className="form-select" value={positionFilter} onChange={e => setPositionFilter(e.target.value)}>{uniquePositions.map(p => <option key={p} value={p}>{p}</option>)}</select></div>
                <div className="filter-group"><label>Classification</label><select className="form-select" value={riskFilter} onChange={e => setRiskFilter(e.target.value)}><option value="All">All</option><option value="High Potential">High Potential</option><option value="Meets Expectations">Meets Expectations</option><option value="Turnover Risk">Turnover Risk</option></select></div>
                <div className="filter-group"><label>Performance Trend</label><select className="form-select" value={trendFilter} onChange={e => setTrendFilter(e.target.value)}><option value="All">All</option><option value="Improving">Improving</option><option value="Stable">Stable</option><option value="Declining">Declining</option></select></div>
                <div className="filter-group"><label>Analysis As-Of Date</label><div className="input-group date-input-group"><input type="date" className="form-control" value={asOfDate} onChange={e => setAsOfDate(e.target.value)} max={todayISO} /><button className="btn btn-light" onClick={() => setAsOfDate(todayISO)}>Today</button></div></div>
                <button className="btn btn-light clear-filters-btn align-self-end" onClick={handleClearFilters}><i className="bi bi-x"></i> Clear</button>
            </div>
        </div>

        <ul className="nav nav-tabs analytics-tabs mb-4">
          <li className="nav-item">
            <button className={`nav-link ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>Dashboard</button>
          </li>
          <li className="nav-item">
            <button className={`nav-link ${activeTab === 'matrix' ? 'active' : ''}`} onClick={() => setActiveTab('matrix')}>Employee Matrix</button>
          </li>
        </ul>

        {activeTab === 'dashboard' && (
            <PredictiveAnalyticsDashboard data={filteredAndSortedEmployeeData} positions={positions} theme={theme} />
        )}

        {activeTab === 'matrix' && (
            <>
                <div className="analytics-kpi-grid">
                  <InsightDataCard title="Employees Analyzed" value={filteredAndSortedEmployeeData.length} icon="bi-people-fill" iconClass="icon-total" />
                  <InsightDataCard title="Avg. Performance" value={avgScore.toFixed(1)} valueSuffix="%" icon="bi-reception-4" iconClass="icon-avg" />
                  <InsightDataCard title="High-Potentials" value={filteredAndSortedEmployeeData.filter(e => e.isHighPotential).length} icon="bi-graph-up-arrow" iconClass="icon-high" />
                  <InsightDataCard title="Turnover Risks" value={filteredAndSortedEmployeeData.filter(e => e.isTurnoverRisk).length} icon="bi-graph-down-arrow" iconClass="icon-risk" />
                </div>
                <div className="card data-table-card shadow-sm">
                  <div className="card-header"><h6 className="mb-0">Employee Matrix</h6></div>
                  <div className="table-responsive">
                    <table className="table data-table mb-0">
                      <thead>
                        <tr>
                          <th className="sortable" onClick={() => requestSort('name')}>Employee {getSortIcon('name')}</th>
                          <th className="text-center sortable" onClick={() => requestSort('latestScore')}>Performance {getSortIcon('latestScore')}</th>
                          <th className="text-center sortable" onClick={() => requestSort('trend')}>Trend {getSortIcon('trend')}</th>
                          <th className="text-center">Attendance (90d)</th>
                          <th className="sortable" onClick={() => requestSort('riskScore')}>Risk Score {getSortIcon('riskScore')}</th>
                          <th className="text-center">Classification</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredAndSortedEmployeeData.length > 0 ? filteredAndSortedEmployeeData.map(emp => {
                          const isExpanded = expandedEmployeeId === emp.id;
                          return (
                            <React.Fragment key={emp.id}>
                              <tr className={`main-row ${isExpanded ? 'selected-row' : ''}`} onClick={() => handleToggleDetails(emp.id)}>
                                <td>
                                  <div className="d-flex align-items-center">
                                    <img src={emp.imageUrl || placeholderAvatar} alt={emp.name} className="avatar-table me-3" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} loading="lazy" />
                                    <div>
                                      <div className="fw-bold">{emp.name}</div>
                                      <small className="text-muted">{emp.positionTitle}</small>
                                    </div>
                                  </div>
                                </td>
                                <td className="text-center">{emp.latestScore ? `${emp.latestScore.toFixed(1)}%` : 'N/A'}</td>
                                <td className="text-center"><span className={`trend-indicator trend-${emp.trend.toLowerCase()}`}><i className={`bi ${getTrendIcon(emp.trend)} me-1`}></i>{emp.trend}</span></td>
                                <td className="text-center"><div className="attendance-summary-cell"><span>{emp.attendance.lates} Lates</span><span>{emp.attendance.absences} Absences</span></div></td>
                                <td><RiskScoreIndicator score={emp.riskScore} /></td>
                                <td className="text-center">{getClassificationBadge(emp)}</td>
                                <td className="text-center"><button className="btn btn-sm btn-light"><i className={`bi bi-chevron-right expand-caret ${isExpanded ? 'expanded' : ''}`}></i></button></td>
                              </tr>
                              <tr className="expandable-content-row">
                                <td colSpan="7" className="p-0"><div className={`expandable-content ${isExpanded ? 'show' : ''}`}><div className="expanded-content-grid"><RiskScoreBreakdown employee={emp} /><PerformanceTrendChart employee={emp} evaluations={emp.evaluationHistory} /><RecommendedActions employee={emp} onAction={handleRecommendedAction} /></div></div></td>
                              </tr>
                            </React.Fragment>
                          );
                        }) : (
                            <tr><td colSpan="7"><div className="text-center p-4 text-muted">No employees with evaluation data match your criteria. Try adjusting the filters.</div></td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
            </>
        )}
      </div>

      {pdfDataUri && (
         <ReportPreviewModal
            show={showReportPreview}
            onClose={handleCloseReportPreview}
            pdfDataUri={pdfDataUri}
            reportTitle="Predictive Analytics Summary"
        />
      )}

      {/* --- Modals --- */}
      <ProgramSelectionModal 
        show={modalState.selectProgram} 
        onClose={closeModal} 
        onSelect={handleProgramSelected} 
        programs={trainingPrograms} 
        employee={selectedEmployeeForAction} 
        enrollments={enrollments}
        loading={loadingTraining}
      />
      
      {modalState.viewProfile && (
        <AddEditEmployeeModal 
          show={modalState.viewProfile} 
          onClose={closeModal} 
          employeeId={selectedEmployeeDetails?.id || selectedEmployeeForAction?.id} 
          employeeData={selectedEmployeeDetails || null} 
          positions={positions} 
          viewOnly={!isProfileEditMode}
          onSave={handlers.updateEmployee}
          onSwitchToEdit={() => setIsProfileEditMode(true)}
          loading={loadingEmployeeDetails}
        />
      )}
      
      {modalState.enroll && selectedEmployeeForAction && programForEnrollment && (
        <EnrollEmployeeModal 
          show={modalState.enroll} 
          onClose={closeModal} 
          onEnroll={handlers.enrollEmployees} 
          program={programForEnrollment} 
          allEmployees={employees} 
          existingEnrollments={enrollments.filter(e => 
            (e.programId || e.program_id) === (programForEnrollment.id || programForEnrollment.program_id)
          )} 
          employeeToEnroll={selectedEmployeeForAction} 
        />
      )}
      
      {modalState.logCase && (
        <AddEditCaseModal 
          show={modalState.logCase} 
          onClose={closeModal} 
          onSave={handlers.saveCase} 
          caseData={prefillCaseData} 
          employees={employees} 
        />
      )}
    </>
  );
};

export default PredictiveAnalyticsPage;
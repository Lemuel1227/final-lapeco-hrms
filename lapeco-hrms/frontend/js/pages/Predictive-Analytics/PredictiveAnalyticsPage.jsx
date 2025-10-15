// src/components/pages/Predictive-Analytics/PredictiveAnalyticsPage.jsx

import React, { useState, useMemo, useCallback } from 'react';
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
import PredictiveAnalyticsDashboard from './PredictiveAnalyticsDashboard';
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

const PredictiveAnalyticsPage = ({ evaluations = [], employees = [], positions = [], schedules = [], attendanceLogs = [], handlers, trainingPrograms, enrollments }) => {
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
  
  const { generateReport, pdfDataUri, isLoading, setPdfDataUri } = useReportGenerator();
  const [showReportPreview, setShowReportPreview] = useState(false);

  const employeeData = useMemo(() => {
    const asOf = asOfDate ? endOfDay(new Date(asOfDate)) : endOfDay(new Date());
    const ninetyDaysBeforeAsOf = subDays(asOf, 90);

    const relevantEvaluations = evaluations.filter(ev => new Date(ev.periodEnd) <= asOf);
    const relevantAttendanceLogs = attendanceLogs.filter(log => {
        const logDate = new Date(log.date);
        return logDate >= ninetyDaysBeforeAsOf && logDate <= asOf;
    });
    const relevantSchedules = schedules.filter(sch => {
        const schDate = new Date(sch.date);
        return schDate >= ninetyDaysBeforeAsOf && schDate <= asOf;
    });

    const evaluationsByEmployee = relevantEvaluations.reduce((acc, ev) => {
      (acc[ev.employeeId] = acc[ev.employeeId] || []).push(ev);
      return acc;
    }, {});
    
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
      const position = positions.find(p => p.id === employee.positionId);
      if (!position) return null;

      const empEvals = evaluationsByEmployee[employee.id];
      const attendance = attendanceByEmployee[employee.id] || { lates: 0, absences: 0, monthlyAbsenceAvg: 0 };
      
      let latestScore = null, trend = 'N/A', evaluationHistory = [], isHighPotential = false, isTurnoverRisk = false;
      let riskFactors, riskScore;

      if (empEvals && empEvals.length > 0) {
        const sortedEvals = [...empEvals].sort((a, b) => new Date(a.periodEnd) - new Date(b.periodEnd));
        const latestEval = sortedEvals[sortedEvals.length - 1];
        const previousEval = sortedEvals[sortedEvals.length - 2];
        latestScore = latestEval.overallScore;
        evaluationHistory = sortedEvals;
        trend = 'Stable';
        if (previousEval) {
          if (latestEval.overallScore > previousEval.overallScore + 2) trend = 'Improving';
          if (latestEval.overallScore < previousEval.overallScore - 2) trend = 'Declining';
        }
        riskFactors = {
          performance: { score: calculatePerformanceRisk(latestScore), weight: RISK_WEIGHTS.performance, value: `${latestScore.toFixed(1)}%` },
          attendance: { score: calculateAttendanceRisk(attendance.lates, attendance.absences), weight: RISK_WEIGHTS.attendance, value: `${attendance.lates} Lates, ${attendance.absences} Absences (90d)` },
        };
        riskScore = riskFactors.performance.score * riskFactors.performance.weight + riskFactors.attendance.score * riskFactors.attendance.weight;
        isHighPotential = latestScore >= HIGH_PERFORMANCE_THRESHOLD && attendance.monthlyAbsenceAvg <= GOOD_ATTENDANCE_MONTHLY_AVG;
        isTurnoverRisk = latestScore < LOW_PERFORMANCE_THRESHOLD || attendance.monthlyAbsenceAvg > BAD_ATTENDANCE_MONTHLY_AVG || riskScore >= 60;
      } else {
        return null;
      }

      return { ...employee, positionTitle: position.title, latestScore, evaluationHistory, trend, riskFactors, riskScore, isHighPotential, isTurnoverRisk, attendance };
    }).filter(Boolean);
  }, [employees, evaluations, positions, schedules, attendanceLogs, asOfDate]);
  
  const uniquePositions = useMemo(() => ['All', ...new Set(employeeData.map(e => e.positionTitle).filter(Boolean).sort())], [employeeData]);
  const avgScore = useMemo(() => employeeData.length > 0 ? employeeData.reduce((sum, e) => sum + e.latestScore, 0) / employeeData.length : 0, [employeeData]);

  const filteredAndSortedEmployeeData = useMemo(() => {
    let filtered = employeeData.filter(emp => {
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

  }, [employeeData, positionFilter, riskFilter, trendFilter, searchTerm, sortConfig]);

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
  
  const handleRecommendedAction = (actionType, employee) => {
    setSelectedEmployeeForAction(employee);
    switch (actionType) {
      case 'viewProfile':
        setModalState({ viewProfile: true });
        break;
      case 'startPip':
        setPrefillCaseData({
            employeeId: employee.id,
            reason: 'Performance Improvement Plan (PIP)',
            actionType: 'Performance Improvement Plan (PIP)',
            description: `Initiated due to a performance score of ${employee.latestScore.toFixed(1)}%.`,
        });
        setModalState({ logCase: true });
        break;
      case 'reviewAttendance':
        setPrefillCaseData({
            employeeId: employee.id,
            reason: 'Attendance Review',
            actionType: 'Verbal Warning',
            description: `Initiated due to high absenteeism (${employee.attendance.absences} absences and ${employee.attendance.lates} lates in the last 90 days).`,
        });
        setModalState({ logCase: true });
        break;
      case 'nominateForTraining':
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
    setPrefillCaseData(null);
    setProgramForEnrollment(null);
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

  return (
    <>
      <div className="container-fluid p-0 page-module-container">
        <header className="page-header d-flex justify-content-between align-items-center mb-4">
          <h1 className="page-main-title">Predictive Analytics</h1>
          <button className="btn btn-outline-secondary" onClick={handleGenerateReport} disabled={isLoading || filteredAndSortedEmployeeData.length === 0}>
            <i className="bi bi-file-earmark-pdf-fill me-2"></i>
            {isLoading ? 'Generating...' : 'Generate Report'}
          </button>
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
                                    <img src={emp.imageUrl || placeholderAvatar} alt={emp.name} className="avatar-table me-3" />
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
      <ProgramSelectionModal show={modalState.selectProgram} onClose={closeModal} onSelect={handleProgramSelected} programs={trainingPrograms} employee={selectedEmployeeForAction} enrollments={enrollments} />
      {modalState.viewProfile && selectedEmployeeForAction && (<AddEditEmployeeModal show={modalState.viewProfile} onClose={closeModal} employeeData={selectedEmployeeForAction} positions={positions} viewOnly={true} onSwitchToEdit={() => {}} />)}
      {modalState.enroll && selectedEmployeeForAction && programForEnrollment && (<EnrollEmployeeModal show={modalState.enroll} onClose={closeModal} onEnroll={handlers.enrollEmployees} program={programForEnrollment} allEmployees={employees} existingEnrollments={enrollments.filter(e => e.programId === programForEnrollment.id)} employeeToEnroll={selectedEmployeeForAction} />)}
      {modalState.logCase && (<AddEditCaseModal show={modalState.logCase} onClose={closeModal} onSave={handlers.saveCase} caseData={prefillCaseData} employees={employees} />)}
    </>
  );
};

export default PredictiveAnalyticsPage;
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { startOfDay, endOfDay, subDays, startOfYear, endOfYear, getYear } from 'date-fns';
import './PerformanceManagement.css';

// Component Imports
import StartEvaluationModal from '../../modals/StartEvaluationModal';
import ViewEvaluationModal from '../../modals/ViewEvaluationModal';
import ScoreIndicator from './ScoreIndicator';
import PerformanceReportModal from '../../modals/PerformanceReportModal';
import ReportPreviewModal from '../../modals/ReportPreviewModal';
import useReportGenerator from '../../hooks/useReportGenerator';
import placeholderAvatar from '../../assets/placeholder-profile.jpg';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const PerformanceManagementPage = ({ kras, kpis, positions, employees, evaluations, handlers, evaluationFactors, theme }) => {
  const [showStartEvalModal, setShowStartEvalModal] = useState(false);
  const [viewingEvaluation, setViewingEvaluation] = useState(null);
  const [showReportConfigModal, setShowReportConfigModal] = useState(false);
  const [showReportPreview, setShowReportPreview] = useState(false);

  // --- Date Filtering State ---
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [activePreset, setActivePreset] = useState('all');
  const [dateFilterType, setDateFilterType] = useState('periodEnd');

  const { generateReport, pdfDataUri, isLoading, setPdfDataUri } = useReportGenerator();

  const [historySearchTerm, setHistorySearchTerm] = useState('');
  const [historySortConfig, setHistorySortConfig] = useState({ key: 'evaluationDate', direction: 'descending' });

  const navigate = useNavigate();

  const employeeMap = useMemo(() => new Map(employees.map(e => [e.id, e])), [employees]);
  const positionMap = useMemo(() => new Map(positions.map(p => [p.id, p.title])), [positions]);

  const filteredEvaluationsByDate = useMemo(() => {
    if (!startDate || !endDate) return evaluations;
    const start = startOfDay(new Date(startDate));
    const end = endOfDay(new Date(endDate));
    return evaluations.filter(ev => {
      const dateToCompare = new Date(ev[dateFilterType]);
      return dateToCompare >= start && dateToCompare <= end;
    });
  }, [evaluations, startDate, endDate, dateFilterType]);

  const dashboardStats = useMemo(() => {
    const totalEvals = filteredEvaluationsByDate.length;
    if (totalEvals === 0) return { totalEvals, avgScore: 0 };
    const avgScore = filteredEvaluationsByDate.reduce((sum, ev) => sum + ev.overallScore, 0) / totalEvals;
    return { totalEvals, avgScore };
  }, [filteredEvaluationsByDate]);

  const performanceBrackets = useMemo(() => {
    const brackets = { 'Needs Improvement': 0, 'Meets Expectations': 0, 'Outstanding': 0 };
    filteredEvaluationsByDate.forEach(ev => {
      if (ev.overallScore < 70) brackets['Needs Improvement']++;
      else if (ev.overallScore < 90) brackets['Meets Expectations']++;
      else brackets['Outstanding']++;
    });
    return brackets;
  }, [filteredEvaluationsByDate]);

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

  const filteredEvaluations = useMemo(() => {
    let evals = [...filteredEvaluationsByDate];
    if (historySearchTerm) {
      const lowerSearch = historySearchTerm.toLowerCase();
      evals = evals.filter(ev => {
        const emp = employeeMap.get(ev.employeeId);
        const evaluator = employeeMap.get(ev.evaluatorId);
        return emp?.name.toLowerCase().includes(lowerSearch) || evaluator?.name.toLowerCase().includes(lowerSearch);
      });
    }

    evals.sort((a, b) => {
      const key = historySortConfig.key;
      const direction = historySortConfig.direction === 'ascending' ? 1 : -1;
      let valA, valB;
      if (key === 'employeeName') {
        valA = employeeMap.get(a.employeeId)?.name || '';
        valB = employeeMap.get(b.employeeId)?.name || '';
      } else if (key === 'evaluatorName') {
        valA = employeeMap.get(a.evaluatorId)?.name || '';
        valB = employeeMap.get(b.evaluatorId)?.name || '';
      } else {
        valA = a[key]; valB = b[key];
      }
      if (typeof valA === 'string') return valA.localeCompare(valB) * direction;
      if (typeof valA === 'number') return (valA - valB) * direction;
      return (new Date(valB) - new Date(valA)) * direction;
    });
    return evals;
  }, [filteredEvaluationsByDate, historySearchTerm, historySortConfig, employeeMap]);

  const handleDatePreset = (preset) => {
    setActivePreset(preset);
    const today = new Date();
    if (preset === 'all') {
      setStartDate(null);
      setEndDate(null);
      return;
    }
    let start, end;
    switch (preset) {
      case '30d':
        start = subDays(today, 30);
        end = today;
        break;
      case '90d':
        start = subDays(today, 90);
        end = today;
        break;
      case 'thisYear':
        start = startOfYear(today);
        end = today;
        break;
      case 'lastYear':
        const lastYear = getYear(today) - 1;
        start = startOfYear(new Date(lastYear, 0, 1));
        end = endOfYear(new Date(lastYear, 11, 31));
        break;
      default:
        start = null;
        end = null;
    }
    setStartDate(start ? start.toISOString().split('T')[0] : null);
    setEndDate(end ? end.toISOString().split('T')[0] : null);
  };

  const handleDateChange = (date, type) => {
    setActivePreset(null);
    if (type === 'start') setStartDate(date);
    if (type === 'end') setEndDate(date);
  };

  const getSortIcon = (key) => {
    if (historySortConfig.key !== key) return <i className="bi bi-arrow-down-up sort-icon ms-1 opacity-25"></i>;
    return historySortConfig.direction === 'ascending' ? <i className="bi bi-sort-up sort-icon active ms-1"></i> : <i className="bi bi-sort-down sort-icon active ms-1"></i>;
  };

  const handleStartEvaluation = (startData) => navigate('/dashboard/performance/evaluate', { state: startData });
  const handleViewEvaluation = (evaluation) => setViewingEvaluation(evaluation);
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

  const modalProps = useMemo(() => {
    if (!viewingEvaluation) return null;
    const employee = employeeMap.get(viewingEvaluation.employeeId);
    const position = employee ? positions.find(p => p.id === employee.positionId) : null;
    return { evaluation: viewingEvaluation, employee, position };
  }, [viewingEvaluation, employeeMap, positions]);

  return (
    <div className="container-fluid p-0 page-module-container">
      <header className="page-header d-flex justify-content-between align-items-center mb-4">
        <h1 className="page-main-title">Performance Management</h1>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary" onClick={handleGenerateReport}>
            <i className="bi bi-file-earmark-pdf-fill me-2"></i>Generate Report
          </button>
          <button className="btn btn-success" onClick={() => setShowStartEvalModal(true)}>
            <i className="bi bi-play-circle-fill me-2"></i>Start New Evaluation
          </button>
        </div>
      </header>
      <div className="performance-content">
        <div className="performance-dashboard-layout-revised">
          <div className="card performance-controls-card">
            <div className="performance-controls-bar">
              <div className="filter-group">
                <label>Filter Dates By</label>
                <select className="form-select form-select-sm" value={dateFilterType} onChange={e => setDateFilterType(e.target.value)}>
                  <option value="periodEnd">Evaluation Period</option>
                  <option value="evaluationDate">Submission Date</option>
                </select>
              </div>
              <div className="filter-group">
                <label>Date Range</label>
                <div className='d-flex align-items-center gap-2'>
                  <input type="date" className="form-control form-control-sm" value={startDate || ''} onChange={e => handleDateChange(e.target.value, 'start')} />
                  <span>-</span>
                  <input type="date" className="form-control form-control-sm" value={endDate || ''} onChange={e => handleDateChange(e.target.value, 'end')} />
                </div>
              </div>
              <div className="filter-group">
                <label>Quick Presets</label>
                <div className="btn-group w-100">
                  <button className={`btn btn-sm ${activePreset === '30d' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => handleDatePreset('30d')}>30d</button>
                  <button className={`btn btn-sm ${activePreset === '90d' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => handleDatePreset('90d')}>90d</button>
                  <button className={`btn btn-sm ${activePreset === 'thisYear' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => handleDatePreset('thisYear')}>This Year</button>
                  <button className={`btn btn-sm ${activePreset === 'lastYear' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => handleDatePreset('lastYear')}>Last Year</button>
                  <button className={`btn btn-sm ${activePreset === 'all' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => handleDatePreset('all')}>All</button>
                </div>
              </div>
            </div>
          </div>
          <div className="stat-card-grid-revised">
            <div className="stat-card-revised">
              <div className="stat-icon"><i className="bi bi-journal-check"></i></div>
              <div className="stat-info">
                <div className="stat-value">{dashboardStats.totalEvals}</div>
                <div className="stat-label">Evaluations in Period</div>
              </div>
            </div>
            <div className="stat-card-revised">
              <div className="stat-icon"><i className="bi bi-reception-4"></i></div>
              <div className="stat-info">
                <div className="stat-value">{dashboardStats.avgScore.toFixed(1)}<strong>%</strong></div>
                <div className="stat-label">Average Score in Period</div>
              </div>
            </div>
          </div>
          <div className="analysis-grid-full-width">
            <div className="card">
              <div className="card-header"><h6><i className="bi bi-bar-chart-line-fill me-2"></i>Performance Distribution</h6></div>
              <div className="card-body" style={{ height: '280px' }}><Bar data={chartData} options={chartOptions} /></div>
            </div>
          </div>
          <div className="card dashboard-history-table">
            <div className="history-table-controls">
              <h6><i className="bi bi-clock-history me-2"></i>Evaluation History</h6>
              <div className='d-flex align-items-center gap-3'>
                <span className="badge bg-secondary-subtle text-secondary-emphasis rounded-pill">
                  Showing {filteredEvaluations.length} results
                </span>
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
                    <th className="sortable" onClick={() => requestHistorySort('evaluatorName')}>Evaluator {getSortIcon('evaluatorName')}</th>
                    <th className="sortable" onClick={() => requestHistorySort('periodEnd')}>Period {getSortIcon('periodEnd')}</th>
                    <th className="sortable" onClick={() => requestHistorySort('evaluationDate')}>Date Submitted {getSortIcon('evaluationDate')}</th>
                    <th className="sortable" onClick={() => requestHistorySort('overallScore')}>Score {getSortIcon('overallScore')}</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEvaluations.length > 0 ? filteredEvaluations.map(ev => {
                    const employee = employeeMap.get(ev.employeeId);
                    const evaluator = employeeMap.get(ev.evaluatorId);
                    return (
                      <tr key={ev.id}>
                        <td>
                          <div className='d-flex align-items-center'>
                            <img src={employee?.imageUrl || placeholderAvatar} alt={employee?.name} className='avatar-table me-2' />
                            <div>
                              <div className='fw-bold'>{employee?.name || 'Unknown'}</div>
                              <small className='text-muted'>{positionMap.get(employee?.positionId) || 'N/A'}</small>
                            </div>
                          </div>
                        </td>
                        <td>{evaluator?.name || 'N/A'}</td>
                        <td>{ev.periodStart} to {ev.periodEnd}</td>
                        <td>{ev.evaluationDate}</td>
                        <td><ScoreIndicator score={ev.overallScore} /></td>
                        <td><button className="btn btn-sm btn-outline-secondary" onClick={() => handleViewEvaluation(ev)}>View</button></td>
                      </tr>
                    )
                  }) : (
                    <tr><td colSpan="6" className="text-center p-4">No evaluations found for the selected period.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <StartEvaluationModal show={showStartEvalModal} onClose={() => setShowStartEvalModal(false)} onStart={handleStartEvaluation} employees={employees} />

      {modalProps && (
        <ViewEvaluationModal
          show={!!viewingEvaluation}
          onClose={() => setViewingEvaluation(null)}
          evaluation={modalProps.evaluation}
          employee={modalProps.employee}
          position={modalProps.position}
          kras={kras}
          kpis={kpis}
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
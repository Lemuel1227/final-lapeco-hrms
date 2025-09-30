import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import './PerformanceManagement.css';

// Component Imports
import AddEditKraModal from '../../modals/AddEditKraModal';
import KraAccordionItem from './KraAccordionItem';
import StartEvaluationModal from '../../modals/StartEvaluationModal';
import ViewEvaluationModal from '../../modals/ViewEvaluationModal';
import ScoreIndicator from './ScoreIndicator';
import PerformanceReportModal from '../../modals/PerformanceReportModal';
import ReportPreviewModal from '../../modals/ReportPreviewModal';
import PerformanceInsightsCard from './PerformanceInsightsCard';
import useReportGenerator from '../../hooks/useReportGenerator'; 
import placeholderAvatar from '../../assets/placeholder-profile.jpg';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const PerformanceManagementPage = ({ kras = [], kpis = [], positions = [], employees = [], evaluations = [], handlers = {}, theme, evaluationFactors = [] }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showKraModal, setShowKraModal] = useState(false);
  const [editingKra, setEditingKra] = useState(null);
  const [showStartEvalModal, setShowStartEvalModal] = useState(false);
  const [viewingEvaluation, setViewingEvaluation] = useState(null);
  const [showReportConfigModal, setShowReportConfigModal] = useState(false);
  const [showReportPreview, setShowReportPreview] = useState(false);

  const { generateReport, pdfDataUri, isLoading, setPdfDataUri } = useReportGenerator();
  
  const [historySearchTerm, setHistorySearchTerm] = useState('');
  const [historySortConfig, setHistorySortConfig] = useState({ key: 'periodEnd', direction: 'descending' });

  const navigate = useNavigate();

  const employeeMap = useMemo(() => new Map(employees.map(e => [e.id, e])), [employees]);
  const positionMap = useMemo(() => new Map(positions.map(p => [p.id, p.title])), [positions]);
  
  const dashboardStats = useMemo(() => {
    const totalEvals = evaluations.length;
    if (totalEvals === 0) return { totalEvals, avgScore: 0 };
    const avgScore = evaluations.reduce((sum, ev) => sum + ev.overallScore, 0) / totalEvals;
    return { totalEvals, avgScore };
  }, [evaluations]);

  const performanceBrackets = useMemo(() => {
    const brackets = { 'Needs Improvement': 0, 'Meets Expectations': 0, 'Outstanding': 0 };
    evaluations.forEach(ev => {
      if (ev.overallScore < 70) brackets['Needs Improvement']++;
      else if (ev.overallScore < 90) brackets['Meets Expectations']++;
      else brackets['Outstanding']++;
    });
    return brackets;
  }, [evaluations]);
  
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
    responsive: true,
    maintainAspectRatio: false,
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
      y: {
        beginAtZero: true,
        ticks: { stepSize: 1, color: chartTextColor },
        grid: { color: gridColor },
      },
      x: {
        ticks: { color: chartTextColor },
        grid: { display: false },
      },
    },
  };

  const strategicInsights = useMemo(() => {
    const highPotentials = evaluations
      .filter(ev => ev.overallScore >= 90)
      .map(ev => ({...employeeMap.get(ev.employeeId), score: ev.overallScore}))
      .filter(emp => emp.id)
      .sort((a,b) => b.score - a.score);

    const turnoverRisks = evaluations
      .filter(ev => ev.overallScore < 70)
      .map(ev => ({...employeeMap.get(ev.employeeId), score: ev.overallScore}))
      .filter(emp => emp.id)
      .sort((a,b) => a.score - b.score);

    return { highPotentials, turnoverRisks };
  }, [evaluations, employeeMap]);

  const filteredEvaluations = useMemo(() => {
    let evals = [...evaluations];
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
      return (new Date(valA) - new Date(valB)) * direction;
    });
    return evals;
  }, [evaluations, historySearchTerm, historySortConfig, employeeMap]);
  
  const getSortIcon = (key) => {
    if (historySortConfig.key !== key) return <i className="bi bi-arrow-down-up sort-icon ms-1 opacity-25"></i>;
    return historySortConfig.direction === 'ascending' ? <i className="bi bi-sort-up sort-icon active ms-1"></i> : <i className="bi bi-sort-down sort-icon active ms-1"></i>;
  };
  
  const handleOpenKraModal = (kra = null) => { setEditingKra(kra); setShowKraModal(true); };
  const handleCloseKraModal = () => { setEditingKra(null); setShowKraModal(false); };
  const handleSaveKraAndKpis = (kraData, kpiList) => { handlers.saveKraAndKpis(kraData, kpiList); handleCloseKraModal(); };
  const handleDeleteKra = (kraId) => { if (window.confirm("Are you sure you want to delete this KRA and all its KPIs?")) handlers.deleteKra(kraId); };
  const handleStartEvaluation = (startData) => navigate('/dashboard/performance/evaluate', { state: startData });
  const handleViewEvaluation = (evaluation) => setViewingEvaluation(evaluation);

  const handleGenerateReport = ({ startDate, endDate }) => {
    const filteredEvals = evaluations.filter(ev => new Date(ev.periodEnd) >= new Date(startDate) && new Date(ev.periodEnd) <= new Date(endDate));
    if (filteredEvals.length === 0) {
        alert("No evaluations found in the selected date range.");
        return;
    }

    generateReport(
        'performance_summary', 
        { startDate, endDate }, 
        { employees, positions, evaluations }
    );
    setShowReportConfigModal(false);
    setShowReportPreview(true);
  };
  
  const handleCloseReportPreview = () => {
    setShowReportPreview(false);
    if(pdfDataUri) URL.revokeObjectURL(pdfDataUri);
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
  
  const renderDashboard = () => (
    <div className="performance-dashboard-layout-revised">
      <div className="stat-card-grid-revised">
        <div className="stat-card-revised">
            <div className="stat-icon"><i className="bi bi-journal-check"></i></div>
            <div className="stat-info">
                <div className="stat-value">{dashboardStats.totalEvals}</div>
                <div className="stat-label">Total Evaluations Completed</div>
            </div>
        </div>
        <div className="stat-card-revised">
            <div className="stat-icon"><i className="bi bi-reception-4"></i></div>
            <div className="stat-info">
                <div className="stat-value">{dashboardStats.avgScore.toFixed(1)}<span className="unit">%</span></div>
                <div className="stat-label">Company Average Score</div>
            </div>
        </div>
      </div>
      <div className="analysis-grid">
        <div className="card">
            <div className="card-header"><h6><i className="bi bi-bar-chart-line-fill me-2"></i>Performance Distribution</h6></div>
            <div className="card-body" style={{ height: '280px' }}><Bar data={chartData} options={chartOptions} /></div>
        </div>
        <div className="d-flex flex-column gap-3">
            <PerformanceInsightsCard title="High-Potentials" icon="bi bi-graph-up-arrow" data={strategicInsights.highPotentials} className="insight-card high-potentials" />
            <PerformanceInsightsCard title="Turnover Risks" icon="bi bi-graph-down-arrow" data={strategicInsights.turnoverRisks} className="insight-card turnover-risks" />
        </div>
      </div>
      <div className="card dashboard-history-table">
          <div className="history-table-controls">
            <h6><i className="bi bi-clock-history me-2"></i>Evaluation History</h6>
            <div className="input-group">
              <span className="input-group-text"><i className="bi bi-search"></i></span>
              <input type="text" className="form-control" placeholder="Search by name..." value={historySearchTerm} onChange={e => setHistorySearchTerm(e.target.value)} />
            </div>
          </div>
          <div className="table-responsive">
              <table className="table data-table mb-0 align-middle">
                <thead>
                  <tr>
                    <th className="sortable" onClick={() => requestHistorySort('employeeName')}>Employee {getSortIcon('employeeName')}</th>
                    <th className="sortable" onClick={() => requestHistorySort('evaluatorName')}>Evaluator {getSortIcon('evaluatorName')}</th>
                    <th className="sortable" onClick={() => requestHistorySort('periodEnd')}>Period {getSortIcon('periodEnd')}</th>
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
                        <td><ScoreIndicator score={ev.overallScore} /></td>
                        <td><button className="btn btn-sm btn-outline-secondary" onClick={() => handleViewEvaluation(ev)}>View</button></td>
                      </tr>
                    )
                  }) : (
                    <tr><td colSpan="5" className="text-center p-4">No evaluations match your search.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
      </div>
    </div>
  );

  const renderSetup = () => (
    <div className="kra-setup-container">
      <div className="d-flex justify-content-between align-items-center mb-3">
          <h4 className="mb-0">Key Result Areas (KRAs)</h4>
          <button className="btn btn-success" onClick={() => handleOpenKraModal(null)}><i className="bi bi-plus-circle-fill me-2"></i>Add New KRA</button>
      </div>
      <div className="accordion" id="kraAccordion">
        {kras.length > 0 ? kras.map(kra => (
            <KraAccordionItem key={kra.id} kra={kra} kpis={kpis.filter(k => k.kraId === kra.id)} onEdit={handleOpenKraModal} onDelete={handleDeleteKra}/>
        )) : (
          <div className="text-center p-5 bg-light rounded"><p>No KRAs have been defined yet. Click "Add New KRA" to start.</p></div>
        )}
      </div>
    </div>
  );

  return (
    <div className="container-fluid p-0 page-module-container">
      <header className="page-header d-flex justify-content-between align-items-center mb-4">
        <h1 className="page-main-title">Performance Management</h1>
        <div className="d-flex gap-2">
            <button className="btn btn-outline-secondary" onClick={() => setShowReportConfigModal(true)}>
                <i className="bi bi-file-earmark-pdf-fill me-2"></i>Generate Report
            </button>
            <button className="btn btn-success" onClick={() => setShowStartEvalModal(true)}>
                <i className="bi bi-play-circle-fill me-2"></i>Start New Evaluation
            </button>
        </div>
      </header>
      <ul className="nav nav-tabs performance-nav-tabs mb-4">
        <li className="nav-item"><button className={`nav-link ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>Dashboard</button></li>
        <li className="nav-item"><button className={`nav-link ${activeTab === 'setup' ? 'active' : ''}`} onClick={() => setActiveTab('setup')}>KRA & KPI Setup</button></li>
      </ul>
      <div className="performance-content">
        {activeTab === 'setup' && renderSetup()}
        {activeTab === 'dashboard' && renderDashboard()}
      </div>
      
      {showKraModal && (<AddEditKraModal show={showKraModal} onClose={handleCloseKraModal} onSave={handleSaveKraAndKpis} positions={positions} kraData={editingKra} kpisData={editingKra ? kpis.filter(k => k.kraId === editingKra.id) : []}/>)}
      <StartEvaluationModal show={showStartEvalModal} onClose={() => setShowStartEvalModal(false)} onStart={handleStartEvaluation} employees={employees}/>
      
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
      
      <PerformanceReportModal show={showReportConfigModal} onClose={() => setShowReportConfigModal(false)} onGenerate={handleGenerateReport} />
      
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
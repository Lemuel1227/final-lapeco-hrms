import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bar } from 'react-chartjs-2';
import AddEditKraModal from '../../../../../../LAPECO-HRMS/src/components/modals/AddEditKraModal';
import KraAccordionItem from './KraAccordionItem';
import StartEvaluationModal from '../../../../../../LAPECO-HRMS/src/components/modals/StartEvaluationModal';
import ViewEvaluationModal from '../../../../../../LAPECO-HRMS/src/components/modals/ViewEvaluationModal';
import './PerformanceManagement.css';
import Layout from '@/layout/Layout';

const PerformanceManagementPage = (props) => {
  const [activeTab, setActiveTab] = useState('setup');
  const [showKraModal, setShowKraModal] = useState(false);
  const [editingKra, setEditingKra] = useState(null);
  
  const [showStartEvalModal, setShowStartEvalModal] = useState(false);
  const [viewingEvaluation, setViewingEvaluation] = useState(null);

  const employeeMap = useMemo(() => new Map(props.employees.map(e => [e.id, e])), [props.employees]);
  const positionMap = useMemo(() => new Map(props.positions.map(p => [p.id, p.title])), [props.positions]);
  
  // Defensive defaults for required props
  const evaluations = props.evaluations || [];
  const kras = props.kras || [];
  const kpis = props.kpis || [];
  const performanceBrackets = useMemo(() => {
    const brackets = {
      'Needs Improvement (<70%)': 0,
      'Meets Expectations (70-89%)': 0,
      'Outstanding (90%+)': 0,
    };
    evaluations.forEach(ev => {
      if (ev.overallScore < 70) brackets['Needs Improvement (<70%)']++;
      else if (ev.overallScore < 90) brackets['Meets Expectations (70-89%)']++;
      else brackets['Outstanding (90%+)']++;
    });
    return brackets;
  }, [evaluations]);
  
  const chartData = {
    labels: Object.keys(performanceBrackets),
    datasets: [{
      label: 'Number of Employees',
      data: Object.values(performanceBrackets),
      backgroundColor: ['#dc3545', '#ffc107', '#198754'],
    }],
  };
  
  const chartOptions = {
    responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
  };

  const strategicInsights = useMemo(() => {
    const highPotentials = evaluations
      .filter(ev => ev.overallScore >= 90)
      .map(ev => employeeMap.get(ev.employeeId))
      .filter(Boolean);

    const turnoverRisks = evaluations
      .filter(ev => ev.overallScore < 70)
      .map(ev => employeeMap.get(ev.employeeId))
      .filter(Boolean);

    return { highPotentials, turnoverRisks };
  }, [evaluations, employeeMap]);

  const handleOpenKraModal = (kra = null) => {
    setEditingKra(kra);
    setShowKraModal(true);
  };

  const handleCloseKraModal = () => {
    setEditingKra(null);
    setShowKraModal(false);
  };
  
  const handleSaveKraAndKpis = (kraData, kpiList) => {
    props.handlers.saveKraAndKpis(kraData, kpiList);
    handleCloseKraModal();
  };

  const handleDeleteKra = (kraId) => {
      if (window.confirm("Are you sure you want to delete this KRA and all its associated KPIs? This action cannot be undone.")) {
        props.handlers.deleteKra(kraId);
      }
  };
  
  const handleStartEvaluation = (startData) => {
    router.visit('/dashboard/performance/evaluate', {
      data: startData,
      preserveState: true,
    });
  };
  
  const handleViewEvaluation = (evaluation) => {
    setViewingEvaluation(evaluation);
  };
  
  const renderDashboard = () => (
    <div className="performance-dashboard-grid">
      <div className="dashboard-chart-card">
        <div className="card-header">Performance Distribution</div>
        <div className="card-body" style={{ height: '300px' }}><Bar data={chartData} options={chartOptions} /></div>
      </div>
      <div className="dashboard-insights-card">
        <div className="card-header">Strategic Insights</div>
        <div className="card-body">
          <div className="insight-item">
            <h6><i className="bi bi-graph-up-arrow text-success"></i> High-Potentials ({strategicInsights.highPotentials.length})</h6>
            <p className="small text-muted">Employees consistently scoring above 90%.</p>
            <div className="insight-tags">{strategicInsights.highPotentials.map(emp => <span key={emp.id} className="badge bg-success-subtle text-success-emphasis">{emp.name}</span>)}</div>
          </div>
          <hr/>
          <div className="insight-item">
            <h6><i className="bi bi-graph-down-arrow text-danger"></i> Turnover Risks ({strategicInsights.turnoverRisks.length})</h6>
            <p className="small text-muted">Employees with recent low performance scores.</p>
            <div className="insight-tags">{strategicInsights.turnoverRisks.map(emp => <span key={emp.id} className="badge bg-danger-subtle text-danger-emphasis">{emp.name}</span>)}</div>
          </div>
        </div>
      </div>
      <div className="dashboard-history-table">
        <div className="card-header">Evaluation History</div>
        <div className="table-responsive">
            <table className="table data-table mb-0">
              <thead><tr><th>Employee</th><th>Position</th><th>Period</th><th>Evaluator</th><th>Score</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                {evaluations.map(ev => {
                  const employee = employeeMap.get(ev.employeeId);
                  const position = employee ? positionMap.get(employee.positionId) : 'N/A';
                  return (
                    <tr key={ev.id}>
                      <td>{employee?.name || 'Unknown'}</td><td>{position}</td>
                      <td>{ev.periodStart} - {ev.periodEnd}</td><td>{ev.evaluatorId}</td>
                      <td><span className="fw-bold">{ev.overallScore.toFixed(2)}%</span></td>
                      <td><span className="badge bg-success">{ev.status}</span></td>
                      <td><button className="btn btn-sm btn-outline-secondary" onClick={() => handleViewEvaluation(ev)}>View</button></td>
                    </tr>
                  )
                })}
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
          <button className="btn btn-success" onClick={() => handleOpenKraModal(null)}>
              <i className="bi bi-plus-circle-fill me-2"></i>Add New KRA
          </button>
      </div>
      <div className="accordion" id="kraAccordion">
        {kras.length > 0 ? kras.map(kra => (
            <KraAccordionItem 
                key={kra.id}
                kra={kra}
                kpis={kpis.filter(k => k.kraId === kra.id)}
                onEdit={handleOpenKraModal}
                onDelete={handleDeleteKra}
            />
        )) : (
          <div className="text-center p-5 bg-light rounded">
            <p>No KRAs have been defined yet. Click "Add New KRA" to start.</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="container-fluid p-0 page-module-container">
      <header className="page-header d-flex justify-content-between align-items-center mb-4">
        <h1 className="page-main-title">Performance Management</h1>
        <button className="btn btn-success" onClick={() => setShowStartEvalModal(true)}>
          <i className="bi bi-play-circle-fill me-2"></i>Start New Evaluation
        </button>
      </header>
      
      <ul className="nav nav-tabs performance-nav-tabs mb-4">
        <li className="nav-item"><button className={`nav-link ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>Performance Dashboard</button></li>
        <li className="nav-item"><button className={`nav-link ${activeTab === 'setup' ? 'active' : ''}`} onClick={() => setActiveTab('setup')}>KRA & KPI Setup</button></li>
      </ul>

      <div className="performance-content">
        {activeTab === 'setup' && renderSetup()}
        {activeTab === 'dashboard' && renderDashboard()}
      </div>

      {showKraModal && (
        <AddEditKraModal
            show={showKraModal}
            onClose={handleCloseKraModal}
            onSave={handleSaveKraAndKpis}
            positions={props.positions}
            kraData={editingKra}
            kpisData={editingKra ? kpis.filter(k => k.kraId === editingKra.id) : []}
        />
      )}
      
      <StartEvaluationModal show={showStartEvalModal} onClose={() => setShowStartEvalModal(false)} onStart={handleStartEvaluation} employees={props.employees}/>
      
      {viewingEvaluation && (
        <ViewEvaluationModal
          show={!!viewingEvaluation}
          onClose={() => setViewingEvaluation(null)}
          evaluation={viewingEvaluation}
          employee={employeeMap.get(viewingEvaluation.employeeId)}
          position={positionMap.get(employeeMap.get(viewingEvaluation.employeeId)?.positionId)}
          kras={kras}
          kpis={kpis}
        />
      )}
    </div>
  );
};

export default PerformanceManagementPage;
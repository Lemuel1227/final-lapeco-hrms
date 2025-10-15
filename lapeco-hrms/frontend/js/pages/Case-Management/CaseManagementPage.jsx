import React, { useState, useMemo, useEffect } from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

// Import modals, hooks, and components
import AddEditCaseModal from './AddEditCaseModal';
import CaseCard from './CaseCard';
import CaseDetailView from './CaseDetailView';
import CaseSummaryByEmployee from './CaseSummaryByEmployee';
import ReportConfigurationModal from '../../modals/ReportConfigurationModal';
import ReportPreviewModal from '../../modals/ReportPreviewModal';
import useReportGenerator from '../../hooks/useReportGenerator';
import { reportsConfig } from '../../config/reports.config'; 
import { disciplinaryCaseAPI, employeeAPI } from '../../services/api';
import './CaseManagement.css';

ChartJS.register(ArcElement, Tooltip, Legend);

const CaseManagementPage = () => {
  const [cases, setCases] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showModal, setShowModal] = useState(false);
  const [editingCase, setEditingCase] = useState(null);
  const [selectedCase, setSelectedCase] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showReportPreview, setShowReportPreview] = useState(false);
  const { generateReport, pdfDataUri, isLoading, setPdfDataUri } = useReportGenerator();

  // Fetch data from API on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch disciplinary cases and employees from API
        const [casesResponse, employeesResponse] = await Promise.all([
          disciplinaryCaseAPI.getAll(),
          employeeAPI.getAll()
        ]);
        
        // Handle response data structure
        const casesData = Array.isArray(casesResponse.data) 
          ? casesResponse.data 
          : (casesResponse.data?.data || []);
        
        const employeesData = Array.isArray(employeesResponse.data) 
          ? employeesResponse.data 
          : (employeesResponse.data?.data || []);
        
        // Transform cases data to match expected format
        const transformedCases = casesData.map(c => ({
          caseId: c.id,
          employeeId: c.employee_id,
          actionType: c.action_type,
          description: c.description,
          incidentDate: c.incident_date,
          reason: c.reason,
          status: c.status,
          resolutionTaken: c.resolution_taken,
          attachment: c.attachment,
          issueDate: c.incident_date, // Using incident_date as issueDate for compatibility
          updatedAt: c.updated_at, // Add updated_at field for proper sorting
          actionLog: (c.action_logs || []).map(log => ({
            date: log.date_created,
            action: log.description
          })),
          attachments: c.attachment ? [c.attachment] : [], // Convert single attachment to array
          nextSteps: c.resolution_taken, // Map resolution_taken to nextSteps
        }));
        
        // Transform employees data to match expected format
        const transformedEmployees = employeesData.map(emp => ({
          id: emp.id,
          name: emp.name,
          email: emp.email,
          position: emp.position?.name || 'N/A',
        }));
        
        setCases(transformedCases);
        setEmployees(transformedEmployees);
      } catch (err) {
        setCases([]);
        setEmployees([]);
        setError('Failed to load disciplinary cases. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Create employee map for quick lookups
  const employeeMap = useMemo(() => {
    return new Map(employees.map(emp => [emp.id, emp]));
  }, [employees]);

  // Calculate statistics
  const stats = useMemo(() => {
    return {
      total: cases.length,
      ongoing: cases.filter(c => c.status === 'Ongoing').length,
      closed: cases.filter(c => c.status === 'Closed').length
    };
  }, [cases]);

  const chartData = useMemo(() => {
    const actionTypes = cases.reduce((acc, c) => {
      acc[c.actionType] = (acc[c.actionType] || 0) + 1;
      return acc;
    }, {});

    return {
      labels: Object.keys(actionTypes),
      datasets: [{
        data: Object.values(actionTypes),
        backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40']
      }]
    };
  }, [cases]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            position: 'right',
            labels: {
                color: 'var(--text-secondary)'
            }
        }
    }
  };

  const filteredCases = useMemo(() => {
    return cases
      .filter(c => {
        const matchesStatus = statusFilter === 'All' || c.status === statusFilter;
        if (!matchesStatus) return false;

        if (searchTerm) {
          const lowerSearch = searchTerm.toLowerCase();
          const employeeName = employeeMap.get(c.employeeId)?.name?.toLowerCase() || '';
          return (
            String(c.caseId).toLowerCase().includes(lowerSearch) ||
            employeeName.includes(lowerSearch) ||
            (c.actionType || '').toLowerCase().includes(lowerSearch) ||
            (c.reason || '').toLowerCase().includes(lowerSearch)
          );
        }
        return true;
      })
      .sort((a, b) => new Date(b.issueDate) - new Date(a.issueDate));
  }, [cases, searchTerm, statusFilter, employeeMap]);

  const handleOpenModal = (caseData = null) => {
    setEditingCase(caseData);
    setShowModal(true);
  };
  
  const handleCloseModal = () => {
    setEditingCase(null);
    setShowModal(false);
  };

  const handleViewDetails = (caseData) => {
    setSelectedCase(caseData);
  };
  
  const caseReportConfig = reportsConfig.find(r => r.id === 'disciplinary_cases');

  const handleGenerateReportClick = () => {
    if (caseReportConfig) {
      setShowConfigModal(true);
    } else {
      alert("Report configuration not found.");
    }
  };

  const handleRunReport = (reportId, params) => {
    generateReport(reportId, params, { cases, employees });
    setShowConfigModal(false);
    setShowReportPreview(true);
  };

  const handleClosePreview = () => {
    setShowReportPreview(false);
    if (pdfDataUri) {
      URL.revokeObjectURL(pdfDataUri);
    }
    setPdfDataUri('');
  };

  const handleViewEmployeeCases = (employee) => {
    setSearchTerm(employee.name);
    setActiveTab('list');
  };

  const handleAddCase = async (newCase) => {
    try {
      // Transform frontend field names to match backend expectations
      const transformedCase = {
        employee_id: newCase.employeeId,
        action_type: newCase.actionType,
        description: newCase.description,
        incident_date: newCase.issueDate,
        reason: newCase.reason,
        status: newCase.status,
        resolution_taken: newCase.nextSteps,
        attachment: newCase.attachment || null,
      };

      const response = await disciplinaryCaseAPI.create(transformedCase);
      
      // Transform the response data to match the expected format
      const addedCase = {
        caseId: response.data.id,
        employeeId: response.data.employee_id,
        actionType: response.data.action_type,
        description: response.data.description,
        incidentDate: response.data.incident_date,
        reason: response.data.reason,
        status: response.data.status,
        resolutionTaken: response.data.resolution_taken,
        attachment: response.data.attachment,
        issueDate: response.data.incident_date,
        updatedAt: response.data.updated_at, // Add updated_at field
        actionLog: [], // New cases won't have action logs initially
        attachments: response.data.attachment ? [response.data.attachment] : [], // Convert single attachment to array
        nextSteps: response.data.resolution_taken, // Map resolution_taken to nextSteps
      };
      
      setCases(prev => [...prev, addedCase]);
      setShowModal(false);
    } catch (err) {
      console.error('Failed to add case:', err);
    }
  };

  const handleEditCase = async (updatedCase) => {
    try {
      // Transform frontend field names to match backend expectations
      const transformedCase = {
        employee_id: updatedCase.employeeId,
        action_type: updatedCase.actionType,
        description: updatedCase.description,
        incident_date: updatedCase.issueDate,
        reason: updatedCase.reason,
        status: updatedCase.status,
        resolution_taken: updatedCase.nextSteps,
        attachment: updatedCase.attachment || null,
      };

      const response = await disciplinaryCaseAPI.update(editingCase.caseId, transformedCase);
      
      // Transform the response data to match the expected format
      const editedCase = {
        caseId: response.data.id,
        employeeId: response.data.employee_id,
        actionType: response.data.action_type,
        description: response.data.description,
        incidentDate: response.data.incident_date,
        reason: response.data.reason,
        status: response.data.status,
        resolutionTaken: response.data.resolution_taken,
        attachment: response.data.attachment,
        issueDate: response.data.incident_date,
        updatedAt: response.data.updated_at, // Add updated_at field
        actionLog: (response.data.action_logs || []).map(log => ({
          date: log.date_created,
          action: log.description
        })),
        attachments: response.data.attachment ? [response.data.attachment] : [], // Convert single attachment to array
        nextSteps: response.data.resolution_taken, // Map resolution_taken to nextSteps
      };
      
      setCases(prev => prev.map(c => c.caseId === editingCase.caseId ? editedCase : c));
      setEditingCase(null);
      setShowModal(false);
    } catch (err) {
      console.error('Failed to update case:', err);
    }
  };

  const handleDeleteCase = async (caseId) => {
    try {
      await disciplinaryCaseAPI.delete(caseId);
      setCases(prev => prev.filter(c => c.caseId !== caseId));
    } catch (err) {
      console.error('Failed to delete case:', err);
    }
  };

  const handlers = {
    saveCase: editingCase ? handleEditCase : handleAddCase,
    addCaseLogEntry: (caseId, logEntry) => {
      // Implementation for adding case log entries
      console.log('Adding log entry for case:', caseId, logEntry);
    }
  };

  const renderDashboard = () => (
    <>
      <div className="case-dashboard-grid">
        <div className="stat-card-revised">
          <div className="stat-icon icon-total"><i className="bi bi-briefcase-fill"></i></div>
          <div className="stat-info">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total Cases</div>
          </div>
        </div>
        <div className="stat-card-revised">
          <div className="stat-icon icon-ongoing"><i className="bi bi-hourglass-split"></i></div>
          <div className="stat-info">
            <div className="stat-value text-warning">{stats.ongoing}</div>
            <div className="stat-label">Ongoing Cases</div>
          </div>
        </div>
        <div className="stat-card-revised">
          <div className="stat-icon icon-closed"><i className="bi bi-check2-circle"></i></div>
          <div className="stat-info">
            <div className="stat-value text-secondary">{stats.closed}</div>
            <div className="stat-label">Closed Cases</div>
          </div>
        </div>
      </div>
      <div className="dashboard-grid-main">
          <div className="card">
              <div className="card-header"><h6><i className="bi bi-clock-history me-2"></i>Recently Updated Cases</h6></div>
              <div className="table-responsive">
                <table className="table data-table mb-0 table-hover">
                    <tbody>
                        {cases
                          .sort((a, b) => new Date(b.updatedAt || b.incidentDate) - new Date(a.updatedAt || a.incidentDate))
                          .slice(0,5)
                          .map(c => (
                            <tr key={c.caseId} onClick={() => handleViewDetails(c)} style={{cursor:'pointer'}}>
                                <td>
                                    <strong>{c.reason}</strong>
                                    <br/>
                                    <small className="text-muted">{employeeMap.get(c.employeeId)?.name}</small>
                                </td>
                                <td className="text-end">
                                    <span className={`status-badge status-${c.status.toLowerCase()}`}>{c.status}</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
              </div>
          </div>
          <div className="card">
              <div className="card-header"><h6><i className="bi bi-pie-chart-fill me-2"></i>Cases by Type</h6></div>
              <div className="card-body d-flex justify-content-center align-items-center" style={{height: '250px'}}>
                  <Doughnut data={chartData} options={chartOptions} />
              </div>
          </div>
      </div>
    </>
  );

  const renderCaseList = () => (
    <>
        <div className="controls-bar d-flex justify-content-between mb-4">
            <div className="input-group" style={{ maxWidth: '400px' }}>
                <span className="input-group-text"><i className="bi bi-search"></i></span>
                <input type="text" className="form-control" placeholder="Search by Case ID, Name, Reason..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <div className="btn-group" role="group">
                <button type="button" className={`btn ${statusFilter === 'All' ? 'btn-dark' : 'btn-outline-dark'}`} onClick={() => setStatusFilter('All')}>All</button>
                <button type="button" className={`btn ${statusFilter === 'Ongoing' ? 'btn-dark' : 'btn-outline-dark'}`} onClick={() => setStatusFilter('Ongoing')}>Ongoing</button>
                <button type="button" className={`btn ${statusFilter === 'Closed' ? 'btn-dark' : 'btn-outline-dark'}`} onClick={() => setStatusFilter('Closed')}>Closed</button>
            </div>
        </div>
        <div className="case-card-grid">
            {filteredCases.map(c => 
              <CaseCard 
                key={c.caseId} 
                caseInfo={c} 
                employee={employeeMap.get(c.employeeId)}
                onView={handleViewDetails} 
              />
            )}
        </div>
        {filteredCases.length === 0 && <div className="text-center p-5 bg-light rounded"><p>No cases found for the selected filters.</p></div>}
    </>
  );

  if (selectedCase) {
    return (
      <div className="container-fluid p-0 page-module-container">
        <header className="page-header d-flex justify-content-between align-items-center mb-4">
          <h1 className="page-main-title">Case Management</h1>
          <div className="d-flex gap-2">
              <button className="btn btn-outline-secondary" onClick={handleGenerateReportClick}>
                  <i className="bi bi-file-earmark-pdf-fill me-2"></i>Generate Report
              </button>
              <button className="btn btn-success" onClick={() => handleOpenModal()}>
                  <i className="bi bi-plus-circle-fill me-2"></i>Log New Case
              </button>
          </div>
        </header>
        
        <CaseDetailView 
            caseInfo={selectedCase}
            employee={employeeMap.get(selectedCase.employeeId)}
            onBack={() => setSelectedCase(null)}
            onSaveLog={handlers.addCaseLogEntry}
            onEdit={handleOpenModal}
        />
        <AddEditCaseModal 
          show={showModal}
          onClose={handleCloseModal}
          onSave={handlers.saveCase}
          caseData={editingCase}
          employees={employees}
        />
      </div>
    );
  }

  return (
    <div className="container-fluid p-0 page-module-container">
      <header className="page-header d-flex justify-content-between align-items-center mb-4">
        <h1 className="page-main-title">Case Management</h1>
        <div className="d-flex gap-2">
            <button className="btn btn-outline-secondary" onClick={handleGenerateReportClick}>
                <i className="bi bi-file-earmark-pdf-fill me-2"></i>Generate Report
            </button>
            <button className="btn btn-success" onClick={() => handleOpenModal()}>
                <i className="bi bi-plus-circle-fill me-2"></i>Log New Case
            </button>
        </div>
      </header>

      {loading && (
        <div className="w-100 text-center p-5 bg-light rounded">
          <div className="spinner-border text-success" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3">Loading disciplinary cases...</p>
        </div>
      )}

      {error && (
        <div className="text-center p-5 bg-light rounded">
          <p className="text-danger">{error}</p>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>Retry</button>
        </div>
      )}

      {!loading && !error && (
        <>
          <ul className="nav nav-tabs case-management-tabs mb-4">
            <li className="nav-item"><button className={`nav-link ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>Dashboard</button></li>
            <li className="nav-item"><button className={`nav-link ${activeTab === 'list' ? 'active' : ''}`} onClick={() => setActiveTab('list')}>All Cases</button></li>
            <li className="nav-item"><button className={`nav-link ${activeTab === 'byEmployee' ? 'active' : ''}`} onClick={() => setActiveTab('byEmployee')}>By Employee</button></li>
          </ul>

          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'list' && renderCaseList()}
          {activeTab === 'byEmployee' && (
            <CaseSummaryByEmployee 
              employees={employees}
              cases={cases}
              onViewEmployeeCases={handleViewEmployeeCases}
            />
          )}
        </>
      )}

      <AddEditCaseModal 
        show={showModal && !selectedCase}
        onClose={handleCloseModal}
        onSave={handlers.saveCase}
        caseData={editingCase}
        employees={employees}
      />

      <ReportConfigurationModal
        show={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        reportConfig={caseReportConfig}
        onRunReport={handleRunReport}
      />

      {(isLoading || pdfDataUri) && (
        <ReportPreviewModal
          show={showReportPreview}
          onClose={handleClosePreview}
          pdfDataUri={pdfDataUri}
          reportTitle="Disciplinary Cases Report"
        />
      )}
    </div>
  );
};

export default CaseManagementPage;
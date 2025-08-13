import React, { useState, useMemo, useEffect } from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import AddEditCaseModal from './AddEditCaseModal';
import CaseCard from './CaseCard';
import CaseDetailView from './CaseDetailView';
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

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [casesResponse, employeesResponse] = await Promise.all([
          disciplinaryCaseAPI.getAll(),
          employeeAPI.getAll()
        ]);
        
        // Transform backend data to frontend format
        const transformedCases = casesResponse.data.map(caseItem => ({
          id: caseItem.id,
          caseId: caseItem.case_number,
          employeeId: caseItem.employee_id,
          title: caseItem.violation_type,
          reason: caseItem.description,
          actionType: caseItem.violation_type,
          status: caseItem.status === 'open' ? 'Ongoing' : caseItem.status === 'closed' ? 'Closed' : caseItem.status,
          issueDate: caseItem.incident_date,
          reportedDate: caseItem.reported_date,
          reportedBy: caseItem.reported_by,
          severity: caseItem.severity,
          investigationNotes: caseItem.investigation_notes,
          actionTaken: caseItem.action_taken,
          resolutionDate: caseItem.resolution_date,
          resolutionNotes: caseItem.resolution_notes
        }));
        
        setCases(transformedCases);
        setEmployees(employeesResponse.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load case management data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const employeeMap = useMemo(() => new Map(employees.map(e => [e.id, e])), [employees]);

  // Handlers for CRUD operations
  const handlers = {
    saveCase: async (caseData) => {
      try {
        const backendData = {
          employee_id: caseData.employeeId,
          violation_type: caseData.actionType || caseData.title,
          description: caseData.reason,
          incident_date: caseData.issueDate,
          reported_date: caseData.reportedDate || new Date().toISOString().split('T')[0],
          reported_by: caseData.reportedBy || 'System',
          severity: caseData.severity || 'Medium',
          status: caseData.status === 'Ongoing' ? 'open' : caseData.status === 'Closed' ? 'closed' : 'open',
          investigation_notes: caseData.investigationNotes || '',
          action_taken: caseData.actionTaken || '',
          resolution_date: caseData.resolutionDate,
          resolution_notes: caseData.resolutionNotes || ''
        };

        let response;
        if (caseData.id) {
          // Update existing case
          response = await disciplinaryCaseAPI.update(caseData.id, backendData);
          setCases(prev => prev.map(c => c.id === caseData.id ? {
            ...c,
            ...caseData,
            caseId: response.data.case_number
          } : c));
        } else {
          // Create new case
          response = await disciplinaryCaseAPI.create(backendData);
          const newCase = {
            id: response.data.id,
            caseId: response.data.case_number,
            employeeId: response.data.employee_id,
            title: response.data.violation_type,
            reason: response.data.description,
            actionType: response.data.violation_type,
            status: response.data.status === 'open' ? 'Ongoing' : 'Closed',
            issueDate: response.data.incident_date,
            reportedDate: response.data.reported_date,
            reportedBy: response.data.reported_by,
            severity: response.data.severity,
            investigationNotes: response.data.investigation_notes,
            actionTaken: response.data.action_taken,
            resolutionDate: response.data.resolution_date,
            resolutionNotes: response.data.resolution_notes
          };
          setCases(prev => [newCase, ...prev]);
        }
        
        setShowModal(false);
        setEditingCase(null);
      } catch (err) {
        console.error('Error saving case:', err);
        alert('Failed to save case. Please try again.');
      }
    },
    
    addCaseLogEntry: async (caseId, logEntry) => {
      // This would be for adding log entries - can be implemented later
      console.log('Adding log entry for case:', caseId, logEntry);
    }
  };

  const stats = useMemo(() => ({
    total: cases.length,
    ongoing: cases.filter(c => c.status === 'Ongoing').length,
    closed: cases.filter(c => c.status === 'Closed').length,
  }), [cases]);

  const chartData = useMemo(() => {
    const counts = cases.reduce((acc, c) => {
        acc[c.actionType] = (acc[c.actionType] || 0) + 1;
        return acc;
    }, {});
    return {
        labels: Object.keys(counts),
        datasets: [{
            data: Object.values(counts),
            backgroundColor: ['#ffc107', '#fd7e14', '#dc3545', '#6c757d', '#0dcaf0'],
            borderColor: '#fff',
            borderWidth: 2,
        }],
    };
  }, [cases]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            position: 'right',
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
          const employeeName = employeeMap.get(c.employeeId)?.name.toLowerCase() || '';
          return (
            c.caseId?.toLowerCase().includes(lowerSearch) ||
            employeeName.includes(lowerSearch) ||
            c.actionType?.toLowerCase().includes(lowerSearch) ||
            c.reason?.toLowerCase().includes(lowerSearch)
          );
        }
        return true;
      })
      .sort((a, b) => new Date(b.issueDate || 0) - new Date(a.issueDate || 0));
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

  if (selectedCase) {
    return (
      <>
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
      </>
    );
  }

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
                <table className="table data-table mb-0">
                    <tbody>
                        {cases.slice(0,5).map(c => (
                            <tr key={c.id || c.caseId} onClick={() => handleViewDetails(c)} style={{cursor:'pointer'}}>
                                <td>
                                    <strong>{c.title || c.reason}</strong>
                                    <br/>
                                    <small className="text-muted">{employeeMap.get(c.assignedTo || c.employeeId)?.name}</small>
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

  if (loading) {
    return (
      <div className="container-fluid p-0 page-module-container">
        <div className="d-flex justify-content-center align-items-center" style={{height: '400px'}}>
          <div className="text-center">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-3">Loading case management data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-fluid p-0 page-module-container">
        <div className="alert alert-danger" role="alert">
          <h4 className="alert-heading">Error!</h4>
          <p>{error}</p>
          <button className="btn btn-outline-danger" onClick={() => window.location.reload()}>
            <i className="bi bi-arrow-clockwise me-2"></i>Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid p-0 page-module-container">
      <header className="page-header d-flex justify-content-between align-items-center mb-4">
        <h1 className="page-main-title">Case Management</h1>
        <button className="btn btn-success" onClick={() => handleOpenModal()}><i className="bi bi-plus-circle-fill me-2"></i>Log New Case</button>
      </header>

      <ul className="nav nav-tabs case-management-tabs mb-4">
        <li className="nav-item"><button className={`nav-link ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>Dashboard</button></li>
        <li className="nav-item"><button className={`nav-link ${activeTab === 'list' ? 'active' : ''}`} onClick={() => setActiveTab('list')}>All Cases</button></li>
      </ul>

      {activeTab === 'dashboard' ? renderDashboard() : renderCaseList()}

      <AddEditCaseModal 
        show={showModal && !selectedCase}
        onClose={handleCloseModal}
        onSave={handlers.saveCase}
        caseData={editingCase}
        employees={employees}
      />
    </div>
  );
};

export default CaseManagementPage;
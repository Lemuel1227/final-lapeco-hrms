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
import ActionCaseSubmissionModal from '../../modals/ActionCaseSubmissionModal';
import ViewReasonModal from '../../modals/ViewReasonModal';
import ActionsDropdown from '../../common/ActionsDropdown';
import ConfirmationModal from '../../modals/ConfirmationModal';
import ToastNotification from '../../common/ToastNotification';
import useReportGenerator from '../../hooks/useReportGenerator';
import { reportsConfig } from '../../config/reports.config'; 
import { disciplinaryCaseAPI, employeeAPI } from '../../services/api';
import './CaseManagement.css';

ChartJS.register(ArcElement, Tooltip, Legend);

const normalizeActionLogs = (logs = []) => logs.map(log => ({
  id: log.id,
  date: log.date_created
    ? new Date(log.date_created).toISOString().slice(0, 10)
    : (log.date ? String(log.date).slice(0, 10) : ''),
  action: log.description || log.action,
}));

const mapCaseFromApi = (caseData, fallbackActionLogs = []) => {
  if (!caseData) {
    return null;
  }

  const actionLogsSource = Array.isArray(caseData.action_logs) && caseData.action_logs.length > 0
    ? caseData.action_logs
    : fallbackActionLogs;

  const incidentDate = caseData.incident_date ? String(caseData.incident_date).slice(0, 10) : '';

  return {
    caseId: caseData.id,
    employeeId: caseData.employee_id,
    actionType: caseData.action_type,
    description: caseData.description,
    incidentDate,
    reason: caseData.reason,
    status: caseData.status,
    resolutionTaken: caseData.resolution_taken,
    attachment: caseData.attachment,
    issueDate: incidentDate,
    updatedAt: caseData.updated_at,
    approvalStatus: caseData.approval_status,
    submittedBy: caseData.reported_by ?? null,
    actionLog: normalizeActionLogs(actionLogsSource),
    attachments: caseData.attachment ? [caseData.attachment] : [],
    nextSteps: caseData.resolution_taken,
  };
};

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

  const [submissionToAction, setSubmissionToAction] = useState(null);
  const [submissionActionType, setSubmissionActionType] = useState('');
  const [viewingSubmission, setViewingSubmission] = useState(null);
  const [isProcessingSubmission, setIsProcessingSubmission] = useState(false);

  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showReportPreview, setShowReportPreview] = useState(false);
  const { generateReport, pdfDataUri, isLoading, setPdfDataUri } = useReportGenerator();
  const [caseToDelete, setCaseToDelete] = useState(null);
  const [pendingSubmissions, setPendingSubmissions] = useState([]);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

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
          incidentDate: c.incident_date ? String(c.incident_date).slice(0,10) : '',
          reason: c.reason,
          status: c.status,
          resolutionTaken: c.resolution_taken,
          attachment: c.attachment,
          issueDate: c.incident_date ? String(c.incident_date).slice(0,10) : '', // Ensure YYYY-MM-DD for date input
          updatedAt: c.updated_at, // Add updated_at field for proper sorting
          approvalStatus: c.approval_status,
          submittedBy: c.reported_by || 'Unknown',
          actionLog: (c.action_logs || []).map(log => ({
            id: log.id,
            date: log.date_created,
            action: log.description
          })),
          attachments: c.attachment ? [c.attachment] : [], // Convert single attachment to array
          nextSteps: c.resolution_taken, // Map resolution_taken to nextSteps
        }));
        
        // Split approved vs pending for UI rules
        const approvedCases = transformedCases.filter(c => c.approvalStatus === 'approved');
        const pendingCases = transformedCases.filter(c => c.approvalStatus === 'pending');
        
        // Transform employees data to match expected format
        const transformedEmployees = employeesData.map(emp => {
          const fullName = emp.name ?? [emp.first_name, emp.middle_name, emp.last_name]
            .filter(Boolean)
            .join(' ');

          return {
            id: emp.id,
            name: fullName,
            email: emp.email,
            position: emp.position?.name || 'N/A',
          };
        });
        
        setCases(approvedCases);
        setEmployees(transformedEmployees);
        setPendingSubmissions(pendingCases);
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
      closed: cases.filter(c => c.status === 'Closed').length,
      pendingSubmissions: pendingSubmissions.length,
    };
  }, [cases, pendingSubmissions]);

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

  const handleViewDetails = async (caseData) => {
    try {
      const { data } = await disciplinaryCaseAPI.getById(caseData.caseId);
      const actionLogsSource = data.action_logs ?? caseData.actionLog ?? [];
      const attachments = Array.isArray(data.attachments) ? data.attachments : (data.attachment ? [data.attachment] : []);
      const detailedCase = {
        caseId: data.id,
        employeeId: data.employee_id,
        actionType: data.action_type,
        description: data.description,
        incidentDate: data.incident_date ? String(data.incident_date).slice(0,10) : '',
        reason: data.reason,
        status: data.status,
        resolutionTaken: data.resolution_taken,
        attachment: data.attachment,
        issueDate: data.incident_date ? String(data.incident_date).slice(0,10) : '',
        updatedAt: data.updated_at,
        approvalStatus: data.approval_status,
        submittedBy: data.reported_by,
        actionLog: actionLogsSource.map(log => ({
          id: log.id,
          date: log.date_created ? new Date(log.date_created).toISOString().slice(0,10) : (log.date ? String(log.date).slice(0,10) : ''),
          action: log.description || log.action
        })),
        attachments,
        nextSteps: data.resolution_taken,
      };
      setSelectedCase(detailedCase);
    } catch (err) {
      console.error('Failed to load case details:', err);
      setSelectedCase(caseData);
    }
  };

  const handleOpenSubmissionActionModal = (submission, action) => {
    setSubmissionToAction(submission);
    setSubmissionActionType(action);
  };

  const handleCloseSubmissionActionModal = () => {
    setSubmissionToAction(null);
    setSubmissionActionType('');
  };

  const handleViewSubmissionAttachment = async (submission) => {
    if (!submission) return;

    const caseId = submission.caseId ?? submission.id;
    const attachments = Array.isArray(submission.attachments)
      ? submission.attachments
      : (submission.attachment ? [submission.attachment] : []);

    if (!caseId || attachments.length === 0) {
      return;
    }

    try {
      await handlers.downloadAttachment(caseId, attachments[0]);
    } catch (err) {
      console.error('Failed to open submission attachment:', err);
    }
  };

  const handleConfirmSubmissionAction = async (submissionId, status, comments) => {
    if (!submissionId || !status) return;

    try {
      setIsProcessingSubmission(true);
      await handlers.updateCaseSubmissionStatus(submissionId, status, comments);
      handleCloseSubmissionActionModal();
    } catch (err) {
      console.error('Failed to update submission status:', err);
    } finally {
      setIsProcessingSubmission(false);
    }
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
        incidentDate: response.data.incident_date ? String(response.data.incident_date).slice(0,10) : '',
        reason: response.data.reason,
        status: response.data.status,
        resolutionTaken: response.data.resolution_taken,
        attachment: response.data.attachment,
        issueDate: response.data.incident_date ? String(response.data.incident_date).slice(0,10) : '',
        updatedAt: response.data.updated_at, // Add updated_at field
        approvalStatus: response.data.approval_status,
        submittedBy: response.data.reported_by,
        actionLog: [], // New cases won't have action logs initially
        attachments: response.data.attachment ? [response.data.attachment] : [], // Convert single attachment to array
        nextSteps: response.data.resolution_taken, // Map resolution_taken to nextSteps
      };
      
      // Add to appropriate list based on approval_status
      if (addedCase.approvalStatus === 'approved') {
        setCases(prev => [...prev, addedCase]);
      } else {
        setPendingSubmissions(prev => [...prev, addedCase]);
      }
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
      const actionLogsSource = response.data.action_logs ?? editingCase?.actionLog ?? [];

      const editedCase = {
        caseId: response.data.id,
        employeeId: response.data.employee_id,
        actionType: response.data.action_type,
        description: response.data.description,
        incidentDate: response.data.incident_date ? String(response.data.incident_date).slice(0,10) : '',
        reason: response.data.reason,
        status: response.data.status,
        resolutionTaken: response.data.resolution_taken,
        attachment: response.data.attachment,
        issueDate: response.data.incident_date ? String(response.data.incident_date).slice(0,10) : '',
        updatedAt: response.data.updated_at, // Add updated_at field
        approvalStatus: response.data.approval_status,
        submittedBy: response.data.reported_by,
        actionLog: actionLogsSource.map(log => ({
          id: log.id,
          date: log.date_created ? new Date(log.date_created).toISOString().slice(0,10) : (log.date ? String(log.date).slice(0,10) : ''),
          action: log.description || log.action
        })),
        attachments: response.data.attachment ? [response.data.attachment] : [], // Convert single attachment to array
        nextSteps: response.data.resolution_taken, // Map resolution_taken to nextSteps
      };
      
      setCases(prev => prev.map(c => c.caseId === editingCase.caseId ? editedCase : c));
      setSelectedCase(prev => prev && prev.caseId === editingCase.caseId ? editedCase : prev);
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

  const handleConfirmDelete = async () => {
    try {
      if (!caseToDelete) return;
      await handleDeleteCase(caseToDelete.caseId);
      setCaseToDelete(null);
      if (selectedCase?.caseId === caseToDelete.caseId) {
        setSelectedCase(null);
      }
    } catch (err) {
      console.error('Failed to confirm deletion:', err);
    }
  };

  const handlers = {
    saveCase: editingCase ? handleEditCase : handleAddCase,
    addCaseLogEntry: (caseId, logEntry) => {
      // Append log entry to the selected case and cases list
      setSelectedCase(prev => prev && prev.caseId === caseId ? {
        ...prev,
        actionLog: [...(prev.actionLog || []), logEntry]
      } : prev);

      setCases(prev => prev.map(c => c.caseId === caseId ? {
        ...c,
        actionLog: [...(c.actionLog || []), logEntry]
      } : c));
    },
    deleteCaseLogEntry: async (caseId, logId, index) => {
      try {
        if (logId) {
          await disciplinaryCaseAPI.deleteActionLog(logId);
        }
        setSelectedCase(prev => prev && prev.caseId === caseId ? {
          ...prev,
          actionLog: (prev.actionLog || []).filter((log, i) => logId ? log.id !== logId : i !== index)
        } : prev);
        setCases(prev => prev.map(c => c.caseId === caseId ? {
          ...c,
          actionLog: (c.actionLog || []).filter((log, i) => logId ? log.id !== logId : i !== index)
        } : c));
      } catch (err) {
        console.error('Failed to delete action log:', err);
      }
    },
    updateCaseSubmissionStatus: async (submissionId, status, comments) => {
      try {
        const normalizedStatus = status === 'Approved' ? 'approved' : 'declined';
        const payload = {
          approval_status: normalizedStatus,
          status: status === 'Approved' ? 'Ongoing' : 'Closed',
        };

        if (comments && comments.trim()) {
          payload.resolution_taken = comments.trim();
        }

        const response = await disciplinaryCaseAPI.update(submissionId, payload);
        const updatedCase = mapCaseFromApi(response.data);

        setPendingSubmissions(prev => prev.filter(sub => (sub.caseId ?? sub.id) !== submissionId));

        if (normalizedStatus === 'approved' && updatedCase) {
          setCases(prev => {
            const exists = prev.some(c => c.caseId === updatedCase.caseId);
            if (exists) {
              return prev.map(c => c.caseId === updatedCase.caseId ? updatedCase : c);
            }
            return [...prev, updatedCase];
          });
        }
      } catch (err) {
        console.error('Failed to update case submission status:', err);
        throw err;
      }
    },
    uploadAttachment: async (caseId, file) => {
      try {
        const res = await disciplinaryCaseAPI.uploadAttachment(caseId, file);
        const filename = res.data?.filename || file.name;
        setSelectedCase(prev => prev && prev.caseId === caseId ? {
          ...prev,
          attachments: [...(prev.attachments || []), filename]
        } : prev);
        setCases(prev => prev.map(c => c.caseId === caseId ? {
          ...c,
          attachments: [...(c.attachments || []), filename]
        } : c));
      } catch (err) {
        console.error('Failed to upload attachment:', err);
        const backendMessage = Array.isArray(err.response?.data?.errors?.attachment)
          ? err.response.data.errors.attachment.join('\n')
          : (err.response?.data?.message || 'Failed to upload attachment. Please try again.');
        setToast({ show: true, message: backendMessage, type: 'error' });
        throw err;
      }
    },
    deleteAttachment: async (caseId, filename) => {
      try {
        await disciplinaryCaseAPI.deleteAttachment(caseId, filename);
        setSelectedCase(prev => prev && prev.caseId === caseId ? {
          ...prev,
          attachments: (prev.attachments || []).filter(f => f !== filename)
        } : prev);
        setCases(prev => prev.map(c => c.caseId === caseId ? {
          ...c,
          attachments: (c.attachments || []).filter(f => f !== filename)
        } : c));
      } catch (err) {
        console.error('Failed to delete attachment:', err);
        throw err;
      }
    },
    downloadAttachment: async (caseId, filename) => {
      try {
        const res = await disciplinaryCaseAPI.downloadAttachment(caseId, filename);
        const fileData = res && typeof res === 'object' ? res.data : null;
        if (!fileData) {
          throw new Error('Empty download response');
        }

        const blob = fileData instanceof Blob ? fileData : new Blob([fileData]);

        if (!(blob instanceof Blob)) {
          throw new Error('Download response was not a file');
        }

        const disposition = res.headers?.['content-disposition'] || res.headers?.get?.('content-disposition');
        if (disposition) {
          const match = /filename="?(.+?)"?(;|$)/i.exec(disposition);
          if (match && match[1]) {
            filename = decodeURIComponent(match[1]);
          }
        }

        const url = window.URL.createObjectURL(blob);

        const mimeType = blob.type || '';
        const inlineTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'text/plain'];

        if (inlineTypes.some(type => mimeType.startsWith(type))) {
          window.open(url, '_blank', 'noopener');
          window.setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
        } else {
          const anchor = document.createElement('a');
          anchor.href = url;
          anchor.download = filename;
          document.body.appendChild(anchor);
          anchor.click();
          document.body.removeChild(anchor);
          window.URL.revokeObjectURL(url);
        }
      } catch (err) {
        console.error('Failed to download attachment:', err);
      }
    },
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

  const renderCaseReports = () => (
    <div className="card data-table-card shadow-sm">
      <div className="card-header">
        <h6 className="mb-0">Pending Case Report Submissions ({pendingSubmissions.length})</h6>
      </div>
      <div className="table-responsive">
        <table className="table data-table mb-0 align-middle">
          <thead>
            <tr>
              <th>Submitted By</th>
              <th>Regarding</th>
              <th>Date of Incident</th>
              <th className="text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pendingSubmissions.length > 0 ? pendingSubmissions.map(sub => {
              const submittedByName = employeeMap.get(sub.submittedBy)?.name || sub.submittedBy;
              const employeeName = employeeMap.get(sub.employeeId)?.name || sub.employeeId;
              const submissionAttachments = Array.isArray(sub.attachments) ? sub.attachments : (sub.attachment ? [sub.attachment] : []);
              const hasAttachments = submissionAttachments.length > 0;
              return (
                <tr key={sub.caseId || sub.id}>
                  <td>{submittedByName}</td>
                  <td>{employeeName}</td>
                  <td>{sub.issueDate}</td>
                  <td className="text-center">
                    <ActionsDropdown>
                        <a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); setViewingSubmission(sub); }}>
                            <i className="bi bi-info-circle me-2"></i> View Description
                        </a>
                        <a
                          className={`dropdown-item ${hasAttachments ? '' : 'disabled'}`}
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            if (hasAttachments) {
                              handleViewSubmissionAttachment(sub);
                            }
                          }}
                        >
                            <i className="bi bi-paperclip me-2"></i> View Attachments
                        </a>
                        <div className="dropdown-divider"></div>
                        <a className="dropdown-item text-success" href="#" onClick={(e) => { e.preventDefault(); handleOpenSubmissionActionModal(sub, 'Approved'); }}>
                            <i className="bi bi-check-circle-fill me-2"></i> Approve
                        </a>
                        <a className="dropdown-item text-danger" href="#" onClick={(e) => { e.preventDefault(); handleOpenSubmissionActionModal(sub, 'Declined'); }}>
                            <i className="bi bi-x-circle-fill me-2"></i> Decline
                        </a>
                    </ActionsDropdown>
                  </td>
                </tr>
              );
            }) : (
              <tr><td colSpan="4" className="text-center p-4 text-muted">There are no pending case reports for review.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderCaseList = () => (
    <>
         <div className="my-cases-stats-grid">
            <div className={`stat-card-my-cases all ${statusFilter === 'All' ? 'active' : ''}`} onClick={() => setStatusFilter('All')}>
                <span className="stat-value">{stats.total}</span>
                <span className="stat-label">All Cases</span>
            </div>
            <div className={`stat-card-my-cases ongoing ${statusFilter === 'Ongoing' ? 'active' : ''}`} onClick={() => setStatusFilter('Ongoing')}>
                <span className="stat-value">{stats.ongoing}</span>
                <span className="stat-label">Ongoing</span>
            </div>
            <div className={`stat-card-my-cases closed ${statusFilter === 'Closed' ? 'active' : ''}`} onClick={() => setStatusFilter('Closed')}>
                <span className="stat-value">{stats.closed}</span>
                <span className="stat-label">Closed</span>
            </div>
        </div>
        <div className="controls-bar d-flex justify-content-between mb-4">
            <div className="input-group" style={{ maxWidth: '400px' }}>
                <span className="input-group-text"><i className="bi bi-search"></i></span>
                <input type="text" className="form-control" placeholder="Search by Case ID, Name, Reason..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
        </div>
        <div className="case-card-grid">
            {filteredCases.map(c => 
              <CaseCard 
                key={c.caseId} 
                caseInfo={c} 
                employee={employeeMap.get(c.employeeId)}
                onView={handleViewDetails} 
                onDelete={(ci) => setCaseToDelete(ci)}
              />
            )}
        </div>
        {filteredCases.length === 0 && <div className="text-center p-5 bg-light rounded"><p>No cases found for the selected filters.</p></div>}
    </>
  );

  if (selectedCase) {
    return (
      <div>
        <CaseDetailView 
            caseInfo={selectedCase}
            employee={employeeMap.get(selectedCase.employeeId)}
            onBack={() => setSelectedCase(null)}
            onSaveLog={handlers.addCaseLogEntry}
            onEdit={handleOpenModal}
            onDelete={(ci) => setCaseToDelete(ci)}
            onDeleteLog={handlers.deleteCaseLogEntry}
            onConfirmDeleteCase={async (ci) => { await handleDeleteCase(ci.caseId); if (selectedCase?.caseId === ci.caseId) setSelectedCase(null); }}
            onUploadAttachment={handlers.uploadAttachment}
            onDeleteAttachment={handlers.deleteAttachment}
            onDownloadAttachment={handlers.downloadAttachment}
        />
        {toast.show && (
          <ToastNotification
            message={toast.message}
            type={toast.type}
            onClose={() => setToast({ show: false, message: '', type: 'success' })}
          />
        )}
        <AddEditCaseModal 
          show={showModal}
          onClose={handleCloseModal}
          onSave={handlers.saveCase}
          caseData={editingCase}
          employees={employees}
          onDelete={(ci) => { setCaseToDelete(ci); setShowModal(false); setEditingCase(null); }}
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
            <li className="nav-item">
              <button className={`nav-link ${activeTab === 'reports' ? 'active' : ''}`} onClick={() => setActiveTab('reports')}>
                Case Reports
                {stats.pendingSubmissions > 0 && <span className="badge rounded-pill bg-warning text-dark ms-2">{stats.pendingSubmissions}</span>}
              </button>
            </li>
            <li className="nav-item"><button className={`nav-link ${activeTab === 'list' ? 'active' : ''}`} onClick={() => setActiveTab('list')}>All Cases</button></li>
            <li className="nav-item"><button className={`nav-link ${activeTab === 'byEmployee' ? 'active' : ''}`} onClick={() => setActiveTab('byEmployee')}>By Employee</button></li>
          </ul>

          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'list' && renderCaseList()}
          {activeTab === 'reports' && renderCaseReports()}
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
      <ConfirmationModal
          show={!!caseToDelete}
          onClose={() => setCaseToDelete(null)}
          onConfirm={handleConfirmDelete}
          title="Confirm Case Deletion"
          confirmText="Yes, Delete Case"
          confirmVariant="danger"
      >
          {caseToDelete && (
              <p>Are you sure you want to permanently delete the case "<strong>{caseToDelete.reason}</strong>" for <strong>{employeeMap.get(caseToDelete.employeeId)?.name}</strong>?</p>
          )}
          <p className="text-danger">This action cannot be undone.</p>
      </ConfirmationModal>
      <ViewReasonModal
        show={!!viewingSubmission}
        onClose={() => setViewingSubmission(null)}
        title="Case Report Description"
        request={viewingSubmission ? {
          employeeName: employeeMap.get(viewingSubmission.employeeId)?.name || viewingSubmission.employeeName || viewingSubmission.employeeId,
          employeeId: viewingSubmission.employeeId,
          submittedByName: employeeMap.get(viewingSubmission.submittedBy)?.name || viewingSubmission.submittedByName || viewingSubmission.submittedBy,
          type: viewingSubmission.actionType || 'Case Report',
          reason: viewingSubmission.reason,
          description: viewingSubmission.description,
        } : null}
      />
      <ActionCaseSubmissionModal
        show={!!submissionToAction && !!submissionActionType}
        onClose={handleCloseSubmissionActionModal}
        onConfirm={handleConfirmSubmissionAction}
        submissionData={submissionToAction ? {
          submission: {
            caseId: submissionToAction.caseId ?? submissionToAction.id,
            employeeId: submissionToAction.employeeId,
            employeeName: employeeMap.get(submissionToAction.employeeId)?.name || submissionToAction.employeeName || submissionToAction.employeeId,
            reason: submissionToAction.reason,
            submittedByName: employeeMap.get(submissionToAction.submittedBy)?.name || submissionToAction.submittedByName || submissionToAction.submittedBy,
          },
          action: submissionActionType,
        } : null}
        isProcessing={isProcessingSubmission}
      />
      {toast.show && (
        <ToastNotification
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ show: false, message: '', type: 'success' })}
        />
      )}
    </div>
  );
};

export default CaseManagementPage;
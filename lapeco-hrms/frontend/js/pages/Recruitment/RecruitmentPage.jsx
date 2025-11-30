import React, { useState, useMemo, useEffect } from 'react';
import './RecruitmentPage.css';
import ChatbotManagementTab from './ChatbotManagementTab';
import AddApplicantModal from '../../modals/AddApplicantModal';
import ViewApplicantDetailsModal from '../../modals/ViewApplicantDetailsModal';
import ScheduleInterviewModal from '../../modals/ScheduleInterviewModal';
import HireApplicantModal from '../../modals/HireApplicantModal';
import ReportPreviewModal from '../../modals/ReportPreviewModal';
import AccountGeneratedModal from '../../modals/AccountGeneratedModal';
import ConfirmationModal from '../../modals/ConfirmationModal';
import ReportConfigurationModal from '../../modals/ReportConfigurationModal';
import ActionsDropdown from '../../common/ActionsDropdown';
import ToastNotification from '../../common/ToastNotification';
import { reportsConfig } from '../../config/reports.config';
import useReportGenerator from '../../hooks/useReportGenerator';
import { positionAPI, applicantAPI } from '../../services/api';

const PIPELINE_STAGES = ['New Applicant', 'Interview', 'Hired', 'Rejected'];

const calculateAge = (birthdate) => {
    if (!birthdate) return 'N/A';
    const ageDifMs = Date.now() - new Date(birthdate).getTime();
    const ageDate = new Date(ageDifMs);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
};

const formatDate = (dateString, includeTime = false) => {
  if (!dateString) return 'N/A';
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  if (includeTime) {
    options.hour = 'numeric';
    options.minute = '2-digit';
  }
  return new Date(dateString).toLocaleDateString('en-US', options);
};

const RecruitmentPage = () => {
  const [activeTab, setActiveTab] = useState('recruitment');
  const [viewMode, setViewMode] = useState('dashboard');
  const [showApplicantModal, setShowApplicantModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showInterviewModal, setShowInterviewModal] = useState(false);
  const [showHireModal, setShowHireModal] = useState(false);
  const [showReportConfigModal, setShowReportConfigModal] = useState(false);
  
  // Toast notification state
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  
  const { generateReport, pdfDataUri, isLoading, setPdfDataUri } = useReportGenerator();
  const [showReportPreview, setShowReportPreview] = useState(false);
  
  const [selectedApplicant, setSelectedApplicant] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // State for positions data
  const [positions, setPositions] = useState([]);
  const [loadingPositions, setLoadingPositions] = useState(false);

  // State for applicants data
  const [applicants, setApplicants] = useState([]);
  const [loadingApplicants, setLoadingApplicants] = useState(false);
  const [errorApplicants, setErrorApplicants] = useState(null);

  // State for job openings (if needed later)
  const [jobOpenings, setJobOpenings] = useState([]);

  // Fetch positions data for the applicant modal
  useEffect(() => {
    const fetchPositions = async () => {
      if (positions.length === 0) {
        try {
          setLoadingPositions(true);
          const response = await positionAPI.getAllPublic();
          setPositions(response.data || []);
        } catch (error) {
          setPositions([]);
        } finally {
          setLoadingPositions(false);
        }
      }
    };

    fetchPositions();
  }, [positions.length]);

  // Fetch applicants data (summary for list view)
  useEffect(() => {
    const fetchApplicants = async () => {
      try {
        setLoadingApplicants(true);
        setErrorApplicants(null);
        // Use summary=true for recruitment page list view (minimal data)
        const response = await applicantAPI.getAll(true);
        setApplicants(response.data || []);
      } catch (error) {
        setErrorApplicants('Failed to load applicants. Please try again.');
        setApplicants([]);
      } finally {
        setLoadingApplicants(false);
      }
    };

    fetchApplicants();
  }, []);
  const [sortConfig, setSortConfig] = useState({ key: 'application_date', direction: 'descending' });
  const [newlyGeneratedAccount, setNewlyGeneratedAccount] = useState(null);
  const [applicantToDelete, setApplicantToDelete] = useState(null);
  const [applicantToReject, setApplicantToReject] = useState(null);
  const [hireValidationErrors, setHireValidationErrors] = useState(null);

  // Handlers for applicant operations
  const handleSaveApplicant = async (applicantData) => {
    try {
      const response = await applicantAPI.create(applicantData);
      // Refresh full list to ensure consistent shape (summary view)
      try {
        const list = await applicantAPI.getAll(true);
        setApplicants(list.data || []);
      } catch (e) {
        // Fallback: append created item
        setApplicants(prev => [...prev, response.data]);
      }
      setShowApplicantModal(false);
      setToast({ show: true, message: `Applicant added: ${response.data.full_name || response.data.name || 'New applicant'}`, type: 'success' });
      return { ok: true };
    } catch (error) {
      let msg = error.response?.data?.message || 'Failed to add applicant. Please try again.';
      let fieldErrors = null;
      if (error.response?.status === 422 && error.response?.data?.errors) {
        fieldErrors = error.response.data.errors;
        const flat = Object.values(fieldErrors).flat();
        if (flat.length > 0) msg = flat.join(' ');
      }
      setToast({ show: true, message: msg, type: 'error' });
      return { ok: false, errors: fieldErrors };
    }
  };

  const handleUpdateApplicantStatus = async (applicantId, newStatus) => {
    try {
      const response = await applicantAPI.updateStatus(applicantId, { status: newStatus });
      setApplicants(prev => 
        prev.map(app => 
          app.id === applicantId 
            ? { ...app, status: newStatus }
            : app
        )
      );
      
      // Show success toast notification
      const applicant = applicants.find(app => app.id === applicantId);
      const applicantName = applicant?.name || 'Applicant';
      setToast({ 
        show: true, 
        message: `${applicantName} has been moved to ${newStatus}`, 
        type: 'success' 
      });
    } catch (error) {
      // Show error toast notification
      const errorMessage = error.response?.data?.message || 'Failed to update applicant status. Please try again.';
      setToast({ show: true, message: errorMessage, type: 'error' });
    }
  };

  const handleScheduleInterview = async (applicantId, interviewData) => {
    try {
      const response = await applicantAPI.scheduleInterview(applicantId, interviewData);
      setApplicants(prev => 
        prev.map(app => 
          app.id === applicantId 
            ? { ...app, status: 'Interview', interview_schedule: response.data.applicant.interview_schedule }
            : app
        )
      );
      setShowInterviewModal(false);
      
      // Show success toast notification
      const applicant = applicants.find(app => app.id === applicantId);
      const applicantName = applicant?.name || 'Applicant';
      setToast({ 
        show: true, 
        message: `Interview scheduled for ${applicantName}`, 
        type: 'success' 
      });
    } catch (error) {
      // Show error toast notification with detailed validation errors
      let errorMessage = 'Failed to schedule interview. Please try again.';
      
      if (error.response?.data) {
        const { message, errors } = error.response.data;
        
        if (errors && Object.keys(errors).length > 0) {
          // Extract specific field validation errors
          const fieldErrors = Object.values(errors).flat();
          errorMessage = fieldErrors.length === 1 
            ? fieldErrors[0] 
            : fieldErrors.join('. ');
        } else if (message) {
          errorMessage = message;
        }
      }
      
      setToast({ show: true, message: errorMessage, type: 'error' });
    }
  };

  const handleDeleteApplicant = async (applicantId) => {
    try {
      await applicantAPI.delete(applicantId);
      setApplicants(prev => prev.filter(app => app.id !== applicantId));
      setApplicantToDelete(null);
      setToast({ show: true, message: 'Applicant deleted successfully.', type: 'success' });
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to delete applicant. Please try again.';
      setToast({ show: true, message: msg, type: 'error' });
    }
  };

  const jobOpeningsMap = useMemo(() => {
    if (!jobOpenings || !Array.isArray(jobOpenings)) return new Map();
    return new Map(jobOpenings.map(job => [job.id, job.title]));
  }, [jobOpenings]);
  const positionsMap = useMemo(() => {
    if (!positions || !Array.isArray(positions)) return new Map();
    return new Map(positions.map(p => [p.id, p.title || p.name]));
  }, [positions]);
  
  const recruitmentReportConfig = useMemo(() => reportsConfig.find(r => r.id === 'recruitment_activity'), []);

  const filteredApplicants = useMemo(() => {
    if (!applicants || !Array.isArray(applicants)) return [];
    
    let results = [...applicants];
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    if (start) start.setHours(0, 0, 0, 0);
    if (end) end.setHours(23, 59, 59, 999);
    if (start || end) {
        results = results.filter(app => {
            if (!app.application_date) return false;
            const appDate = new Date(app.application_date);
            const inRange = (date) => (!start || date >= start) && (!end || date <= end);
            return inRange(appDate);
        });
    }
    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (normalizedSearch) {
        results = results.filter(app => {
            const fullName = (app.full_name || [app.first_name, app.middle_name, app.last_name].filter(Boolean).join(' ')).toLowerCase();
            const email = (app.email || '').toLowerCase();
            const phone = (app.phone || '').toLowerCase();
            const address = (app.address || '').toLowerCase();
            return fullName.includes(normalizedSearch) || email.includes(normalizedSearch) || phone.includes(normalizedSearch) || address.includes(normalizedSearch);
        });
    }
    results.sort((a, b) => {
        const valA = a[sortConfig.key] || '';
        const valB = b[sortConfig.key] || '';
        if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
    });
    // Normalize statuses: map legacy 'Offer' to 'Interview' for display
    const normalizeStatus = (s) => (s === 'Offer' ? 'Interview' : s);
    return results.map(app => ({ ...app, status: normalizeStatus(app.status) }));
  }, [applicants, searchTerm, startDate, endDate, sortConfig]);
  
  const stats = useMemo(() => {
    if (!filteredApplicants || !Array.isArray(filteredApplicants)) {
        return { totalApplicants: 0, newlyHired: 0, interviewsSet: 0 };
    }
    return {
        totalApplicants: filteredApplicants.length,
        newlyHired: filteredApplicants.filter(a => a.status === 'Hired').length,
        interviewsSet: filteredApplicants.filter(a => a.status === 'Interview').length
    };
  }, [filteredApplicants]);

  const dateRangeText = useMemo(() => {
    if (startDate && endDate) return `${formatDate(startDate)} - ${formatDate(endDate)}`;
    if (startDate) return `From ${formatDate(startDate)}`;
    if (endDate) return `Until ${formatDate(endDate)}`;
    return 'All Time';
  }, [startDate, endDate]);

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over) return;

    const applicantId = parseInt(active.id, 10);
    const applicantData = active.data.current?.applicant;
    const originalStatus = applicantData?.status;
    const newStatus = over.id;

    if (originalStatus && newStatus && originalStatus !== newStatus && PIPELINE_STAGES.includes(newStatus)) {
      if (newStatus === 'Hired') {
        setSelectedApplicant(applicantData);
        setShowHireModal(true);
      } else if (newStatus === 'Interview') {
        setSelectedApplicant(applicantData);
        setShowInterviewModal(true);
      } else if (newStatus === 'Rejected') {
        setApplicantToReject(applicantData);
      } else {
        handleUpdateApplicantStatus(applicantId, newStatus);
      }
    }
  };
  
  const handleConfirmDelete = () => {
    if (applicantToDelete) {
      handleDeleteApplicant(applicantToDelete.id);
      setApplicantToDelete(null);
    }
  };

  const handleConfirmReject = async () => {
    if (!applicantToReject) return;

    try {
      const response = await applicantAPI.reject(applicantToReject.id, {});

      setApplicants(prev =>
        prev.map(app =>
          app.id === applicantToReject.id
            ? { ...app, status: 'Rejected', notes: response.data.applicant?.notes ?? app.notes }
            : app
        )
      );

      const applicantName = applicantToReject?.name || applicantToReject?.full_name || 'Applicant';
      setToast({
        show: true,
        message: `${applicantName} has been moved to Rejected`,
        type: 'success'
      });
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to reject applicant. Please try again.';
      setToast({ show: true, message: errorMessage, type: 'error' });
    } finally {
      setApplicantToReject(null);
    }
  };
  
  const handleRunReport = async (reportId, params) => {
    setShowReportConfigModal(false);
    try {
      const startDate = params.startDate || null;
      const endDate = params.endDate || null;
      let dataSources = { applicants, jobOpenings };
      if (reportId === 'recruitment_activity') {
        const resp = await recruitmentAPI.getActivities({ start_date: startDate, end_date: endDate });
        const payload = resp?.data || {};
        dataSources = {
          applicants: Array.isArray(payload.applicants) ? payload.applicants : applicants,
          jobOpenings: Array.isArray(payload.job_openings) ? payload.job_openings : jobOpenings,
        };
      }
      generateReport(
        reportId,
        { startDate, endDate },
        dataSources
      );
      setShowReportPreview(true);
      setToast({ show: true, message: 'Recruitment report generated.', type: 'success' });
    } catch (e) {
      try {
        const [appsRes, posRes] = await Promise.all([
          applicantAPI.getAll(true),
          positionAPI.getAllPublic()
        ]);
        const fallbackApplicants = Array.isArray(appsRes?.data) ? appsRes.data : [];
        const fallbackJobs = Array.isArray(posRes?.data) ? posRes.data.map(p => ({ id: p.id, title: p.title || p.name })) : [];
        generateReport(
          reportId,
          { startDate: params.startDate || null, endDate: params.endDate || null },
          { applicants: fallbackApplicants, jobOpenings: fallbackJobs }
        );
        setShowReportPreview(true);
      } catch (_) {
        setToast({ show: true, message: 'Failed to fetch recruitment data. Please try again.', type: 'error' });
      }
    }
  };
  
  const handleClosePreview = () => {
    setShowReportPreview(false);
    if (pdfDataUri) {
        URL.revokeObjectURL(pdfDataUri);
    }
    setPdfDataUri('');
  };

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') { direction = 'descending'; }
    setSortConfig({ key, direction });
  };
  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <i className="bi bi-arrow-down-up sort-icon ms-1"></i>;
    return sortConfig.direction === 'ascending' ? <i className="bi bi-sort-up sort-icon active ms-1"></i> : <i className="bi bi-sort-down sort-icon active ms-1"></i>;
  };
  
  const handleAction = (action, data) => {
    switch (action) {
      case 'view': setSelectedApplicant(data); setShowViewModal(true); break;
      case 'move': handleUpdateApplicantStatus(data.applicantId, data.newStatus); break;
      case 'scheduleInterview': setSelectedApplicant(data); setShowInterviewModal(true); break;
      case 'hire': setSelectedApplicant(data); setShowHireModal(true); break;
      case 'reject': setApplicantToReject(data); break;
      case 'delete': setApplicantToDelete(data); break;
      default: break;
    }
  };

  const handleHireApplicant = async (applicantId, hireData) => {
    try {
      // Clear any previous validation errors
      setHireValidationErrors(null);
      
      const response = await applicantAPI.hire(applicantId, hireData);
      setApplicants(prev => 
          prev.map(app => 
            app.id === applicantId 
              ? { ...app, status: 'Hired' }
              : app
          )
        );
      setShowHireModal(false);
      // Always show account details when hiring is successful
      if (response.data.account_details) {
        setNewlyGeneratedAccount(response.data.account_details);
      }
      setToast({ show: true, message: 'Applicant hired successfully.', type: 'success' });
      // Return success to indicate the operation completed successfully
      return Promise.resolve();
    } catch (error) {
      
      // Handle validation errors (422)
      if (error.response && error.response.status === 422) {
        const validationErrors = error.response.data.errors;
        setHireValidationErrors(validationErrors);
      } else if (error.response && error.response.status === 500) {
        // Handle 500 errors - show them in the modal as well
        const errorMessage = error.response?.data?.error || error.response?.data?.message || 'An internal server error occurred';
        
        // Create a validation-like error structure for display in modal
        setHireValidationErrors({
          general: [errorMessage]
        });
      } else {
        // Handle other errors - clear validation errors and show generic error
        setHireValidationErrors(null);
        const errorMessage = error.response?.data?.message || 'An error occurred while hiring the applicant. Please try again.';
        setToast({ show: true, message: errorMessage, type: 'error' });
      }
      // Throw the error so the modal knows the operation failed
      throw error;
    }
  };

  const renderDashboardView = () => {
    const groupedByStatus = PIPELINE_STAGES.reduce((acc, stage) => {
      acc[stage] = filteredApplicants.filter(app => app.status === stage);
      return acc;
    }, {});

    const conversionRate = stats.totalApplicants > 0 
      ? ((stats.newlyHired / stats.totalApplicants) * 100).toFixed(1)
      : 0;

    return (
      <div className="recruitment-dashboard">
        {/* Pipeline Funnel Overview - Clickable for Filtering */}
        <div className="pipeline-funnel-section mb-4">
          <div className="pipeline-funnel-container">
            {/* All Filter Card */}
            <div 
              className={`pipeline-stage stage-all ${statusFilter === 'all' ? 'active' : ''}`}
              onClick={() => setStatusFilter('all')}
            >
              <div className="stage-card clickable">
                <div className="stage-header">
                  <h5 className="stage-title">All</h5>
                  <span className="stage-count">{filteredApplicants.length}</span>
                </div>
                <div className="stage-progress">
                  <div className="progress-bar" style={{ width: '100%' }}></div>
                </div>
                <div className="stage-footer">
                  <small className="stage-percentage">100% of total</small>
                </div>
              </div>
            </div>

            {/* Stage Filter Cards */}
            {PIPELINE_STAGES.map((stage, index) => {
              const count = groupedByStatus[stage]?.length || 0;
              const percentage = stats.totalApplicants > 0 
                ? ((count / stats.totalApplicants) * 100).toFixed(1)
                : 0;
              return (
                <div 
                  key={stage} 
                  className={`pipeline-stage stage-${stage.replace(/\s+/g, '-').toLowerCase()} ${statusFilter === stage ? 'active' : ''}`}
                  onClick={() => setStatusFilter(stage)}
                >
                  <div className="stage-card clickable">
                    <div className="stage-header">
                      <h5 className="stage-title">{stage}</h5>
                      <span className="stage-count">{count}</span>
                    </div>
                    <div className="stage-progress">
                      <div className="progress-bar" style={{ width: `${percentage}%` }}></div>
                    </div>
                    <div className="stage-footer">
                      <small className="stage-percentage">{percentage}% of total</small>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Applicants Grid View */}
        <div className="applicants-section">
          <div className="section-header d-flex justify-content-between align-items-center mb-3">
            <h3 className="section-title mb-0">Applicants</h3>
          </div>

          <div className="applicants-grid">
            {(statusFilter === 'all' ? filteredApplicants : groupedByStatus[statusFilter] || [])
              .slice(0, 12)
              .map(applicant => (
                <div key={applicant.id} className="applicant-grid-card">
                  <div className="card-header-section">
                    <div className="applicant-avatar">
                      <i className="bi bi-person-circle"></i>
                    </div>
                    <div className="applicant-header-info">
                      <h5 className="applicant-name">{applicant.full_name || applicant.name}</h5>
                      <small className="applicant-position">
                        {jobOpeningsMap.get(applicant.jobOpeningId || applicant.job_opening_id) ||
                         positionsMap.get(applicant.jobOpeningId || applicant.job_opening_id) ||
                         'Position TBD'}
                      </small>
                    </div>
                  </div>
                  
                  <div className="card-details">
                    <div className="detail-row">
                      <span className="detail-label">Email:</span>
                      <span className="detail-value text-truncate">{applicant.email || 'N/A'}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Applied:</span>
                      <span className="detail-value">{formatDate(applicant.application_date || applicant.applicationDate)}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Status:</span>
                      <span className={`status-badge status-${(applicant.status || 'New Applicant').replace(/\s+/g, '-').toLowerCase()}`}>
                        {applicant.status || 'New Applicant'}
                      </span>
                    </div>
                  </div>

                  <div className="card-actions">
                    <button 
                      className="btn btn-sm btn-primary"
                      onClick={() => { setSelectedApplicant(applicant); setShowViewModal(true); }}
                    >
                      <i className="bi bi-eye"></i> View
                    </button>
                    <ActionsDropdown>
                      {!['Interview', 'Hired', 'Rejected'].includes(applicant.status) && (
                        <a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); setSelectedApplicant(applicant); setShowInterviewModal(true); }}>Schedule Interview</a>
                      )}
                      
                      {!['Hired', 'Rejected'].includes(applicant.status) && (
                        <a className="dropdown-item text-success" href="#" onClick={(e) => { e.preventDefault(); setSelectedApplicant(applicant); setShowHireModal(true); }}>Hire</a>
                      )}

                      {!['Hired', 'Rejected'].includes(applicant.status) && (
                        <a className="dropdown-item text-danger" href="#" onClick={(e) => { e.preventDefault(); setApplicantToReject(applicant); }}>Reject</a>
                      )}

                      <div className="dropdown-divider"></div>
                      <a className="dropdown-item text-danger" href="#" onClick={(e) => { e.preventDefault(); setApplicantToDelete(applicant); }}>Delete</a>
                    </ActionsDropdown>
                  </div>
                </div>
              ))}
          </div>

          {(statusFilter === 'all' ? filteredApplicants : groupedByStatus[statusFilter] || []).length === 0 && (
            <div className="empty-state-box">
              <i className="bi bi-inbox"></i>
              <p>No applicants found</p>
              <small>Try adjusting your filters or search terms</small>
            </div>
          )}
        </div>
      </div>
    );
  };



  const renderListView = () => (
    <div className="card data-table-card shadow-sm">
      <div className="table-responsive">
        <table className="table data-table mb-0">
          <thead>
            <tr>
              <th className="sortable" onClick={() => requestSort('name')}>Applicant {getSortIcon('name')}</th>
              <th>Gender</th><th>Age</th><th>Contact</th>
              <th className="sortable" onClick={() => requestSort('application_date')}>Applied On {getSortIcon('application_date')}</th>
              <th className="sortable" onClick={() => requestSort('updated_at')}>Last Updated {getSortIcon('updated_at')}</th>
              <th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredApplicants.map(applicant => (
              <tr key={applicant.id}>
                <td>
                  <div>{applicant.full_name || applicant.name}</div>
                  <small className="text-muted">{
                    jobOpeningsMap.get(applicant.jobOpeningId || applicant.job_opening_id) ||
                    positionsMap.get(applicant.jobOpeningId || applicant.job_opening_id) ||
                    'N/A'
                  }</small>
                </td>
                <td>{applicant.gender}</td><td>{calculateAge(applicant.birthday)}</td>
                <td>
                  <div>{applicant.phone}</div>
                </td>
                <td>{formatDate(applicant.application_date || applicant.applicationDate)}</td>
                <td>{formatDate(applicant.updated_at, true)}</td>
                <td>
                  {(() => {
                    const status = applicant.status || 'New Applicant';
                    const slug = status.replace(/\s+/g, '-').toLowerCase();
                    return <span className={`applicant-status-badge status-${slug}`}>{status}</span>;
                  })()}
                </td>
                <td>
                  {/* THE FIX: Replace the old dropdown with our new portal-based component */}
                  <ActionsDropdown>
                    <a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); handleAction('view', applicant); }}>View Details</a>
              {/* Schedule Interview - Show only if not already in Interview, Hired, or Rejected status */}
              {!['Interview', 'Hired', 'Rejected'].includes(applicant.status) && (
                <a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); handleAction('scheduleInterview', applicant); }}>Schedule Interview</a>
              )}
                    <div className="dropdown-divider"></div>
                    {/* Hire - Show only if not already Hired or Rejected */}
                    {!['Hired', 'Rejected'].includes(applicant.status) && (
                      <a className="dropdown-item text-success" href="#" onClick={(e) => { e.preventDefault(); handleAction('hire', applicant); }}>Hire</a>
                    )}
                    {/* Reject - Show only if not already Hired or Rejected */}
                    {!['Hired', 'Rejected'].includes(applicant.status) && (
                      <a className="dropdown-item text-danger" href="#" onClick={(e) => { e.preventDefault(); handleAction('reject', applicant); }}>Reject</a>
                    )}
                    <div className="dropdown-divider"></div>
                    <a className="dropdown-item text-danger" href="#" onClick={(e) => { e.preventDefault(); handleAction('delete', applicant); }}>Delete Applicant</a>
                  </ActionsDropdown>
                </td>
              </tr>
            ))}
            {filteredApplicants.length === 0 && (<tr><td colSpan="8" className="text-center p-5">No applicants match your criteria.</td></tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="container-fluid p-0 page-module-container">
      <header className="page-header d-flex justify-content-between align-items-center mb-4">
        <h1 className="page-main-title">Recruitment</h1>
        <div className="header-actions d-flex align-items-center gap-2">
            <button className="btn btn-outline-secondary" onClick={() => setShowReportConfigModal(true)}><i className="bi bi-file-earmark-pdf-fill me-2"></i>Generate Report</button>
            <button className="btn btn-success" onClick={() => setShowApplicantModal(true)}><i className="bi bi-person-plus-fill me-2"></i>New Applicant</button>
        </div>
      </header>

      {/* Loading State */}
      {loadingApplicants && (
        <div className="container-fluid p-0 page-module-container">
          <div className="w-100 text-center p-5 bg-light rounded">
            <div className="spinner-border text-success" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-3 mb-0">Loading recruitment data...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {errorApplicants && !loadingApplicants && (
        <div className="w-100 text-center p-5 bg-light rounded">
          <div className="alert alert-danger" role="alert">
            <i className="bi bi-exclamation-triangle-fill me-2"></i>
            {errorApplicants}
          </div>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>
            <i className="bi bi-arrow-clockwise me-2"></i>Try Again
          </button>
        </div>
      )}

      {/* Tab Navigation */}
      <ul className="nav nav-tabs recruitment-tabs mb-4">
        <li className="nav-item">
          <button className={`nav-link ${activeTab === 'recruitment' ? 'active' : ''}`} onClick={() => setActiveTab('recruitment')}>Recruitment</button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${activeTab === 'chatbot' ? 'active' : ''}`} onClick={() => setActiveTab('chatbot')}>Chatbot Management</button>
        </li>
      </ul>

      {/* Main Content */}
      {!loadingApplicants && !errorApplicants && (
        <>
          {activeTab === 'recruitment' && (
            <>
              <div className="recruitment-controls-bar">
                <div className="filters-group">
                  <div className="input-group"><span className="input-group-text"><i className="bi bi-search"></i></span><input type="text" className="form-control" placeholder="Search by name or email..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/></div>
                  <div className="input-group"><span className="input-group-text">From</span><input type="date" className="form-control" value={startDate} onChange={e => setStartDate(e.target.value)} /></div>
                  <div className="input-group"><span className="input-group-text">To</span><input type="date" className="form-control" value={endDate} onChange={e => setEndDate(e.target.value)} /></div>
                </div>
                <div className="actions-group">
                  <div className="view-toggle-container">
                    <button 
                      className={`view-toggle-btn ${viewMode === 'dashboard' ? 'active' : ''}`} 
                      onClick={() => setViewMode('dashboard')} 
                      title="Dashboard View"
                    >
                      <i className="bi bi-speedometer2"></i>
                    </button>
                    <button 
                      className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`} 
                      onClick={() => setViewMode('list')} 
                      title="List View"
                    >
                      <i className="bi bi-list-ul"></i>
                    </button>
                  </div>
                </div>
              </div>
              
              {viewMode === 'dashboard' ? renderDashboardView() : renderListView()}
            </>
          )}
          
          {activeTab === 'chatbot' && <ChatbotManagementTab />}
        </>
      )}
      
      <ReportConfigurationModal 
        show={showReportConfigModal}
        onClose={() => setShowReportConfigModal(false)}
        onRunReport={handleRunReport}
        reportConfig={recruitmentReportConfig}
      />
      
      {(isLoading || pdfDataUri) && (
        <ReportPreviewModal
            show={showReportPreview}
            onClose={handleClosePreview}
            pdfDataUri={pdfDataUri}
            reportTitle="Recruitment Activity Report"
        />
      )}
      
      <AddApplicantModal show={showApplicantModal} onClose={() => setShowApplicantModal(false)} onSave={handleSaveApplicant} positions={positions}/>
      {selectedApplicant && (
        <ViewApplicantDetailsModal 
          show={showViewModal} 
          onClose={() => setShowViewModal(false)} 
          applicant={selectedApplicant} 
          jobTitle={
            jobOpeningsMap.get(selectedApplicant?.jobOpeningId ?? selectedApplicant?.job_opening_id) ||
            positionsMap.get(selectedApplicant?.jobOpeningId ?? selectedApplicant?.job_opening_id) ||
            ''
          }
          onToast={setToast}
        />
      )}
      {selectedApplicant && <ScheduleInterviewModal show={showInterviewModal} onClose={() => setShowInterviewModal(false)} onSave={(data) => handleScheduleInterview(selectedApplicant.id, data)} applicant={selectedApplicant}/>}
      {selectedApplicant && <HireApplicantModal show={showHireModal} onClose={() => { setShowHireModal(false); setHireValidationErrors(null); }} onHire={handleHireApplicant} applicant={selectedApplicant} positions={positions} validationErrors={hireValidationErrors}/>}
      
      <AccountGeneratedModal 
        show={!!newlyGeneratedAccount}
        onClose={() => setNewlyGeneratedAccount(null)}
        accountDetails={newlyGeneratedAccount}
      />

      <ConfirmationModal
        show={!!applicantToDelete}
        onClose={() => setApplicantToDelete(null)}
        onConfirm={() => handleDeleteApplicant(applicantToDelete.id)}
        title="Delete Applicant"
        message={`Are you sure you want to delete ${applicantToDelete?.full_name || applicantToDelete?.name || 'this applicant'}? This action cannot be undone.`}
        confirmText="Delete"
        confirmVariant="danger"
      />

      <ConfirmationModal
        show={!!applicantToReject}
        onClose={() => setApplicantToReject(null)}
        onConfirm={handleConfirmReject}
        title="Reject Applicant"
        message={`Are you sure you want to reject ${applicantToReject?.full_name || applicantToReject?.name || 'this applicant'}? This will move them to the Rejected stage.`}
        confirmText="Reject"
        confirmVariant="danger"
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

export default RecruitmentPage;

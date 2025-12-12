import React, { useState, useEffect, useMemo } from 'react';
import LeaveRequestTable from './LeaveRequestTable';
import LeaveCreditsTab from './LeaveCreditsTab';
import LeaveReportModal from '../../modals/LeaveReportModal';
import ReportPreviewModal from '../../modals/ReportPreviewModal';
import useReportGenerator from '../../hooks/useReportGenerator';
import { leaveAPI, employeeAPI, leaveCashConversionAPI } from '../../services/api';
import './LeaveManagementPage.css';
import NotificationToast from '../../common/ToastNotification';
import ConfirmationModal from '../../modals/ConfirmationModal';

const LeaveManagementPage = () => {
  const [activeTab, setActiveTab] = useState('requests');
  const [showReportModal, setShowReportModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [noticePolicy, setNoticePolicy] = useState({
    'Vacation Leave': 0,
    'Sick Leave': 0,
    'Emergency Leave': 0,
    'Unpaid Leave': 0,
    'Maternity Leave': 0,
    'Paternity Leave': 0,
  });
  const [autoDeclineDays, setAutoDeclineDays] = useState(0);
  const [savingAutoDecline, setSavingAutoDecline] = useState(false);
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [cashYear, setCashYear] = useState(new Date().getFullYear());
  const [cashSummary, setCashSummary] = useState({ totalPayout: 0 });
  const [cashRecords, setCashRecords] = useState([]);
  const [cashSearchTerm, setCashSearchTerm] = useState('');
  const [cashStatusFilter, setCashStatusFilter] = useState('All');
  const [cashSortConfig, setCashSortConfig] = useState({ key: 'name', direction: 'ascending' });
  const [loadingCash, setLoadingCash] = useState(false);
  const [generatingCash, setGeneratingCash] = useState(false);
  const [markingCash, setMarkingCash] = useState(false);
  // Track IDs of records that have been interacted with to keep them visible even if status becomes Pending
  const [interactedIds, setInteractedIds] = useState(new Set());
  const [currentUser] = useState(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
  const hasModule = currentUser?.position?.allowed_modules?.includes('leave_management') || currentUser?.position?.allowed_modules?.includes('leave');
  
  const { generateReport, pdfDataUri, isLoading, setPdfDataUri } = useReportGenerator();
  const [showReportPreview, setShowReportPreview] = useState(false);

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState({
    show: false,
    title: '',
    message: '',
    action: null,
    variant: 'primary',
    confirmText: 'Confirm'
  });

  // Load leave requests from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch leave requests
        const leaveRes = await leaveAPI.getAll();
        const leaveData = Array.isArray(leaveRes.data) ? leaveRes.data : (leaveRes.data?.data || []);
        const normalizeMaternity = (md) => {
          if (!md) return undefined;
          return {
            type: md.type ?? md.maternity_type ?? md.application_type,
            isSoloParent: md.isSoloParent ?? md.is_solo_parent ?? false,
            deliveryDate: md.deliveryDate ?? md.expectedDeliveryDate ?? md.actualDeliveryDate ?? md.delivery_date ?? md.expected_delivery_date ?? md.actual_delivery_date ?? '',
            allocationDays: md.allocationDays ?? md.allocation_days ?? 0,
            medicalDocumentName: md.medicalDocumentName ?? md.medical_document_name ?? null,
            soloParentDocumentName: md.soloParentDocumentName ?? md.solo_parent_document_name ?? null,
          };
        };
        const normalizePaternity = (pd) => {
          if (!pd) return undefined;
          return {
            childsDob: pd.childsDob ?? pd.childs_dob ?? '',
            isEligiblePaternity: pd.isEligiblePaternity ?? pd.is_eligible_paternity ?? false,
            marriageCertName: pd.marriageCertName ?? pd.marriage_cert_name ?? null,
            birthCertName: pd.birthCertName ?? pd.birth_cert_name ?? pd.medical_cert_name ?? null,
          };
        };
        
        // Map API response to UI structure
        const mappedLeaves = leaveData.map(l => ({
          leaveId: l.id,
          empId: l.user?.id ?? l.user_id,
          name: l.user?.name ?? '',
          position: l.user?.position?.name ?? '',
          leaveType: l.type,
          dateFrom: l.date_from,
          dateTo: l.date_to,
          days: l.days,
          status: l.status,
          reason: l.reason,
          documentName: l.documentName ?? l.document_name ?? null,
          documentPath: l.documentPath ?? l.document_path ?? null,
          extensionStatus: l.extensionStatus ?? l.extension_status ?? undefined,
          maternityDetails: normalizeMaternity(l.maternityDetails ?? l.maternity_details),
          paternityDetails: normalizePaternity(l.paternityDetails ?? l.paternity_details),
          requestedAt: l.created_at,
        }));
        
        // Fetch employees
        const empRes = await employeeAPI.getAll();
        const empData = Array.isArray(empRes.data) ? empRes.data : (empRes.data?.data || []);
        
        setLeaveRequests(mappedLeaves);
        setEmployees(empData);
        setError(null);
        try {
          const noticeRes = await leaveAPI.getNoticeDays();
          const p = noticeRes.data?.policy || {};
          setNoticePolicy(prev => ({
            'Vacation Leave': Number.isFinite(Number(p['Vacation Leave'])) ? Number(p['Vacation Leave']) : 0,
            'Sick Leave': Number.isFinite(Number(p['Sick Leave'])) ? Number(p['Sick Leave']) : 0,
            'Emergency Leave': Number.isFinite(Number(p['Emergency Leave'])) ? Number(p['Emergency Leave']) : 0,
            'Unpaid Leave': Number.isFinite(Number(p['Unpaid Leave'])) ? Number(p['Unpaid Leave']) : 0,
            'Maternity Leave': Number.isFinite(Number(p['Maternity Leave'])) ? Number(p['Maternity Leave']) : 0,
            'Paternity Leave': Number.isFinite(Number(p['Paternity Leave'])) ? Number(p['Paternity Leave']) : 0,
          }));
          try {
            const autoRes = await leaveAPI.getAutoDeclineDays();
            const d = Number(autoRes.data?.days ?? 0);
            setAutoDeclineDays(Number.isFinite(d) ? Math.max(0, Math.min(365, d)) : 0);
          } catch (_) {}
        } catch (_) {}
      } catch (err) {
        setLeaveRequests([]);
        setEmployees([]);
        setError('Failed to load data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Handlers for leave request operations
  const handlers = {
    updateLeaveStatus: async (leaveId, newStatus) => {
      try {
        // Optimistic UI update
        setLeaveRequests(prev => prev.map(r => r.leaveId === leaveId ? { ...r, status: newStatus } : r));
        showToast({ message: `Leave ${newStatus.toLowerCase()} successfully.`, type: newStatus === 'Approved' ? 'success' : 'info' });

        await leaveAPI.update(leaveId, { status: newStatus });
        
        // Refresh the data
        const res = await leaveAPI.getAll();
        const data = Array.isArray(res.data) ? res.data : (res.data?.data || []);
        const mapped = data.map(l => ({
          leaveId: l.id,
          empId: l.user?.id ?? l.user_id,
          name: l.user?.name ?? '',
          position: l.user?.position?.name ?? '',
          leaveType: l.type,
          dateFrom: l.date_from,
          dateTo: l.date_to,
          days: l.days,
          status: l.status,
          reason: l.reason,
          documentName: l.documentName ?? l.document_name ?? null,
          documentPath: l.documentPath ?? l.document_path ?? null,
          extensionStatus: l.extensionStatus ?? l.extension_status ?? undefined,
          maternityDetails: (typeof l.maternityDetails !== 'undefined' || typeof l.maternity_details !== 'undefined') ? normalizeMaternity(l.maternityDetails ?? l.maternity_details) : undefined,
          paternityDetails: (typeof l.paternityDetails !== 'undefined' || typeof l.paternity_details !== 'undefined') ? normalizePaternity(l.paternityDetails ?? l.paternity_details) : undefined,
          requestedAt: l.created_at,
        }));
        setLeaveRequests(mapped);
      } catch (err) {
        throw new Error('Failed to update leave status. Please try again.');
      }
    },

    deleteLeaveRequest: async (leaveId) => {
      try {
        await leaveAPI.delete(leaveId);
        
        // Refresh the data
        const res = await leaveAPI.getAll();
        const data = Array.isArray(res.data) ? res.data : (res.data?.data || []);
        const mapped = data.map(l => ({
          leaveId: l.id,
          empId: l.user?.id ?? l.user_id,
          name: l.user?.name ?? '',
          position: l.user?.position?.name ?? '',
          leaveType: l.type,
          dateFrom: l.date_from,
          dateTo: l.date_to,
          days: l.days,
          status: l.status,
          reason: l.reason,
          documentName: l.documentName ?? l.document_name ?? null,
          documentPath: l.documentPath ?? l.document_path ?? null,
          extensionStatus: l.extensionStatus ?? l.extension_status ?? undefined,
          maternityDetails: (typeof l.maternityDetails !== 'undefined' || typeof l.maternity_details !== 'undefined') ? normalizeMaternity(l.maternityDetails ?? l.maternity_details) : undefined,
          paternityDetails: (typeof l.paternityDetails !== 'undefined' || typeof l.paternity_details !== 'undefined') ? normalizePaternity(l.paternityDetails ?? l.paternity_details) : undefined,
          requestedAt: l.created_at,
        }));
        setLeaveRequests(mapped);
      } catch (err) {
        throw new Error('Failed to delete leave request. Please try again.');
      }
    },

    updateLeaveCredits: async (employeeId, credits) => {
      // This would need to be implemented based on your backend structure
      // For now, just a placeholder
    }
  };

  const saveNoticePolicy = async () => {
    try {
      setSavingPolicy(true);
      const sanitized = Object.fromEntries(Object.entries(noticePolicy).map(([k,v]) => {
        const n = Math.max(0, Math.min(365, parseInt(v || 0, 10)));
        return [k, n];
      }));
      await leaveAPI.updateNoticeDays(sanitized);
      showToast({ message: 'Leave notice policy updated.', type: 'success' });
    } catch (e) {
      showToast({ message: 'Failed to update leave notice policy.', type: 'danger' });
    } finally {
      setSavingPolicy(false);
    }
  };

  const saveAutoDeclineDays = async () => {
    try {
      setSavingAutoDecline(true);
      const n = Math.max(0, Math.min(365, parseInt(autoDeclineDays || 0, 10)));
      await leaveAPI.updateAutoDeclineDays(n);
      setAutoDeclineDays(n);
      showToast({ message: 'Auto-decline policy updated.', type: 'success' });
    } catch (e) {
      showToast({ message: 'Failed to update auto-decline policy.', type: 'danger' });
    } finally {
      setSavingAutoDecline(false);
    }
  };

  const showToast = (toastData = {}) => {
    setToast({
      show: true,
      message: toastData.message || 'Action completed successfully.',
      type: toastData.type || 'success',
    });
  };

  const loadCashConversion = async (year) => {
    try {
      setLoadingCash(true);
      const res = await leaveCashConversionAPI.getSummary({ year });
      const data = res?.data || {};
      setCashSummary({
        totalPayout: Number(data.summary?.totalPayout || 0),
      });
      setCashRecords(Array.isArray(data.records) ? data.records : []);
    } catch (err) {
      showToast({ message: 'Failed to load leave cash conversions.', type: 'danger' });
      setCashSummary({ totalPayout: 0 });
      setCashRecords([]);
    } finally {
      setLoadingCash(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'cash-conversion') {
      loadCashConversion(cashYear);
    }
  }, [activeTab, cashYear]);

  const handleGenerateCash = async () => {
    try {
      setGeneratingCash(true);
      await leaveCashConversionAPI.generate({ year: cashYear });
      showToast({ message: `Leave cash conversion generated for ${cashYear}.`, type: 'success' });
      await loadCashConversion(cashYear);
    } catch (err) {
      const message = err?.response?.data?.message || 'Failed to generate leave cash conversion.';
      showToast({ message, type: 'danger' });
    } finally {
      setGeneratingCash(false);
    }
  };

  const handleMarkCashStatus = async (status, recordOrId = null) => {
    try {
      let id = null;
      let targetRecord = null;

      if (recordOrId && typeof recordOrId === 'object') {
        id = recordOrId.id;
        targetRecord = recordOrId;
      } else {
        id = recordOrId;
      }

      if (id || targetRecord) {
        // Single record update
        let finalId = id;

        // If no ID (preview record), generate it first
        if (!finalId && targetRecord) {
            setMarkingCash(true); // Ensure loading state
            try {
                // Generate record for specific user
                const genRes = await leaveCashConversionAPI.generate({ 
                    year: cashYear, 
                    user_id: targetRecord.userId 
                });
                
                const generatedRecords = genRes?.data?.records || [];
                // Find the record for this user
                const newRecord = generatedRecords.find(r => r.userId === targetRecord.userId);
                
                if (!newRecord) throw new Error('Failed to generate record.');
                
                finalId = newRecord.id;
                
                // Update local state with the new record immediately to prevent UI flicker
                 setCashRecords(prev => prev.map(r => {
                    if (r.userId === targetRecord.userId) {
                        return { ...r, ...newRecord };
                    }
                    return r;
                 }));

            } catch (err) {
                console.error("Auto-generation failed:", err);
                throw new Error("Failed to initialize record for this employee.");
            }
        }

        if (!finalId) throw new Error("Missing Record ID");

        const response = await leaveCashConversionAPI.updateStatus(finalId, status);
        const payload = response?.data || {};
        
        // Add to interacted IDs to keep visible
        setInteractedIds(prev => {
            const next = new Set(prev);
            next.add(finalId);
            return next;
        });

        setCashRecords(prev => prev.map(record => {
          if (record.id !== finalId) return record;
          return {
            ...record,
            status: payload.status || status,
            processedAt: payload.processedAt,
            paidAt: payload.paidAt,
          };
        }));
        showToast({ message: 'Status updated.', type: 'success' });
      } else {
        // Bulk update
        setMarkingCash(true);
        await leaveCashConversionAPI.markAll({ year: cashYear, status });

        // Add all current records to interacted IDs for bulk update
        setInteractedIds(prev => {
            const next = new Set(prev);
            cashRecords.forEach(r => {
                if (r.id) next.add(r.id);
            });
            return next;
        });

        setCashRecords(prev => prev.map(record => record.id ? { ...record, status } : record));
        const bulkMessage = status === 'Pending' ? 'Statuses reset to Pending.' : 
                           status === 'Submitted' ? 'All records submitted.' :
                           status === 'Approved' ? 'All records approved.' :
                           status === 'Paid' ? 'All records marked as Paid.' :
                           'Status updated.';
        showToast({ message: bulkMessage, type: 'success' });
      }
      await loadCashConversion(cashYear);
    } catch (err) {
      const message = err?.response?.data?.message || err.message || 'Failed to update status.';
      showToast({ message, type: 'danger' });
    } finally {
      if (!recordOrId || (typeof recordOrId === 'object' && !recordOrId.id)) {
        setMarkingCash(false);
      }
    }
  };

  const filteredCashRecords = useMemo(() => {
    const term = cashSearchTerm.toLowerCase();
    const filtered = cashRecords.filter(record => {
      // Status Filter
      if (cashStatusFilter !== 'All' && (record.status || 'Pending') !== cashStatusFilter) {
        return false;
      }

      // Show if:
      // 1. Not Super Admin
      // 2. OR Status is NOT Pending
      // 3. OR ID is in interactedIds (recently acted upon)
      // 4. OR Explicitly filtering for 'Pending'
      if (cashStatusFilter === 'All' && isSuperAdmin && (record.status || 'Pending') === 'Pending' && !interactedIds.has(record.id)) {
        return false;
      }
      return (
        (record.name || '').toLowerCase().includes(term) ||
        String(record.employeeId || '').toLowerCase().includes(term)
      );
    });

    return [...filtered].sort((a, b) => {
      const key = cashSortConfig.key;
      const direction = cashSortConfig.direction === 'ascending' ? 1 : -1;
      const valA = a[key];
      const valB = b[key];

      if (typeof valA === 'string') {
        return valA.localeCompare(valB) * direction;
      }
      return (Number(valA) - Number(valB)) * direction;
    });
  }, [cashRecords, cashSearchTerm, cashSortConfig, isSuperAdmin, interactedIds, cashStatusFilter]);

  const hasPersistedRecords = useMemo(() => cashRecords.some(record => record.id), [cashRecords]);

  const requestCashSort = (key) => {
    setCashSortConfig(prev => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'ascending' ? 'descending' : 'ascending' };
      }
      return { key, direction: 'ascending' };
    });
  };

  const cashSortIcon = (key) => {
    if (cashSortConfig.key !== key) return <i className="bi bi-arrow-down-up sort-icon ms-1"></i>;
    return cashSortConfig.direction === 'ascending' ? <i className="bi bi-sort-up sort-icon active ms-1"></i> : <i className="bi bi-sort-down sort-icon active ms-1"></i>;
  };

  const handleGenerateReport = async (params) => {
    setShowReportModal(false);

    if (params.reportType === 'leave_cash_conversion') {
      let reportData = [];
      
      // Use existing data if year matches
      if (params.year === cashYear && cashRecords.length > 0) {
        reportData = cashRecords;
      } else {
        try {
          const res = await leaveCashConversionAPI.getSummary({ year: params.year });
          const data = res.data || {};
          reportData = Array.isArray(data.records) ? data.records : [];
        } catch (error) {
          console.error('Failed to fetch cash conversion data for report:', error);
          showToast({ message: 'Failed to fetch data for the selected year.', type: 'danger' });
          return;
        }
      }

      generateReport(
        'leave_cash_conversion_report',
        { year: params.year },
        { cashRecords: reportData }
      );
    } else {
      generateReport(
        'leave_requests_report', 
        { startDate: params.startDate, endDate: params.endDate }, 
        { leaveRequests }
      );
    }
    
    setShowReportPreview(true);
  };

  const handleCloseReportPreview = () => {
    setShowReportPreview(false);
    if(pdfDataUri) URL.revokeObjectURL(pdfDataUri);
    setPdfDataUri('');
  };

  const initiateConfirmation = (action, title, message, variant = 'primary', confirmText = 'Confirm') => {
    setConfirmModal({
      show: true,
      title,
      message,
      action,
      variant,
      confirmText
    });
  };

  const handleConfirmAction = async () => {
    if (confirmModal.action) {
      setConfirmModal(prev => ({ ...prev, show: false }));
      await confirmModal.action();
    }
  };

  return (
    <>
      <div className="container-fluid p-0 page-module-container">
        <header className="page-header mb-4">
          <h1 className="page-main-title">Leave Management</h1>
        </header>

        {loading && (
          <div className="w-100 text-center p-5 bg-light rounded">
            <div className="spinner-border text-success" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-3 mb-0">Loading leave data...</p>
          </div>
        )}

        {error && (
          <div className="w-100 text-center p-5 bg-light rounded">
            <div className="alert alert-danger" role="alert">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              {error}
            </div>
            <button className="btn btn-primary" onClick={() => window.location.reload()}>
              <i className="bi bi-arrow-clockwise me-2"></i>Try Again
            </button>
          </div>
        )}

        {!loading && !error && (
          <>
            <div className="d-flex justify-content-between align-items-center border-bottom">
              <ul className="nav nav-tabs leave-management-tabs">
                <li className="nav-item">
                  <button 
                    className={`nav-link ${activeTab === 'requests' ? 'active' : ''}`}
                    onClick={() => setActiveTab('requests')}
                  >
                    <i className="bi bi-card-list me-2"></i>Leave Requests
                  </button>
                </li>
                <li className="nav-item">
                  <button 
                    className={`nav-link ${activeTab === 'credits' ? 'active' : ''}`}
                    onClick={() => setActiveTab('credits')}
                  >
                    <i className="bi bi-coin me-2"></i>Leave Credits
                  </button>
                </li>
                <li className="nav-item">
                  <button 
                    className={`nav-link ${activeTab === 'cash-conversion' ? 'active' : ''}`}
                    onClick={() => setActiveTab('cash-conversion')}
                  >
                    <i className="bi bi-cash-coin me-2"></i>Leave Cash Conversion
                  </button>
                </li>
                <li className="nav-item">
                  <button 
                    className={`nav-link ${activeTab === 'settings' ? 'active' : ''}`}
                    onClick={() => setActiveTab('settings')}
                  >
                    <i className="bi bi-gear me-2"></i>Settings
                  </button>
                </li>
              </ul>
              <button className="btn btn-outline-secondary me-2" onClick={() => setShowReportModal(true)}>
                <i className="bi bi-file-earmark-pdf-fill me-2"></i>Generate Report
              </button>
            </div>

            <div className="leave-tab-content">
              {activeTab === 'requests' && (
                <LeaveRequestTable 
                  leaveRequests={leaveRequests} 
                  handlers={handlers}
                />
              )}
              {activeTab === 'credits' && (
                <LeaveCreditsTab 
                  employees={employees}
                  leaveRequests={leaveRequests}
                  handlers={handlers}
                  onShowToast={showToast}
                />
              )}
              {activeTab === 'cash-conversion' && (
                <div className="cash-conversion-container">
                  <div className="cash-summary-grid">
                    <div className="summary-card-cash">
                      <div className="summary-label"><i className="bi bi-cash-stack me-2"></i>Total Cash Out</div>
                      <div className="summary-value text-success">₱{cashSummary.totalPayout.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    </div>
                  </div>

                  <div className="card data-table-card shadow-sm">
                    <div className="card-header cash-controls">
                      <div className="controls-left">
                        <div className="input-group">
                          <span className="input-group-text"><i className="bi bi-search"></i></span>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Search employees..."
                            value={cashSearchTerm}
                            onChange={(e) => setCashSearchTerm(e.target.value)}
                            disabled={loadingCash || generatingCash || markingCash}
                          />
                        </div>
                        <div className="status-filter-group ms-2">
                          <select
                            className="form-select"
                            value={cashStatusFilter}
                            onChange={(e) => setCashStatusFilter(e.target.value)}
                            disabled={loadingCash || generatingCash || markingCash}
                            style={{ width: '150px' }}
                          >
                            <option value="All">All Status</option>
                            <option value="Pending">Pending</option>
                            <option value="Submitted">Submitted</option>
                            <option value="Approved">Approved</option>
                            <option value="Paid">Paid</option>
                            <option value="Declined">Declined</option>
                          </select>
                        </div>
                        <div className="year-selector-group">
                          <label htmlFor="cash-year-select" className="form-label">Year:</label>
                          <select
                            id="cash-year-select"
                            className="form-select form-select-sm"
                            value={cashYear}
                            onChange={(e) => setCashYear(Number(e.target.value))}
                            disabled={loadingCash || generatingCash || markingCash}
                          >
                            {[0,1,2,3,4].map(offset => {
                              const yearOption = new Date().getFullYear() - offset;
                              return <option key={yearOption} value={yearOption}>{yearOption}</option>;
                            })}
                          </select>
                        </div>
                      </div>
                      <div className="controls-right d-flex gap-2">
                        <button className="btn btn-sm btn-outline-secondary" onClick={() => initiateConfirmation(() => handleMarkCashStatus('Pending'), 'Reset Status', 'Are you sure you want to reset all statuses to Pending?', 'warning', 'Reset')} disabled={loadingCash || markingCash || generatingCash || filteredCashRecords.length === 0}>
                          <i className="bi bi-arrow-counterclockwise me-2"></i>Reset Status
                        </button>
                        {!isSuperAdmin ? (
                          <>
                            <button className="btn btn-sm btn-primary" onClick={() => initiateConfirmation(() => handleMarkCashStatus('Submitted'), 'Submit All Requests', 'Are you sure you want to submit all pending requests?', 'primary', 'Submit All')} disabled={loadingCash || markingCash || generatingCash || filteredCashRecords.length === 0}>
                              <i className="bi bi-send me-2"></i>Submit All
                            </button>
                            <button className="btn btn-sm btn-success" onClick={() => initiateConfirmation(() => handleMarkCashStatus('Paid'), 'Mark All as Paid', 'Are you sure you want to mark all APPROVED requests as Paid?', 'success', 'Mark All Paid')} disabled={loadingCash || markingCash || generatingCash || filteredCashRecords.length === 0}>
                              <i className="bi bi-check-all me-2"></i>Mark All Paid
                            </button>
                          </>
                        ) : (
                          <>
                            <button className="btn btn-sm btn-primary" onClick={() => initiateConfirmation(() => handleMarkCashStatus('Approved'), 'Approve All Requests', 'Are you sure you want to approve all submitted requests?', 'success', 'Approve All')} disabled={loadingCash || markingCash || generatingCash || filteredCashRecords.length === 0}>
                              <i className="bi bi-check-circle me-2"></i>Approve All
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="table-responsive position-relative" style={{ minHeight: '220px' }}>
                      {(loadingCash || markingCash) && (
                        <div className="d-flex flex-column align-items-center justify-content-center position-absolute top-0 start-0 w-100 h-100" style={{ background: 'rgba(0,0,0,0.03)' }}>
                          <div className="spinner-border text-success" role="status"></div>
                          <div className="mt-3 text-muted fw-medium">{markingCash ? 'Updating statuses...' : 'Loading leave cash conversion'}</div>
                        </div>
                      )}
                      <table className="table data-table mb-0 align-middle">
                        <thead>
                          <tr>
                            <th className="sortable" style={{ width: '12%' }} onClick={() => requestCashSort('employeeId')}>Employee ID {cashSortIcon('employeeId')}</th>
                            <th className="sortable" style={{ width: '20%' }} onClick={() => requestCashSort('name')}>Employee Name {cashSortIcon('name')}</th>
                            <th className="text-center sortable" style={{ width: '10%' }} onClick={() => requestCashSort('vacationDays')}>Vacation Days {cashSortIcon('vacationDays')}</th>
                            <th className="text-center sortable" style={{ width: '10%' }} onClick={() => requestCashSort('sickDays')}>Sick Days {cashSortIcon('sickDays')}</th>
                            <th className="text-end sortable" style={{ width: '12%' }} onClick={() => requestCashSort('conversionRate')}>Daily Rate {cashSortIcon('conversionRate')}</th>
                            <th className="text-end sortable" style={{ width: '12%' }} onClick={() => requestCashSort('totalAmount')}>Total Amount {cashSortIcon('totalAmount')}</th>
                            <th className="text-center" style={{ width: '10%' }}>Status</th>
                            <th className="text-center" style={{ width: '10%' }}>Payment Status</th>
                            <th className="text-center" style={{ width: '15%' }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredCashRecords.length > 0 ? filteredCashRecords.map(record => (
                            <tr key={`${record.userId}-${record.year || cashYear}`}>
                              <td>{record.employeeId}</td>
                              <td>
                                <div className="fw-bold">{record.name}</div>
                                <div className="text-muted" style={{ fontSize: '0.8rem' }}>{record.position || '–'}</div>
                              </td>
                              <td className="text-center fw-semibold">{record.vacationDays}</td>
                              <td className="text-center fw-semibold">{record.sickDays}</td>
                              <td className="text-end">₱{Number(record.conversionRate || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                              <td className="text-end text-success fw-bold">₱{Number(record.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                              <td className="text-center">
                                <span className={`badge bg-${
                                  record.status === 'Approved' ? 'success' :
                                  record.status === 'Paid' ? 'success' :
                                  record.status === 'Declined' ? 'danger' :
                                  record.status === 'Submitted' ? (isSuperAdmin ? 'warning text-dark' : 'primary') :
                                  'secondary'
                                }`}>
                                  {record.status === 'Paid' ? 'Approved' : 
                                   (isSuperAdmin && record.status === 'Submitted') ? 'Pending' :
                                   record.status || 'Pending'}
                                </span>
                              </td>
                              <td className="text-center">
                                  {record.status === 'Paid' ? (
                                      <span className="badge bg-success">Paid</span>
                                  ) : record.status === 'Approved' ? (
                                      <span className="badge bg-warning text-dark">Pending</span>
                                  ) : (
                                      <span className="text-muted">–</span>
                                  )}
                              </td>
                              <td className="text-center">
                                <div className="d-flex justify-content-center gap-1">
                                  {isSuperAdmin ? (
                                    <>
                                      {(record.status === 'Submitted' || record.status === 'Pending') && (
                                        <>
                                          <button 
                                            className="btn btn-sm btn-outline-success" 
                                            title="Approve"
                                            onClick={() => initiateConfirmation(() => handleMarkCashStatus('Approved', record), 'Approve Request', `Approve cash conversion for ${record.name}?`, 'success', 'Approve')}
                                            disabled={loadingCash || markingCash}
                                          >
                                            <i className="bi bi-check-lg"></i>
                                          </button>
                                          <button 
                                            className="btn btn-sm btn-outline-danger" 
                                            title="Decline"
                                            onClick={() => initiateConfirmation(() => handleMarkCashStatus('Declined', record), 'Decline Request', `Decline cash conversion for ${record.name}?`, 'danger', 'Decline')}
                                            disabled={loadingCash || markingCash}
                                          >
                                            <i className="bi bi-x-lg"></i>
                                          </button>
                                        </>
                                      )}
                                      {(record.status === 'Approved' || record.status === 'Declined') && record.status !== 'Paid' && (
                                         <button 
                                            className="btn btn-sm btn-outline-secondary ms-1" 
                                            title="Reset to Pending"
                                            onClick={() => initiateConfirmation(() => handleMarkCashStatus('Pending', record), 'Reset Status', `Reset status for ${record.name} to Pending?`, 'warning', 'Reset')}
                                            disabled={loadingCash || markingCash}
                                          >
                                            <i className="bi bi-arrow-counterclockwise"></i>
                                          </button>
                                      )}
                                      {record.status === 'Paid' && (
                                         <button 
                                            className="btn btn-sm btn-outline-secondary" 
                                            title="Revert Payment Status"
                                            onClick={() => initiateConfirmation(() => handleMarkCashStatus('Approved', record), 'Revert Payment', 'Revert status to Approved? This will clear the payment date.', 'warning', 'Revert')}
                                            disabled={loadingCash || markingCash}
                                          >
                                            <i className="bi bi-arrow-counterclockwise me-1"></i>
                                          </button>
                                      )}
                                    </>
                                  ) : (
                                    <>
                                      {/* Assigned Employees Logic */}
                                      {(record.status === 'Pending') && (
                                        <button 
                                          className="btn btn-sm btn-primary"
                                          onClick={() => initiateConfirmation(() => handleMarkCashStatus('Submitted', record), 'Submit Request', 'Submit leave cash conversion request?', 'primary', 'Submit')}
                                          disabled={loadingCash || markingCash}
                                        >
                                          Submit
                                        </button>
                                      )}
                                      {record.status === 'Submitted' && (
                                        <button 
                                          className="btn btn-sm btn-outline-secondary"
                                          onClick={() => initiateConfirmation(() => handleMarkCashStatus('Pending', record), 'Revert Submission', 'Revert submission to Pending?', 'warning', 'Revert')}
                                          disabled={loadingCash || markingCash}
                                        >
                                          Revert
                                        </button>
                                      )}
                                      {record.status === 'Approved' && (
                                        <button 
                                          className="btn btn-sm btn-success"
                                          title="Mark Paid"
                                          onClick={() => initiateConfirmation(() => handleMarkCashStatus('Paid', record), 'Mark as Paid', 'Mark this request as Paid? This action will record the payment date.', 'success', 'Mark Paid')}
                                          disabled={loadingCash || markingCash}
                                        >
                                          <i className="bi bi-check-lg"></i>
                                        </button>
                                      )}
                                      {record.status === 'Paid' && (
                                        <button 
                                          className="btn btn-sm btn-outline-secondary"
                                          title="Revert Payment Status"
                                          onClick={() => initiateConfirmation(() => handleMarkCashStatus('Approved', record), 'Revert Payment', 'Revert status to Approved? This will clear the payment date.', 'warning', 'Revert')}
                                          disabled={loadingCash || markingCash}
                                        >
                                          <i className="bi bi-arrow-counterclockwise me-1"></i>
                                        </button>
                                      )}
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )) : (
                            <tr>
                              <td colSpan={9}>
                                <div className="text-center p-5">
                                  <i className="bi bi-info-circle fs-1 text-muted mb-3 d-block"></i>
                                  <h5 className="text-muted">{loadingCash ? 'Preparing leave cash conversion data...' : `No conversion records found for ${cashYear}.`}</h5>
                                </div>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
              {activeTab === 'settings' && (
                <div className="p-3">
                  <div className="card">
                    <div className="card-header"><i className="bi bi-gear me-2"></i>Leave Notice Policy</div>
                    <div className="card-body">
                      <p className="text-muted">Set minimum notice (days) per leave type. Requests must be submitted at least N days before the start date.</p>
                      <div className="row g-3">
                        {Object.keys(noticePolicy).map((type) => (
                          <div className="col-md-4" key={type}>
                            <label className="form-label">{type}</label>
                            <input type="number" className="form-control" min="0" max="365" value={noticePolicy[type]} onChange={(e) => setNoticePolicy(prev => ({ ...prev, [type]: e.target.value === '' ? '' : Math.max(0, Math.min(365, parseInt(e.target.value, 10) || 0)) }))} />
                          </div>
                        ))}
                      </div>
                      <div className="mt-3">
                        <button className="btn btn-primary" onClick={saveNoticePolicy} disabled={savingPolicy}>
                          {savingPolicy ? (<><span className="spinner-border spinner-border-sm me-2"></span>Saving...</>) : (<>Save</>)}
                        </button>
                      </div>
                      <div className="form-text mt-2">Example: If vacation is 5 days and the leave starts on the 16th, submit on or before the 11th.</div>
                    </div>
                  </div>
                  <div className="card mt-3">
                    <div className="card-header"><i className="bi bi-hourglass-split me-2"></i>Auto-Decline Pending Requests</div>
                    <div className="card-body">
                      <p className="text-muted">Automatically decline pending leave requests after N days with no response.</p>
                      <div className="row g-3">
                        <div className="col-md-4">
                          <label className="form-label">Days before auto-decline</label>
                          <input type="number" className="form-control" min="0" max="365" value={autoDeclineDays} onChange={(e) => setAutoDeclineDays(e.target.value === '' ? '' : Math.max(0, Math.min(365, parseInt(e.target.value, 10) || 0)))} />
                        </div>
                      </div>
                      <div className="mt-3">
                        <button className="btn btn-primary" onClick={saveAutoDeclineDays} disabled={savingAutoDecline}>
                          {savingAutoDecline ? (<><span className="spinner-border spinner-border-sm me-2"></span>Saving...</>) : (<>Save</>)}
                        </button>
                      </div>
                      <div className="form-text mt-2">Set to 0 to disable auto-decline.</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <LeaveReportModal 
        show={showReportModal}
        onClose={() => setShowReportModal(false)}
        onGenerate={handleGenerateReport}
      />

      {(isLoading || pdfDataUri) && (
        <ReportPreviewModal 
          show={showReportPreview}
          onClose={handleCloseReportPreview}
          pdfDataUri={pdfDataUri}
          reportTitle="Leave Requests Report"
        />
      )}

      <ConfirmationModal
        show={confirmModal.show}
        onClose={() => setConfirmModal(prev => ({ ...prev, show: false }))}
        onConfirm={handleConfirmAction}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmVariant={confirmModal.variant}
        confirmText={confirmModal.confirmText}
        confirmLoading={loadingCash || markingCash || generatingCash}
      />

      {toast.show && (
        <NotificationToast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(prev => ({ ...prev, show: false }))}
        />
      )}
    </>
  );
};

export default LeaveManagementPage;
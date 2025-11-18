import React, { useState, useEffect, useMemo } from 'react';
import LeaveRequestTable from './LeaveRequestTable';
import LeaveCreditsTab from './LeaveCreditsTab';
import LeaveReportModal from '../../modals/LeaveReportModal';
import ReportPreviewModal from '../../modals/ReportPreviewModal';
import useReportGenerator from '../../hooks/useReportGenerator';
import { leaveAPI, employeeAPI } from '../../services/api';
import './LeaveManagementPage.css';
import NotificationToast from '../../common/ToastNotification';

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
  const [savingPolicy, setSavingPolicy] = useState(false);
  
  const { generateReport, pdfDataUri, isLoading, setPdfDataUri } = useReportGenerator();
  const [showReportPreview, setShowReportPreview] = useState(false);

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

  const showToast = (toastData = {}) => {
    setToast({
      show: true,
      message: toastData.message || 'Action completed successfully.',
      type: toastData.type || 'success',
    });
  };

  const handleGenerateReport = (params) => {
    setShowReportModal(false);
    generateReport(
        'leave_requests_report', 
        { startDate: params.startDate, endDate: params.endDate }, 
        { leaveRequests }
    );
    setShowReportPreview(true);
  };

  const handleCloseReportPreview = () => {
    setShowReportPreview(false);
    if(pdfDataUri) URL.revokeObjectURL(pdfDataUri);
    setPdfDataUri('');
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

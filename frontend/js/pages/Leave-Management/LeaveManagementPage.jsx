import React, { useState, useEffect, useMemo } from 'react';
import LeaveRequestTable from './LeaveRequestTable';
import LeaveCreditsTab from './LeaveCreditsTab';
import LeaveReportModal from '../../modals/LeaveReportModal';
import ReportPreviewModal from '../../modals/ReportPreviewModal';
import useReportGenerator from '../../hooks/useReportGenerator';
import { leaveAPI } from '../../services/api';
import './LeaveManagementPage.css';

const LeaveManagementPage = () => {
  const [activeTab, setActiveTab] = useState('requests');
  const [showReportModal, setShowReportModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [error, setError] = useState(null);
  
  const { generateReport, pdfDataUri, isLoading, setPdfDataUri } = useReportGenerator();
  const [showReportPreview, setShowReportPreview] = useState(false);

  // Load leave requests from API
  useEffect(() => {
    const fetchLeaveRequests = async () => {
      try {
        setLoading(true);
        const res = await leaveAPI.getAll();
        const data = Array.isArray(res.data) ? res.data : (res.data?.data || []);
        
        // Map API response to UI structure
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
        }));
        
        setLeaveRequests(mapped);
        setError(null);
      } catch (err) {
        setLeaveRequests([]);
        setError('Failed to load leave requests. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchLeaveRequests();
  }, []);

  // Handlers for leave request operations
  const handlers = {
    updateLeaveStatus: async (leaveId, newStatus) => {
      try {
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
              onSaveCredits={handlers.updateLeaveCredits}
            />
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
    </>
  );
};

export default LeaveManagementPage;
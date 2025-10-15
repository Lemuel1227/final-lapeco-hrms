import React, { useState, useMemo, useEffect } from 'react';
import { leaveAPI } from '../../services/api';
import { getUserProfile } from '../../services/accountService';
import RequestLeaveModal from '../../modals/RequestLeaveModal';
import LeaveHistoryModal from '../../modals/LeaveHistoryModal';
import LeaveRequestCard from './LeaveRequestCard';
import ToastNotification from '../../common/ToastNotification';
import { formatDateRange } from '../../utils/dateUtils';
import './MyLeavePage.css'; 

const MyLeavePage = () => {
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('All');
  const [currentUser, setCurrentUser] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [leaveBalances, setLeaveBalances] = useState({ vacation: 0, sick: 0, emergency: 0 });

  // Load user's leave requests and user profile from API
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        
        // Fetch leave requests and user profile first
        const [leaveRes, userRes] = await Promise.all([
          leaveAPI.getAll(),
          getUserProfile()
        ]);
        
        console.log('Leave requests loaded:', leaveRes.data);
        console.log('User profile loaded:', userRes);
        
        // Try to fetch leave credits (make it optional to not break the whole page)
        let creditsRes = null;
        // getUserProfile returns direct JSON, leaveAPI returns { data: ... }
        const userId = userRes.id || userRes.data?.id;
        console.log('User ID for credits:', userId);
        
        if (userId) {
          try {
            creditsRes = await leaveAPI.getLeaveCredits(userId);
            console.log('Leave credits loaded:', creditsRes.data);
          } catch (creditsError) {
            console.warn('Failed to load leave credits:', creditsError);
            // Continue without credits - will show 0 balances
          }
        } else {
          console.warn('No user ID found, skipping leave credits');
        }
        
        const data = Array.isArray(leaveRes.data) ? leaveRes.data : (leaveRes.data?.data || []);
        // Map API to UI structure
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
        
        // Backend already filters leaves based on user role and authentication
        // Regular employees only see their own leaves
        // Team leaders see their team's leaves
        // HR personnel see all leaves
        setLeaveRequests(mapped);
        // getUserProfile returns direct JSON, not wrapped in data
        setCurrentUser(userRes);
        console.log('Current user set:', userRes);
        
        // Calculate leave balances from credits (if available)
        if (creditsRes && creditsRes.data) {
          const credits = creditsRes.data;
          const balances = {
            vacation: (credits['Vacation Leave']?.total_credits || 0) - (credits['Vacation Leave']?.used_credits || 0),
            sick: (credits['Sick Leave']?.total_credits || 0) - (credits['Sick Leave']?.used_credits || 0),
            emergency: (credits['Emergency Leave']?.total_credits || 0) - (credits['Emergency Leave']?.used_credits || 0)
          };
          setLeaveBalances(balances);
        } else {
          // Set default balances if credits couldn't be loaded
          setLeaveBalances({ vacation: 0, sick: 0, emergency: 0 });
        }
        
        setError(null);
      } catch (err) {
        console.error('Error loading leave requests:', err);
        setLeaveRequests([]);
        setLeaveBalances({ vacation: 0, sick: 0, emergency: 0 });
        setError('Failed to load leave requests. Please try again.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const createLeaveRequest = async (formData) => {
    try {
      const payload = {
        type: formData.leaveType,
        date_from: formData.dateFrom,
        date_to: formData.dateTo,
        days: formData.days,
        reason: formData.reason,
      };
      
      const response = await leaveAPI.create(payload);
      
      // Check if the response indicates success
      if (response.data?.success) {
        // Show success toast with backend message
        setToast({
          show: true,
          message: response.data.message || 'Leave request submitted successfully!',
          type: 'success'
        });
      } else {
        // Handle unexpected response format
        setToast({
          show: true,
          message: 'Leave request submitted, but response format was unexpected.',
          type: 'warning'
        });
      }
      
      // Refresh the data and leave balances
      const res = await leaveAPI.getAll();
      let creditsRes = null;
      
      if (currentUser && currentUser.id) {
        try {
          creditsRes = await leaveAPI.getLeaveCredits(currentUser.id);
        } catch (creditsError) {
          console.warn('Failed to refresh leave credits:', creditsError);
        }
      }
      
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
      
      // Update leave balances (if credits were loaded)
      if (creditsRes && creditsRes.data) {
        const credits = creditsRes.data;
        const balances = {
          vacation: (credits['Vacation Leave']?.total_credits || 0) - (credits['Vacation Leave']?.used_credits || 0),
          sick: (credits['Sick Leave']?.total_credits || 0) - (credits['Sick Leave']?.used_credits || 0),
          emergency: (credits['Emergency Leave']?.total_credits || 0) - (credits['Emergency Leave']?.used_credits || 0)
        };
        setLeaveBalances(balances);
      }
      
      // Backend handles filtering based on user authentication
      setLeaveRequests(mapped);
      setShowRequestModal(false);
      
    } catch (err) {
      console.error('Leave request error:', err);
      
      // Handle different types of errors
      let errorMessage = 'Something went wrong while submitting your leave request. Please try again.';
      
      if (err.response?.data) {
        const errorData = err.response.data;
        
        if (errorData.message) {
          // Use backend error message
          errorMessage = errorData.message;
        } else if (errorData.errors) {
          // Handle validation errors
          const validationErrors = Object.values(errorData.errors).flat();
          errorMessage = validationErrors.length > 0 
            ? validationErrors.join('\n') 
            : 'Please check your input and try again.';
        }
      } else if (err.message) {
        // Network or other errors
        errorMessage = 'Network error. Please check your connection and try again.';
      }
      
      setToast({
        show: true,
        message: errorMessage,
        type: 'error'
      });
    }
  };

  const upcomingLeave = useMemo(() => {
    const today = new Date();
    return leaveRequests
      .filter(req => req.status === 'Approved' && new Date(req.dateFrom) >= today)
      .sort((a, b) => new Date(a.dateFrom) - new Date(b.dateFrom))[0];
  }, [leaveRequests]);

  const filteredRequests = useMemo(() => {
    const sortedRequests = [...leaveRequests].sort((a, b) => new Date(b.dateFrom) - new Date(a.dateFrom));
    if (statusFilter === 'All') {
      return sortedRequests;
    }
    return sortedRequests.filter(req => req.status === statusFilter);
  }, [leaveRequests, statusFilter]);
  
  return (
    <div className="container-fluid p-0 page-module-container">
      {toast.show && (
        <ToastNotification
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ show: false, message: '', type: 'success' })}
        />
      )}
      <header className="page-header d-flex justify-content-between align-items-center mb-4">
        <h1 className="page-main-title">My Leave</h1>
        <div className="d-flex gap-2">
            <button className="btn btn-outline-secondary" onClick={() => setShowHistoryModal(true)}>
                <i className="bi bi-clock-history me-2"></i>View History
            </button>
            <button className="btn btn-success" onClick={() => setShowRequestModal(true)}>
                <i className="bi bi-plus-circle-fill me-2"></i>New Leave Request
            </button>
        </div>
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

      <div className="my-leave-dashboard">
        <div className="leave-balances">
            <div className="balance-card">
                <div className="balance-icon icon-vacation"><i className="bi bi-sun-fill"></i></div>
                <div className="balance-info"><span className="balance-value">{leaveBalances.vacation}</span><span className="balance-label"> Vacation Days Left</span></div>
            </div>
            <div className="balance-card">
                <div className="balance-icon icon-sick"><i className="bi bi-heart-pulse-fill"></i></div>
                <div className="balance-info"><span className="balance-value">{leaveBalances.sick}</span><span className="balance-label"> Sick Days Left</span></div>
            </div>
            <div className="balance-card">
              <div className="balance-icon icon-emergency"><i className="bi bi-exclamation-triangle-fill"></i></div>
              <div className="balance-info"><span className="balance-value">{leaveBalances.emergency}</span><span className="balance-label"> Emergency Days Left</span></div>
            </div>
        </div>
        <div className="upcoming-leave-card">
            <h6><i className="bi bi-calendar-check-fill text-success me-2"></i>Upcoming Leave</h6>
            {upcomingLeave ? (
                <div>
                    <p className="upcoming-type">{upcomingLeave.leaveType}</p>
                    <p className="upcoming-dates">{formatDateRange(upcomingLeave.dateFrom, upcomingLeave.dateTo)}</p>
                </div>
            ) : (
                <p className="text-muted no-upcoming">No upcoming approved leave.</p>
            )}
        </div>
      </div>
      
      <div className="card shadow-sm">
        <div className="card-header">
            <h5 className="mb-0">My Requests</h5>
        </div>
        <div className="card-body">
            <div className="leave-filters btn-group w-100" role="group">
                <button type="button" className={`btn ${statusFilter === 'All' ? 'btn-dark' : 'btn-outline-dark'}`} onClick={() => setStatusFilter('All')}>All</button>
                <button type="button" className={`btn ${statusFilter === 'Pending' ? 'btn-dark' : 'btn-outline-dark'}`} onClick={() => setStatusFilter('Pending')}>Pending</button>
                <button type="button" className={`btn ${statusFilter === 'Approved' ? 'btn-dark' : 'btn-outline-dark'}`} onClick={() => setStatusFilter('Approved')}>Approved</button>
                <button type="button" className={`btn ${statusFilter === 'Declined' ? 'btn-dark' : 'btn-outline-dark'}`} onClick={() => setStatusFilter('Declined')}>Declined</button>
                <button type="button" className={`btn ${statusFilter === 'Canceled' ? 'btn-dark' : 'btn-outline-dark'}`} onClick={() => setStatusFilter('Canceled')}>Canceled</button>
            </div>

            <div className="leave-requests-list mt-4">
                {filteredRequests.length > 0 ? (
                    filteredRequests.map(req => <LeaveRequestCard key={req.leaveId} request={req} />)
                ) : (
                    <div className="text-center p-5 bg-light rounded">
                        <i className="bi bi-inbox fs-1 text-muted mb-3 d-block"></i>
                        <h5 className="text-muted">No Requests Found</h5>
                        <p className="text-muted">You have no {statusFilter.toLowerCase()} leave requests.</p>
                    </div>
                )}
            </div>
        </div>
      </div>

      {showRequestModal && (
        <RequestLeaveModal
          show={showRequestModal}
          onClose={() => setShowRequestModal(false)}
          onSave={createLeaveRequest}
          currentUser={currentUser}
        />
      )}
        </>
      )}

      <LeaveHistoryModal
        show={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        leaveHistory={leaveRequests} 
      />
    </div>
  );
};

export default MyLeavePage;
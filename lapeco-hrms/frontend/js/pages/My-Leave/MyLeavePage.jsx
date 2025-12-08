import React, { useState, useMemo, useEffect } from 'react';
import { leaveAPI, leaveCashConversionAPI } from '../../services/api';
import { getUserProfile } from '../../services/accountService';
import RequestLeaveModal from '../../modals/RequestLeaveModal';
import LeaveHistoryModal from '../../modals/LeaveHistoryModal';
import LeaveRequestCard from './LeaveRequestCard';
import ToastNotification from '../../common/ToastNotification';
import ConfirmationModal from '../../modals/ConfirmationModal';
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
  const [leaveBalances, setLeaveBalances] = useState({ vacation: 0, sick: 0 });
  const [requestToCancel, setRequestToCancel] = useState(null);

  // Cash Conversion State
  const [activeTab, setActiveTab] = useState('requests');
  const [cashYear, setCashYear] = useState(new Date().getFullYear());
  const [cashRecord, setCashRecord] = useState(null);
  const [loadingCash, setLoadingCash] = useState(false);
  const [generatingCash, setGeneratingCash] = useState(false);
  const [markingCash, setMarkingCash] = useState(false);

  const loadCashConversion = async (year) => {
    try {
      setLoadingCash(true);
      const res = await leaveCashConversionAPI.getSummary({ year, scope: 'self' });
      const data = res?.data || {};
      const records = Array.isArray(data.records) ? data.records : [];
      setCashRecord(records.length > 0 ? records[0] : null);
    } catch (err) {
      console.error('Failed to load leave cash conversions:', err);
      setToast({ show: true, message: 'Failed to load leave cash conversions.', type: 'error' });
      setCashRecord(null);
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
      const res = await leaveCashConversionAPI.generate({ year: cashYear, scope: 'self' });
      if (res?.data?.records) {
         const records = res.data.records;
         setCashRecord(records.length > 0 ? records[0] : null);
         setToast({ show: true, message: 'Cash conversion request generated successfully.', type: 'success' });
      } else {
         setToast({ show: true, message: 'No eligible credits for cash conversion.', type: 'warning' });
         setCashRecord(null);
      }
    } catch (err) {
      console.error('Failed to generate cash conversion:', err);
      setToast({ show: true, message: 'Failed to generate cash conversion request.', type: 'error' });
    } finally {
      setGeneratingCash(false);
    }
  };

  const handleCashStatusUpdate = async (newStatus) => {
    if (!cashRecord) return;
    try {
      setMarkingCash(true);
      const res = await leaveCashConversionAPI.updateStatus(cashRecord.id, newStatus);
      if (res?.data) {
        setCashRecord(prev => ({ ...prev, status: res.data.status }));
        setToast({ show: true, message: `Request ${newStatus === 'Submitted' ? 'submitted' : 'reverted'} successfully.`, type: 'success' });
      }
    } catch (err) {
      console.error('Failed to update status:', err);
      setToast({ show: true, message: 'Failed to update request status.', type: 'error' });
    } finally {
      setMarkingCash(false);
    }
  };

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
        
        
        // Try to fetch leave credits (make it optional to not break the whole page)
        let creditsRes = null;
        // getUserProfile returns direct JSON, leaveAPI returns { data: ... }
        const userId = userRes.id || userRes.data?.id;
        const currentYear = new Date().getFullYear();
        
        if (userId) {
          try {
            creditsRes = await leaveAPI.getLeaveCredits(userId, { year: currentYear });
          } catch (creditsError) {
            console.warn('Failed to load leave credits:', creditsError);
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
        
        // Calculate leave balances from credits (if available)
        if (creditsRes && creditsRes.data && creditsRes.data.data) {
          const credits = creditsRes.data.data;
          
          // Calculate pending leaves for the current year to deduct from available balance
          // Emergency Leave uses Vacation Leave credits
          const pendingVacation = mapped
            .filter(r => r.status === 'Pending' && 
                        (r.leaveType === 'Vacation Leave' || r.leaveType === 'Emergency Leave') && 
                        new Date(r.dateFrom).getFullYear() === currentYear)
            .reduce((sum, r) => sum + Number(r.days || 0), 0);
            
          const pendingSick = mapped
            .filter(r => r.status === 'Pending' && 
                        r.leaveType === 'Sick Leave' && 
                        new Date(r.dateFrom).getFullYear() === currentYear)
            .reduce((sum, r) => sum + Number(r.days || 0), 0);

          const balances = {
            vacation: Math.max(0, ((credits['Vacation Leave']?.total_credits || 0) - (credits['Vacation Leave']?.used_credits || 0)) - pendingVacation),
            sick: Math.max(0, ((credits['Sick Leave']?.total_credits || 0) - (credits['Sick Leave']?.used_credits || 0)) - pendingSick)
          };
          setLeaveBalances(balances);
        } else {
          // Set default balances if credits couldn't be loaded
          setLeaveBalances({ vacation: 0, sick: 0 });
        }
        
        setError(null);
      } catch (err) {
        console.error('Error loading leave requests:', err);
        setLeaveRequests([]);
        setLeaveBalances({ vacation: 0, sick: 0 });
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
      if (formData.attachment) {
        payload.attachment = formData.attachment;
      }
      
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
      const currentYear = new Date().getFullYear();
      
      if (currentUser && currentUser.id) {
        try {
          creditsRes = await leaveAPI.getLeaveCredits(currentUser.id, { year: currentYear });
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
      if (creditsRes && creditsRes.data && creditsRes.data.data) {
        const credits = creditsRes.data.data;
        
        const pendingVacation = mapped
            .filter(r => r.status === 'Pending' && 
                        (r.leaveType === 'Vacation Leave' || r.leaveType === 'Emergency Leave') && 
                        new Date(r.dateFrom).getFullYear() === currentYear)
            .reduce((sum, r) => sum + Number(r.days || 0), 0);
            
        const pendingSick = mapped
            .filter(r => r.status === 'Pending' && 
                        r.leaveType === 'Sick Leave' && 
                        new Date(r.dateFrom).getFullYear() === currentYear)
            .reduce((sum, r) => sum + Number(r.days || 0), 0);

        const balances = {
          vacation: Math.max(0, ((credits['Vacation Leave']?.total_credits || 0) - (credits['Vacation Leave']?.used_credits || 0)) - pendingVacation),
          sick: Math.max(0, ((credits['Sick Leave']?.total_credits || 0) - (credits['Sick Leave']?.used_credits || 0)) - pendingSick)
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
        
        if (errorData.errors) {
          // Prefer detailed validation errors when available
          const validationErrors = Object.values(errorData.errors).flat();
          if (validationErrors.length > 0) {
            errorMessage = validationErrors.join('\n');
          } else if (errorData.message) {
            errorMessage = errorData.message;
          } else {
            errorMessage = 'Please check your input and try again.';
          }
        } else if (errorData.message) {
          // Use backend error message when no detailed errors exist
          errorMessage = errorData.message;
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

  const handleCancelRequest = async () => {
    if (!requestToCancel) return;
    try {
      await leaveAPI.update(requestToCancel.leaveId, { status: 'Canceled' });
      setToast({ show: true, message: 'Leave request canceled successfully.', type: 'success' });

      // Refresh the list after cancellation
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
      let msg = 'Failed to cancel leave request. Please try again.';
      if (err.response?.data?.message) msg = err.response.data.message;
      setToast({ show: true, message: msg, type: 'error' });
    } finally {
      setRequestToCancel(null);
    }
  };
  
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

      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button className={`nav-link ${activeTab === 'requests' ? 'active' : ''}`} onClick={() => setActiveTab('requests')}>
            <i className="bi bi-card-list me-2"></i>My Requests
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${activeTab === 'cash-conversion' ? 'active' : ''}`} onClick={() => setActiveTab('cash-conversion')}>
            <i className="bi bi-cash-coin me-2"></i>Leave Cash Conversion
          </button>
        </li>
      </ul>

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

      {!loading && !error && activeTab === 'requests' && (
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
                    filteredRequests.map(req => (
                      <LeaveRequestCard
                        key={req.leaveId}
                        request={req}
                        onCancel={(r) => setRequestToCancel(r)}
                      />
                    ))
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
      <ConfirmationModal
        show={!!requestToCancel}
        onClose={() => setRequestToCancel(null)}
        onConfirm={handleCancelRequest}
        title="Cancel Leave Request"
        confirmText="Yes, Cancel"
        confirmVariant="danger"
      >
        <p>
          Are you sure you want to cancel your pending leave
          from <strong>{formatDateRange(requestToCancel?.dateFrom, requestToCancel?.dateTo)}</strong>?
        </p>
        <p className="text-muted mb-0">This will update the status to Canceled.</p>
      </ConfirmationModal>
        </>
      )}

      {!loading && !error && activeTab === 'cash-conversion' && (
        <div className="card shadow-sm">
          <div className="card-header d-flex justify-content-between align-items-center">
             <h5 className="mb-0">Leave Cash Conversion</h5>
             <div style={{ width: '150px' }}>
                <select 
                  className="form-select form-select-sm" 
                  value={cashYear} 
                  onChange={(e) => setCashYear(parseInt(e.target.value))}
                >
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
             </div>
          </div>
          <div className="card-body">
            {loadingCash ? (
              <div className="text-center p-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <p className="mt-2 text-muted">Loading cash conversion data...</p>
              </div>
            ) : !cashRecord ? (
               <div className="text-center p-5 bg-light rounded">
                 <i className="bi bi-cash-stack fs-1 text-muted mb-3 d-block"></i>
                 <h5 className="text-muted">No Record Found</h5>
                 <p className="text-muted mb-4">You have no cash conversion record for {cashYear}.</p>
                 <button 
                   className="btn btn-primary" 
                   onClick={handleGenerateCash}
                   disabled={generatingCash}
                 >
                   {generatingCash ? (
                     <>
                       <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                       Generating...
                     </>
                   ) : (
                     <>
                       <i className="bi bi-calculator me-2"></i>Generate Request
                     </>
                   )}
                 </button>
               </div>
            ) : (
              <div className="row g-4">
                 <div className="col-md-8">
                    <div className="card h-100 border-0 bg-light">
                      <div className="card-body">
                        <h6 className="card-title text-muted mb-3">CONVERSION DETAILS</h6>
                        <div className="row mb-3">
                          <div className="col-6">
                             <small className="text-muted d-block">Vacation Leave</small>
                             <span className="fs-5 fw-bold">{cashRecord.vacationDays} days</span>
                             <div className="text-success small">₱ {cashRecord.details?.vacation?.amount?.toLocaleString()}</div>
                          </div>
                          <div className="col-6">
                             <small className="text-muted d-block">Sick Leave</small>
                             <span className="fs-5 fw-bold">{cashRecord.sickDays} days</span>
                             <div className="text-success small">₱ {cashRecord.details?.sick?.amount?.toLocaleString()}</div>
                          </div>
                        </div>
                        <hr />
                        <div className="d-flex justify-content-between align-items-center">
                           <div>
                             <small className="text-muted d-block">Total Days</small>
                             <span className="fw-bold">{cashRecord.totalDays} days</span>
                           </div>
                           <div className="text-end">
                             <small className="text-muted d-block">Total Amount</small>
                             <span className="fs-4 fw-bold text-success">₱ {cashRecord.totalAmount?.toLocaleString()}</span>
                           </div>
                        </div>
                      </div>
                    </div>
                 </div>
                 <div className="col-md-4">
                    <div className="card h-100 border-0">
                      <div className="card-body d-flex flex-column justify-content-center text-center">
                         <h6 className="text-muted mb-4">STATUS</h6>
                         <div className="mb-4">
                           <span className={`badge rounded-pill fs-6 px-3 py-2 bg-${
                             cashRecord.status === 'Paid' ? 'success' :
                             cashRecord.status === 'Approved' ? 'primary' :
                             cashRecord.status === 'Declined' ? 'danger' :
                             cashRecord.status === 'Submitted' ? 'info' : 'secondary'
                           }`}>
                             {cashRecord.status.toUpperCase()}
                           </span>
                         </div>
                         
                         {cashRecord.status === 'Pending' && (
                           <button 
                             className="btn btn-success w-100"
                             onClick={() => handleCashStatusUpdate('Submitted')}
                             disabled={markingCash}
                           >
                             {markingCash ? 'Submitting...' : 'Submit Request'}
                           </button>
                         )}

                         {cashRecord.status === 'Submitted' && (
                           <button 
                             className="btn btn-outline-secondary w-100"
                             onClick={() => handleCashStatusUpdate('Pending')}
                             disabled={markingCash}
                           >
                             {markingCash ? 'Reverting...' : 'Revert to Pending'}
                           </button>
                         )}

                         {['Approved', 'Paid'].includes(cashRecord.status) && (
                           <div className="alert alert-success py-2 small">
                             <i className="bi bi-check-circle-fill me-2"></i>
                             Request {cashRecord.status.toLowerCase()}.
                           </div>
                         )}
                         
                         {cashRecord.status === 'Declined' && (
                           <div className="alert alert-danger py-2 small">
                             <i className="bi bi-x-circle-fill me-2"></i>
                             Request declined.
                           </div>
                         )}
                      </div>
                    </div>
                 </div>
              </div>
            )}
          </div>
        </div>
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
import React, { useState, useMemo, useEffect } from 'react';
import { leaveAPI } from '../../services/api';
import RequestLeaveModal from '../../modals/RequestLeaveModal';
import LeaveHistoryModal from '../../modals/LeaveHistoryModal';
import LeaveRequestCard from './LeaveRequestCard';
import './MyLeavePage.css'; 

const MyLeavePage = () => {
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('All');
  
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  
  const leaveBalances = { vacation: 12, sick: 8 };

  // Load user's leave requests from API
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await leaveAPI.getAll();
        const data = Array.isArray(res.data) ? res.data : (res.data?.data || []);
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
        
        // The backend should already filter to only show the current user's leaves
        // This is an extra safety check to ensure only the current user's leaves are displayed
        const currentUserId = JSON.parse(localStorage.getItem('user'))?.id;
        const filteredLeaves = currentUserId ? mapped.filter(leave => leave.empId === currentUserId) : mapped;
        
        setLeaveRequests(filteredLeaves);
        setError(null);
      } catch (err) {
        console.error('Error fetching leaves:', err);
        setLeaveRequests([]);
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
      
      await leaveAPI.create(payload);
      
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
      setShowRequestModal(false);
      alert('Leave request submitted successfully!');
    } catch (err) {
      console.error('Error creating leave request:', err);
      alert('Failed to submit leave request. Please try again.');
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
  
  if (loading) {
    return (
      <div className="container-fluid p-0 page-module-container">
        <div className="text-center p-5 bg-light rounded">
          <div className="spinner-border text-success" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3 mb-0">Loading your leave requests...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-fluid p-0 page-module-container">
        <div className="text-center p-5 bg-light rounded">
          <p className="text-danger">{error}</p>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid p-0 page-module-container">
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

      <div className="my-leave-dashboard">
        <div className="leave-balances">
            <div className="balance-card">
                <div className="balance-icon icon-vacation"><i className="bi bi-sun-fill"></i></div>
                <div className="balance-info"><span className="balance-value">{leaveBalances.vacation}</span><span className="balance-label">Vacation Days Left</span></div>
            </div>
            <div className="balance-card">
                <div className="balance-icon icon-sick"><i className="bi bi-heart-pulse-fill"></i></div>
                <div className="balance-info"><span className="balance-value">{leaveBalances.sick}</span><span className="balance-label">Sick Days Left</span></div>
            </div>
        </div>
        <div className="upcoming-leave-card">
            <h6><i className="bi bi-calendar-check-fill text-success me-2"></i>Upcoming Leave</h6>
            {upcomingLeave ? (
                <div>
                    <p className="upcoming-type">{upcomingLeave.leaveType}</p>
                    <p className="upcoming-dates">{upcomingLeave.dateFrom} to {upcomingLeave.dateTo}</p>
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
        />
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
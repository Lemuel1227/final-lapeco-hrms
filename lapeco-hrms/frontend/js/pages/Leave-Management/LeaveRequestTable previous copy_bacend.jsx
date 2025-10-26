import React, { useState, useMemo } from 'react';
import ConfirmationModal from '../../modals/ConfirmationModal';
import ViewReasonModal from '../../modals/ViewReasonModal';

const LeaveRequestTable = ({ leaveRequests, handlers }) => {
  const [activeStatusFilter, setActiveStatusFilter] = useState('Pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'dateFrom', direction: 'ascending' });

  const [requestToUpdate, setRequestToUpdate] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [requestToDelete, setRequestToDelete] = useState(null);
  const [requestToView, setRequestToView] = useState(null);

  const leaveCounts = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const counts = leaveRequests.reduce((acc, req) => {
      const statusKey = (req.status || 'pending').toLowerCase();
      acc.total++;
      acc[statusKey] = (acc[statusKey] || 0) + 1;
      return acc;
    }, { total: 0, pending: 0, approved: 0, declined: 0, canceled: 0 });

    const onLeaveToday = leaveRequests.filter(req => {
        return req.status === 'Approved' && today >= req.dateFrom && today <= req.dateTo;
    }).length;

    return { ...counts, onLeaveToday };
  }, [leaveRequests]);

  const filteredAndSortedRequests = useMemo(() => {
    let results = [...leaveRequests];
    if (activeStatusFilter !== 'All') {
      results = results.filter(req => req.status === activeStatusFilter);
    }
    if (typeFilter) {
      results = results.filter(req => req.leaveType === typeFilter);
    }
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      results = results.filter(req => 
        req.name.toLowerCase().includes(lowerSearch) ||
        (req.empId && String(req.empId).toLowerCase().includes(lowerSearch)) ||
        req.position.toLowerCase().includes(lowerSearch)
      );
    }

    return [...results].sort((a, b) => {
      const valA = a[sortConfig.key] || '';
      const valB = b[sortConfig.key] || '';
      if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
      return 0;
    });
  }, [leaveRequests, activeStatusFilter, searchTerm, typeFilter, sortConfig]);

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <i className="bi bi-arrow-down-up sort-icon ms-1"></i>;
    return sortConfig.direction === 'ascending' ? <i className="bi bi-sort-up sort-icon active ms-1"></i> : <i className="bi bi-sort-down sort-icon active ms-1"></i>;
  };

  const handleUpdateStatus = async () => {
    if (requestToUpdate && newStatus) {
      try {
        await handlers.updateLeaveStatus(requestToUpdate.leaveId, newStatus);
        setRequestToUpdate(null);
        setNewStatus('');
      } catch (error) {
        alert(error.message || 'Failed to update leave status');
      }
    }
  };

  const handleDeleteRequest = async () => {
    if (requestToDelete) {
      try {
        await handlers.deleteLeaveRequest(requestToDelete.leaveId);
        setRequestToDelete(null);
      } catch (error) {
        alert(error.message || 'Failed to delete leave request');
      }
    }
  };
  
  const openConfirmationModal = (request) => {
    setRequestToUpdate(request);
    // Pre-select the opposite status for quicker actions
    if (request.status === 'Approved') {
      setNewStatus('Declined');
    } else {
      setNewStatus('Approved');
    }
  };
  
  const closeConfirmationModal = () => {
    setRequestToUpdate(null);
    setNewStatus('');
  };

  const leaveTypes = useMemo(() => [...new Set(leaveRequests.map(r => r.leaveType))], [leaveRequests]);

  return (
    <>
      <div className="stat-card-grid">
        <div className="leave-stat-card total" onClick={() => setActiveStatusFilter('All')}>
          <span className="stat-value">{leaveCounts.total}</span>
          <span className="stat-label">Total Requests</span>
        </div>
        <div className={`leave-stat-card pending ${activeStatusFilter === 'Pending' ? 'active' : ''}`} onClick={() => setActiveStatusFilter('Pending')}>
          <span className="stat-value">{leaveCounts.pending}</span>
          <span className="stat-label">Pending</span>
        </div>
        <div className={`leave-stat-card approved ${activeStatusFilter === 'Approved' ? 'active' : ''}`} onClick={() => setActiveStatusFilter('Approved')}>
          <span className="stat-value">{leaveCounts.approved}</span>
          <span className="stat-label">Approved</span>
        </div>
        <div className={`leave-stat-card declined ${activeStatusFilter === 'Declined' ? 'active' : ''}`} onClick={() => setActiveStatusFilter('Declined')}>
          <span className="stat-value">{leaveCounts.declined}</span>
          <span className="stat-label">Declined</span>
        </div>
        <div className={`leave-stat-card canceled ${activeStatusFilter === 'Canceled' ? 'active' : ''}`} onClick={() => setActiveStatusFilter('Canceled')}>
          <span className="stat-value">{leaveCounts.canceled}</span>
          <span className="stat-label">Canceled</span>
        </div>
      </div>

      <div className="leave-controls-bar">
        <div className="input-group">
          <span className="input-group-text"><i className="bi bi-search"></i></span>
          <input type="text" className="form-control" placeholder="Search by name, ID, or position..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <div className="d-flex align-items-center gap-3">
          <div className="dropdown">
            <button className="btn btn-outline-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown">
              {typeFilter || 'Filter by Leave Type'}
            </button>
            <ul className="dropdown-menu dropdown-menu-end">
              <li><a className="dropdown-item" href="#" onClick={() => setTypeFilter('')}>All Types</a></li>
              {leaveTypes.map(type => (
                <li key={type}><a className="dropdown-item" href="#" onClick={() => setTypeFilter(type)}>{type}</a></li>
              ))}
            </ul>
          </div>
          <div className="on-leave-today-badge">
            <span className="count">{leaveCounts.onLeaveToday}</span> On Leave Today
          </div>
        </div>
      </div>

      <div className="card data-table-card shadow-sm">
        <div className="table-responsive">
          <table className="table data-table mb-0 align-middle">
            <thead>
              <tr>
                <th className="sortable" onClick={() => requestSort('empId')}>ID {getSortIcon('empId')}</th>
                <th className="sortable" onClick={() => requestSort('name')}>Name {getSortIcon('name')}</th>
                <th>Position</th>
                <th>Leave Type</th>
                <th className="sortable" onClick={() => requestSort('dateFrom')}>Date Range {getSortIcon('dateFrom')}</th>
                <th className="text-center sortable" onClick={() => requestSort('days')}>Days {getSortIcon('days')}</th>
                <th className="text-center">Status</th>
                <th className="text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedRequests.map(req => (
                <tr key={req.leaveId}>
                  <td>{req.empId}</td>
                  <td>{req.name}</td>
                  <td>{req.position}</td>
                  <td>{req.leaveType}</td>
                  <td>{req.dateFrom} to {req.dateTo}</td>
                  <td className="text-center">{req.days}</td>
                  <td className="text-center">
                    <span className={`status-badge status-${req.status.toLowerCase().replace(/\s+/g, '-')}`}>{req.status}</span>
                  </td>
                  <td className="text-center">
                    <div className="action-btn-group">
                      <button className="btn btn-sm btn-outline-secondary" title="View Reason" onClick={() => setRequestToView(req)}>
                        <i className="bi bi-info-circle"></i>
                      </button>
                      <button className="btn btn-sm btn-outline-primary" title="Approve / Decline" onClick={() => openConfirmationModal(req)}>
                        <i className="bi bi-pencil-square"></i>
                      </button>
                      <button className="btn btn-sm btn-outline-danger" title="Delete" onClick={() => setRequestToDelete(req)}>
                        <i className="bi bi-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredAndSortedRequests.length === 0 && (<tr><td colSpan="8" className="text-center p-4">No leave requests match your criteria.</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>
      
      <ConfirmationModal show={!!requestToUpdate} onClose={closeConfirmationModal} onConfirm={handleUpdateStatus} title="Change Leave Status" confirmText={`Confirm & Save`} confirmVariant="primary">
        <p>Change the status for <strong>{requestToUpdate?.name}</strong>'s leave request?</p>
        <div className="btn-group w-100">
            <button type="button" className={`btn btn-outline-success ${newStatus === 'Approved' ? 'active' : ''}`} onClick={() => setNewStatus('Approved')}>Approve</button>
            <button type="button" className={`btn btn-outline-danger ${newStatus === 'Declined' ? 'active' : ''}`} onClick={() => setNewStatus('Declined')}>Decline</button>
        </div>
      </ConfirmationModal>

      <ConfirmationModal show={!!requestToDelete} onClose={() => setRequestToDelete(null)} onConfirm={handleDeleteRequest} title="Delete Leave Request" confirmText="Yes, Delete">
        <p>Are you sure you want to permanently delete this leave request for {requestToDelete?.name}?</p>
      </ConfirmationModal>

      <ViewReasonModal show={!!requestToView} onClose={() => setRequestToView(null)} request={requestToView}/>
    </>
  );
};

export default LeaveRequestTable;
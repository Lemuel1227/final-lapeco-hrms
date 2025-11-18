// src/components/pages/Leave-Management/LeaveRequestTable.jsx

import React, { useState, useMemo } from 'react';
import './LeaveManagementPage.css';
import ConfirmationModal from '../../modals/ConfirmationModal';
import ViewReasonModal from '../../modals/ViewReasonModal';
import MaternityInfo from './MaternityInfo';
import PaternityInfo from './PaternityInfo';
import { formatDateRange, formatDate } from '../../utils/dateUtils';
import EditMaternityDetailsModal from '../../modals/EditMaternityDetailsModal';
import EditPaternityDetailsModal from '../../modals/EditPaternityDetailsModal';
import ViewAttachmentsModal from '../../modals/ViewAttachmentsModal';
import ActionsDropdown from '../../common/ActionsDropdown';

const LeaveRequestTable = ({ leaveRequests, handlers }) => {
  const [activeStatusFilter, setActiveStatusFilter] = useState('Pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'dateFrom', direction: 'ascending' });

  // Modal states
  const [requestToUpdate, setRequestToUpdate] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [requestToDelete, setRequestToDelete] = useState(null);
  const [requestToView, setRequestToView] = useState(null);
  const [extensionRequestToAction, setExtensionRequestToAction] = useState(null);
  const [extensionActionType, setExtensionActionType] = useState('');
  const [editingMaternityRequest, setEditingMaternityRequest] = useState(null);
  const [editingPaternityRequest, setEditingPaternityRequest] = useState(null);
  const [viewingAttachmentsRequest, setViewingAttachmentsRequest] = useState(null);

  const leaveCounts = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const counts = leaveRequests.reduce((acc, req) => {
      if (req.status === 'Pending' || req.extensionStatus === 'Pending') acc.pending = (acc.pending || 0) + 1;
      if (req.status === 'Approved') acc.approved = (acc.approved || 0) + 1;
      if (req.status === 'Declined') acc.declined = (acc.declined || 0) + 1;
      if (req.status === 'Canceled') acc.canceled = (acc.canceled || 0) + 1;
      acc.total++;
      return acc;
    }, { total: 0, pending: 0, approved: 0, declined: 0, canceled: 0 });
    const onLeaveToday = leaveRequests.filter(req => req.status === 'Approved' && today >= req.dateFrom && today <= req.dateTo).length;
    return { ...counts, onLeaveToday };
  }, [leaveRequests]);

  const filteredAndSortedRequests = useMemo(() => {
    let results = [...leaveRequests];
    if (activeStatusFilter === 'Pending') {
      results = results.filter(req => req.status === 'Pending' || req.extensionStatus === 'Pending');
    } else if (activeStatusFilter !== 'All') {
      results = results.filter(req => req.status === activeStatusFilter);
    }
    if (typeFilter) results = results.filter(req => req.leaveType === typeFilter);
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
    if (sortConfig.key === key && sortConfig.direction === 'ascending') direction = 'descending';
    setSortConfig({ key, direction });
  };
  
  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <i className="bi bi-arrow-down-up sort-icon ms-1"></i>;
    return sortConfig.direction === 'ascending' ? <i className="bi bi-sort-up sort-icon active ms-1"></i> : <i className="bi bi-sort-down sort-icon active ms-1"></i>;
  };

  const handleUpdateStatus = () => {
    if (requestToUpdate && newStatus) {
      handlers.updateLeaveStatus(requestToUpdate.leaveId, newStatus);
      setRequestToUpdate(null);
      setNewStatus('');
    }
  };

  const handleDeleteRequest = () => {
    if (requestToDelete) {
      handlers.deleteLeaveRequest(requestToDelete.leaveId);
      setRequestToDelete(null);
    }
  };

  const handleUpdateExtensionStatus = () => {
    if (extensionRequestToAction && extensionActionType) {
        handlers.updateMaternityExtensionStatus(extensionRequestToAction.leaveId, extensionActionType);
        setExtensionRequestToAction(null);
        setExtensionActionType('');
    }
  };
  
  const openConfirmationModal = (request) => {
    setRequestToUpdate(request);
    if (request.status === 'Approved' || request.status === 'Declined') {
        setNewStatus(request.status === 'Approved' ? 'Declined' : 'Approved');
    } else {
        setNewStatus('Approved');
    }
  };
  
  const closeConfirmationModal = () => setRequestToUpdate(null);
  const openExtensionActionModal = (request, action) => { setExtensionRequestToAction(request); setExtensionActionType(action); };
  const closeExtensionActionModal = () => { setExtensionRequestToAction(null); setExtensionActionType(''); };
  const leaveTypes = useMemo(() => [...new Set(leaveRequests.map(r => r.leaveType))], [leaveRequests]);

  return (
    <>
      <div className="stat-card-grid">
        <div className="leave-stat-card total" onClick={() => setActiveStatusFilter('All')}><span className="stat-value">{leaveCounts.total}</span><span className="stat-label">Total Requests</span></div>
        <div className={`leave-stat-card pending ${activeStatusFilter === 'Pending' ? 'active' : ''}`} onClick={() => setActiveStatusFilter('Pending')}><span className="stat-value">{leaveCounts.pending}</span><span className="stat-label">Pending Actions</span></div>
        <div className={`leave-stat-card approved ${activeStatusFilter === 'Approved' ? 'active' : ''}`} onClick={() => setActiveStatusFilter('Approved')}><span className="stat-value">{leaveCounts.approved}</span><span className="stat-label">Approved</span></div>
        <div className={`leave-stat-card declined ${activeStatusFilter === 'Declined' ? 'active' : ''}`} onClick={() => setActiveStatusFilter('Declined')}><span className="stat-value">{leaveCounts.declined}</span><span className="stat-label">Declined</span></div>
        <div className={`leave-stat-card canceled ${activeStatusFilter === 'Canceled' ? 'active' : ''}`} onClick={() => setActiveStatusFilter('Canceled')}><span className="stat-value">{leaveCounts.canceled}</span><span className="stat-label">Canceled</span></div>
      </div>
      <div className="leave-controls-bar">
        <div className="input-group"><span className="input-group-text"><i className="bi bi-search"></i></span><input type="text" className="form-control" placeholder="Search by name, ID, or position..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
        <div className="d-flex align-items-center gap-3">
          <div className="dropdown"><button className="btn btn-outline-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown">{typeFilter || 'Filter by Leave Type'}</button><ul className="dropdown-menu dropdown-menu-end"><li><a className="dropdown-item" href="#" onClick={() => setTypeFilter('')}>All Types</a></li>{leaveTypes.map(type => (<li key={type}><a className="dropdown-item" href="#" onClick={() => setTypeFilter(type)}>{type}</a></li>))}</ul></div>
          <div className="on-leave-today-badge"><span className="count">{leaveCounts.onLeaveToday}</span> On Leave Today</div>
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
                <th className="text-center sortable" onClick={() => requestSort('requestedAt')}>Requested {getSortIcon('requestedAt')}</th>
                <th className="text-center">Status</th>
                <th className="text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedRequests.map(req => {
                const hasAttachment = req.documentName || 
                                      req.maternityDetails?.medicalDocumentName || 
                                      req.maternityDetails?.soloParentDocumentName ||
                                      req.paternityDetails?.marriageCertName ||
                                      req.paternityDetails?.birthCertName;
                return (
                  <tr key={req.leaveId}>
                    <td>{req.empId}</td><td>{req.name}</td><td>{req.position}</td>
                    <td><div className="d-flex align-items-center"><span>{req.leaveType}</span>{req.maternityDetails && <MaternityInfo details={req.maternityDetails} />}{req.paternityDetails && <PaternityInfo details={req.paternityDetails} />}</div></td>
                    <td>{formatDateRange(req.dateFrom, req.dateTo)}</td>
                    <td className="text-center"><span>{req.days}</span></td>
                    <td className="text-center">
                      <div className="d-flex flex-column align-items-center">
                        <span>{formatDate(req.requestedAt, 'short')}</span>
                        {req.status === 'Pending' ? (
                          <small className="text-muted">{Math.max(0, Math.floor((Date.now() - new Date(req.requestedAt).getTime()) / (1000 * 60 * 60 * 24)))} day(s)</small>
                        ) : (
                          <small className="text-muted">—</small>
                        )}
                      </div>
                    </td>
                    <td className="text-center">
                      <div className="status-badge-group">
                        <span className={`status-badge status-${req.status.toLowerCase().replace(/\s+/g, '-')}`}>{req.status}</span>
                        {req.extensionStatus && req.status !== 'Pending' && (<span className={`status-badge status-${req.extensionStatus.toLowerCase()}`}>{`Ext. ${req.extensionStatus}`}</span>)}
                      </div>
                    </td>
                    <td className="text-center">
                      <ActionsDropdown>
                        <a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); setRequestToView(req); }}><i className="bi bi-info-circle me-2"></i>View Reason</a>
                        {hasAttachment && (<a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); setViewingAttachmentsRequest(req); }}><i className="bi bi-paperclip me-2"></i>View Attachments</a>)}
                        {req.status !== 'Canceled' && (<a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); openConfirmationModal(req); }}><i className="bi bi-pencil-square me-2"></i>Change Status</a>)}
                        {req.maternityDetails && (<a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); setEditingMaternityRequest(req); }}><i className="bi bi-pencil-fill me-2"></i>Edit Maternity Details</a>)}
                        {req.paternityDetails && (<a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); setEditingPaternityRequest(req); }}><i className="bi bi-pencil-fill me-2"></i>Edit Paternity Details</a>)}
                        {req.extensionStatus === 'Pending' && (<><div className="dropdown-divider"></div><h6 className="dropdown-header">Extension Request</h6><a className="dropdown-item text-success" href="#" onClick={(e) => { e.preventDefault(); openExtensionActionModal(req, 'Approved'); }}><i className="bi bi-check-circle-fill me-2"></i>Approve Extension</a><a className="dropdown-item text-danger" href="#" onClick={(e) => { e.preventDefault(); openExtensionActionModal(req, 'Declined'); }}><i className="bi bi-x-circle-fill me-2"></i>Decline Extension</a></>)}
                        <div className="dropdown-divider"></div>
                        <a className="dropdown-item text-danger" href="#" onClick={(e) => { e.preventDefault(); setRequestToDelete(req); }}><i className="bi bi-trash me-2"></i>Delete Request</a>
                      </ActionsDropdown>
                    </td>
                  </tr>
                )
              })}
              {filteredAndSortedRequests.length === 0 && (<tr><td colSpan="8" className="text-center p-4">No leave requests match your criteria.</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>
      
      <ConfirmationModal show={!!requestToUpdate} onClose={closeConfirmationModal} onConfirm={handleUpdateStatus} title="Change Leave Status" confirmText={`Confirm & Save`} confirmVariant="primary"><p>Change the status for <strong>{requestToUpdate?.name}</strong>'s leave request?</p><div className="btn-group w-100"><button type="button" className={`btn btn-outline-success ${newStatus === 'Approved' ? 'active' : ''}`} onClick={() => setNewStatus('Approved')}>Approve</button><button type="button" className={`btn btn-outline-danger ${newStatus === 'Declined' ? 'active' : ''}`} onClick={() => setNewStatus('Declined')}>Decline</button></div></ConfirmationModal>
      <ConfirmationModal show={!!requestToDelete} onClose={() => setRequestToDelete(null)} onConfirm={handleDeleteRequest} title="Delete Leave Request" confirmText="Yes, Delete"><p>Are you sure you want to permanently delete this leave request for {requestToDelete?.name}?</p></ConfirmationModal>
      <ViewReasonModal show={!!requestToView} onClose={() => setRequestToView(null)} request={requestToView}/>
      <ConfirmationModal show={!!extensionRequestToAction} onClose={closeExtensionActionModal} onConfirm={handleUpdateExtensionStatus} title={`${extensionActionType} Extension`} confirmText={`Yes, ${extensionActionType}`} confirmVariant={extensionActionType === 'Approved' ? 'success' : 'danger'}><p>Are you sure you want to <strong>{extensionActionType?.toLowerCase()}</strong> the 30-day unpaid leave extension for <strong>{extensionRequestToAction?.name}</strong>?</p>{extensionActionType === 'Approved' && <p className="fw-bold">This will automatically extend their leave end date by 30 days.</p>}</ConfirmationModal>
      <EditMaternityDetailsModal show={!!editingMaternityRequest} onClose={() => setEditingMaternityRequest(null)} onSave={handlers.updateMaternityDetails} request={editingMaternityRequest} />
      <EditPaternityDetailsModal show={!!editingPaternityRequest} onClose={() => setEditingPaternityRequest(null)} onSave={handlers.updatePaternityDetails} request={editingPaternityRequest} />
      <ViewAttachmentsModal show={!!viewingAttachmentsRequest} onClose={() => setViewingAttachmentsRequest(null)} request={viewingAttachmentsRequest} />
    </>
  );
};

export default LeaveRequestTable;
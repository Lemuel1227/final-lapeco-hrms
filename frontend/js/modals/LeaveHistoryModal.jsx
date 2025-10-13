import React, { useState, useMemo } from 'react';
import { formatDateRange } from '../utils/dateUtils';

const LeaveHistoryModal = ({ show, onClose, leaveHistory }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const sortedHistory = useMemo(() => 
    [...leaveHistory].sort((a, b) => new Date(b.dateFrom) - new Date(a.dateFrom)),
  [leaveHistory]);

  const filteredHistory = useMemo(() => {
    if (!searchTerm) return sortedHistory;
    const lowerSearch = searchTerm.toLowerCase();
    return sortedHistory.filter(req => 
      req.leaveType.toLowerCase().includes(lowerSearch) ||
      req.status.toLowerCase().includes(lowerSearch)
    );
  }, [sortedHistory, searchTerm]);

  if (!show) return null;

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Complete Leave History</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            <div className="input-group mb-3">
              <span className="input-group-text"><i className="bi bi-search"></i></span>
              <input 
                type="text" 
                className="form-control" 
                placeholder="Search by leave type or status..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="table-responsive" style={{ maxHeight: '60vh' }}>
              <table className="table data-table table-sm table-striped">
                {/* --- REFINED THEAD for consistency --- */}
                <thead style={{backgroundColor: "var(--thead-bg)"}}>
                  <tr>
                    <th>Leave Type</th>
                    <th>Date Range</th>
                    <th className="text-center">Days</th>
                    <th className="text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.length > 0 ? filteredHistory.map(req => (
                    <tr key={req.leaveId}>
                      <td>{req.leaveType}</td>
                      <td>{formatDateRange(req.dateFrom, req.dateTo)}</td>
                      <td className="text-center">{req.days}</td>
                      <td className="text-center">
                        <span className={`status-badge status-${(req.status || 'pending').toLowerCase().replace(/\s+/g, '-')}`}>{req.status}</span>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan="4" className="text-center p-4 text-muted">No history found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline-secondary" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeaveHistoryModal;
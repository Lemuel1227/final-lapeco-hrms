// src/components/modals/LeaveReportModal.jsx (NEW FILE)

import React, { useState } from 'react';

const LeaveReportModal = ({ show, onClose, onGenerate }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState('');

  const handleGenerateClick = () => {
    if (!startDate || !endDate) {
      setError('Both start and end dates are required.');
      return;
    }
    if (new Date(endDate) < new Date(startDate)) {
      setError('End date cannot be before the start date.');
      return;
    }
    setError('');
    onGenerate({ startDate, endDate });
  };

  const handleClose = () => {
    setStartDate('');
    setEndDate('');
    setError('');
    onClose();
  };

  if (!show) return null;

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Generate Leave Report</h5>
            <button type="button" className="btn-close" onClick={handleClose}></button>
          </div>
          <div className="modal-body">
            <p className="text-muted">Select a date range to include in the report. The report will include all leave requests that start within this period.</p>
            {error && <div className="alert alert-danger py-2">{error}</div>}
            <div className="row g-3">
              <div className="col-md-6">
                <label htmlFor="reportStartDate" className="form-label">Start Date*</label>
                <input
                  type="date"
                  id="reportStartDate"
                  className="form-control"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                />
              </div>
              <div className="col-md-6">
                <label htmlFor="reportEndDate" className="form-label">End Date*</label>
                <input
                  type="date"
                  id="reportEndDate"
                  className="form-control"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline-secondary" onClick={handleClose}>Cancel</button>
            <button type="button" className="btn btn-success" onClick={handleGenerateClick}>Generate Report</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeaveReportModal;
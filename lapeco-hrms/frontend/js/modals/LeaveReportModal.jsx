// src/components/modals/LeaveReportModal.jsx (NEW FILE)

import React, { useState } from 'react';

const LeaveReportModal = ({ show, onClose, onGenerate }) => {
  const [reportType, setReportType] = useState('leave_requests');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [error, setError] = useState('');

  const handleGenerateClick = () => {
    if (reportType === 'leave_requests') {
      if (!startDate || !endDate) {
        setError('Both start and end dates are required.');
        return;
      }
      if (new Date(endDate) < new Date(startDate)) {
        setError('End date cannot be before the start date.');
        return;
      }
      onGenerate({ reportType, startDate, endDate });
    } else {
      if (!year) {
        setError('Year is required.');
        return;
      }
      onGenerate({ reportType, year });
    }
    setError('');
  };

  const handleClose = () => {
    setStartDate('');
    setEndDate('');
    setReportType('leave_requests');
    setYear(new Date().getFullYear());
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
            <p className="text-muted">Select the type of report and parameters.</p>
            {error && <div className="alert alert-danger py-2">{error}</div>}
            
            <div className="mb-3">
              <label htmlFor="reportType" className="form-label">Report Type</label>
              <select 
                id="reportType" 
                className="form-select" 
                value={reportType} 
                onChange={(e) => setReportType(e.target.value)}
              >
                <option value="leave_requests">Leave Requests Report</option>
                <option value="leave_cash_conversion">Leave Cash Conversion Report</option>
              </select>
            </div>

            {reportType === 'leave_requests' ? (
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
            ) : (
              <div className="mb-3">
                <label htmlFor="reportYear" className="form-label">Year*</label>
                <input
                  type="number"
                  id="reportYear"
                  className="form-control"
                  value={year}
                  onChange={e => setYear(parseInt(e.target.value))}
                  min="2000"
                  max="2100"
                />
              </div>
            )}
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
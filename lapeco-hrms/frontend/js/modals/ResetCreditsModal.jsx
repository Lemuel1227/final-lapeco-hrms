import React, { useState } from 'react';

const ResetCreditsModal = ({ show, onClose, onConfirm, employees }) => {
  const [resetData, setResetData] = useState({
    user_id: '',
    leave_type: '',
    year: new Date().getFullYear()
  });

  // Align with supported credit types used across the app/API
  const leaveTypes = [
    'Vacation Leave',
    'Sick Leave'
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const submitData = {
      // Do not send year (backend uses current year); keep in local state only
      user_id: resetData.user_id ? Number(resetData.user_id) : null,
      leave_type: resetData.leave_type || null,
      // Backend requires explicit flags when reseting all users/types
      reset_all_users: !resetData.user_id,
      reset_all_types: !resetData.leave_type,
    };
    
    onConfirm(submitData);
  };

  const handleReset = () => {
    setResetData({
      user_id: '',
      leave_type: '',
      year: new Date().getFullYear()
    });
  };

  if (!show) return null;

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Reset Leave Credits</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div className="alert alert-warning">
                <i className="bi bi-exclamation-triangle me-2"></i>
                <strong>Warning:</strong> This action will reset the used credits to zero for the selected criteria. This cannot be undone.
              </div>

              <div className="row">
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label">Employee (Optional)</label>
                    <select 
                      className="form-select"
                      value={resetData.user_id}
                      onChange={(e) => setResetData(prev => ({ ...prev, user_id: e.target.value }))}
                    >
                      <option value="">All Employees</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.name}</option>
                      ))}
                    </select>
                    <div className="form-text">Leave empty to reset for all employees</div>
                  </div>
                </div>

                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label">Leave Type (Optional)</label>
                    <select 
                      className="form-select"
                      value={resetData.leave_type}
                      onChange={(e) => setResetData(prev => ({ ...prev, leave_type: e.target.value }))}
                    >
                      <option value="">All Leave Types</option>
                      {leaveTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                    <div className="form-text">Leave empty to reset all leave types</div>
                  </div>
                </div>
              </div>

              <div className="row">
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label">Year</label>
                    <input 
                      type="number"
                      className="form-control"
                      value={resetData.year}
                      onChange={(e) => setResetData(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                      min="2020"
                      max="2030"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="mt-3 p-3 bg-light rounded">
                <h6>Reset Summary:</h6>
                <ul className="mb-0">
                  <li><strong>Employees:</strong> {resetData.user_id ? employees.find(emp => emp.id == resetData.user_id)?.name : 'All employees'}</li>
                  <li><strong>Leave Types:</strong> {resetData.leave_type || 'All leave types'}</li>
                  <li><strong>Year:</strong> {resetData.year}</li>
                </ul>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={handleReset}>
                Clear Form
              </button>
              <button type="button" className="btn btn-outline-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-warning">
                <i className="bi bi-arrow-clockwise me-2"></i>Reset Credits
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetCreditsModal;
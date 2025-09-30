// src/components/modals/EditLeaveCreditsModal.jsx (UPDATED)

import React, { useState, useEffect } from 'react';

const EditLeaveCreditsModal = ({ show, onClose, onSave, employeeData }) => {
  const [credits, setCredits] = useState({
    sick: 0,
    vacation: 0,
    personal: 0,
  });

  useEffect(() => {
    if (employeeData && employeeData.leaveCredits) {
      setCredits({
        sick: employeeData.leaveCredits.sick || 0,
        vacation: employeeData.leaveCredits.vacation || 0,
        personal: employeeData.leaveCredits.personal || 0,
      });
    }
  }, [employeeData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCredits(prev => ({
      ...prev,
      [name]: Number(value) < 0 ? 0 : Number(value)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(employeeData.id, credits);
  };

  if (!show) return null;

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <form onSubmit={handleSubmit}>
            <div className="modal-header">
              <h5 className="modal-title">Edit Leave Credits for {employeeData.name}</h5>
              <button type="button" className="btn-close" onClick={onClose}></button>
            </div>
            <div className="modal-body">
              <p className="text-muted">Set the total number of allocated leave days for the year.</p>
              <div className="mb-3">
                <label htmlFor="vacation" className="form-label">Total Vacation Leave Days</label>
                <input type="number" id="vacation" name="vacation" className="form-control" value={credits.vacation} onChange={handleChange} min="0" />
              </div>
              <div className="mb-3">
                <label htmlFor="sick" className="form-label">Total Sick Leave Days</label>
                <input type="number" id="sick" name="sick" className="form-control" value={credits.sick} onChange={handleChange} min="0" />
              </div>
              <div className="mb-3">
                <label htmlFor="personal" className="form-label">Total Personal Leave Days</label>
                <input type="number" id="personal" name="personal" className="form-control" value={credits.personal} onChange={handleChange} min="0" />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-success">Save Changes</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditLeaveCreditsModal;
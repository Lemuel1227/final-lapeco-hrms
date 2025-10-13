import React, { useState } from 'react';

const BulkAddLeaveCreditsModal = ({ show, onClose, onConfirm, activeEmployeeCount }) => {
  const [creditsToAdd, setCreditsToAdd] = useState({
    vacation: 0,
    sick: 0,
    personal: 0,
    paternity: 0,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    const numValue = Number(value);
    setCreditsToAdd(prev => ({
      ...prev,
      [name]: numValue < 0 ? 0 : numValue,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm(creditsToAdd);
  };

  if (!show) return null;

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <form onSubmit={handleSubmit}>
            <div className="modal-header">
              <h5 className="modal-title">Bulk Add Leave Credits</h5>
              <button type="button" className="btn-close" onClick={onClose}></button>
            </div>
            <div className="modal-body">
              <div className="alert alert-info">
                The credits you enter below will be <strong>added</strong> to the current balance of all <strong>{activeEmployeeCount} active employees</strong>.
              </div>
              <p className="text-muted">This is useful for annual leave allocation. Paternity leave credits will only be applied to male employees.</p>
              
              <div className="mb-3">
                <label htmlFor="vacation" className="form-label">Vacation Leave Days to Add</label>
                <input type="number" id="vacation" name="vacation" className="form-control" value={creditsToAdd.vacation} onChange={handleChange} min="0" />
              </div>
              <div className="mb-3">
                <label htmlFor="sick" className="form-label">Sick Leave Days to Add</label>
                <input type="number" id="sick" name="sick" className="form-control" value={creditsToAdd.sick} onChange={handleChange} min="0" />
              </div>
              <div className="mb-3">
                <label htmlFor="personal" className="form-label">Personal Leave Days to Add</label>
                <input type="number" id="personal" name="personal" className="form-control" value={creditsToAdd.personal} onChange={handleChange} min="0" />
              </div>
              <div className="mb-3">
                <label htmlFor="paternity" className="form-label">Paternity Leave Days to Add (for Males)</label>
                <input type="number" id="paternity" name="paternity" className="form-control" value={creditsToAdd.paternity} onChange={handleChange} min="0" />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-success">Confirm & Add Credits</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BulkAddLeaveCreditsModal;
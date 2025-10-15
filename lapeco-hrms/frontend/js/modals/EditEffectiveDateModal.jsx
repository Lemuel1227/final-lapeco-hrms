import React, { useState } from 'react';

const EditEffectiveDateModal = ({ show, onClose, onSave, request }) => {
  const [effectiveDate, setEffectiveDate] = useState(request.effectiveDate || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(request.id, effectiveDate);
  };

  if (!show) return null;

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <form onSubmit={handleSubmit}>
            <div className="modal-header">
              <h5 className="modal-title">Edit Effective Date</h5>
              <button type="button" className="btn-close" onClick={onClose}></button>
            </div>
            <div className="modal-body">
              <p>Adjust the official last day of employment for <strong>{request.employeeName}</strong>.</p>
              <div className="alert alert-warning small">
                <strong>Note:</strong> Waiving the 30-day notice period may have legal implications. Please ensure this is compliant with your company policy and the employee's contract.
              </div>
              <div className="mb-3">
                <label htmlFor="effectiveDate" className="form-label">New Effective Date*</label>
                <input
                  type="date"
                  id="effectiveDate"
                  className="form-control"
                  value={effectiveDate}
                  onChange={(e) => setEffectiveDate(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary">Save Changes</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditEffectiveDateModal;
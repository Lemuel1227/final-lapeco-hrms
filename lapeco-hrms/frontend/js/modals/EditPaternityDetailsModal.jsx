import React, { useState, useEffect } from 'react';

const EditPaternityDetailsModal = ({ show, onClose, onSave, request }) => {
  const initialDetails = request?.paternityDetails || {};

  const [formData, setFormData] = useState({
    childsDob: initialDetails.childsDob || '',
    isEligiblePaternity: initialDetails.isEligiblePaternity || false,
  });

  useEffect(() => {
    if (request) {
      setFormData({
        childsDob: request.paternityDetails?.childsDob || '',
        isEligiblePaternity: request.paternityDetails?.isEligiblePaternity || false,
      });
    }
  }, [request]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const updatedDetails = {
      ...request.paternityDetails,
      ...formData,
    };
    onSave(request.leaveId, updatedDetails);
    onClose();
  };

  if (!show || !request) return null;

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <form onSubmit={handleSubmit}>
            <div className="modal-header">
              <h5 className="modal-title">Edit Paternity Details for {request.name}</h5>
              <button type="button" className="btn-close" onClick={onClose}></button>
            </div>
            <div className="modal-body">
              <p className="text-muted">
                Confirm or update the details for this paternity leave. This does not change the leave duration.
              </p>

              <div className="mb-3">
                <label htmlFor="childsDob" className="form-label fw-bold">Child's Date of Birth / Miscarriage Date</label>
                <input
                  type="date"
                  className="form-control"
                  id="childsDob"
                  value={formData.childsDob}
                  onChange={(e) => setFormData({ ...formData, childsDob: e.target.value })}
                />
              </div>

              <div className="form-check mb-3">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="isEligiblePaternity"
                  checked={formData.isEligiblePaternity}
                  onChange={(e) => setFormData({ ...formData, isEligiblePaternity: e.target.checked })}
                />
                <label className="form-check-label" htmlFor="isEligiblePaternity">
                  Confirm employee is married and cohabiting with the spouse.
                </label>
              </div>

              <div className="alert alert-info py-2">
                <strong>Note:</strong> Paternity leave is valid for 7 calendar days for the first four deliveries of the legitimate spouse.
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

export default EditPaternityDetailsModal;
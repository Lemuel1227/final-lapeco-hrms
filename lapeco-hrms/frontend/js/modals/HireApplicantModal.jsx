import React, { useState, useEffect } from 'react';

const HireApplicantModal = ({ show, onClose, onHire, applicant, positions, validationErrors }) => {
  const [positionId, setPositionId] = useState('');
  const [joiningDate, setJoiningDate] = useState(new Date().toISOString().split('T')[0]);
  const [error, setError] = useState('');

  // Reset form when modal opens
  useEffect(() => {
    if (show) {
      setPositionId('');
      setJoiningDate(new Date().toISOString().split('T')[0]);
      setError('');
    }
  }, [show]);
  

  const handleHire = async () => {
    if (!positionId) {
      setError('You must assign a position.');
      return;
    }
    if (!joiningDate) {
      setError('Joining date is required.');
      return;
    }
    
    try {
      await onHire(applicant.id, { position_id: positionId, start_date: joiningDate });
      // Only close the modal if the hire operation was successful
      onClose();
    } catch (error) {
    }
  };

  if (!show) return null;

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Hire Applicant: {applicant.full_name || applicant.name}</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            <p>Please confirm the details to onboard this applicant as an employee.</p>
            {error && <div className="alert alert-danger">{error}</div>}
            {validationErrors && (
              <div className="alert alert-danger">
                {Object.keys(validationErrors).map(field => (
                  <div key={field}>
                    {validationErrors[field].join(', ')}
                  </div>
                ))}
              </div>
            )}
            <div className="mb-3">
              <label htmlFor="positionId" className="form-label">Assign Position*</label>
              <select 
                className={`form-select ${validationErrors?.position_id ? 'is-invalid' : ''}`} 
                id="positionId" 
                value={positionId} 
                onChange={(e) => { setPositionId(e.target.value); setError(''); }}
              >
                <option value="">Select a position...</option>
                {positions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              {validationErrors?.position_id && (
                <div className="invalid-feedback">
                  {validationErrors.position_id.join(', ')}
                </div>
              )}
            </div>
            <div className="mb-3">
              <label htmlFor="joiningDate" className="form-label">Joining Date*</label>
              <input 
                type="date" 
                className={`form-control ${validationErrors?.start_date ? 'is-invalid' : ''}`} 
                id="joiningDate" 
                value={joiningDate} 
                onChange={e => setJoiningDate(e.target.value)} 
              />
              {validationErrors?.start_date && (
                <div className="invalid-feedback">
                  {validationErrors.start_date.join(', ')}
                </div>
              )}
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline-secondary" onClick={onClose}>Cancel</button>
            <button type="button" className="btn btn-success" onClick={handleHire}>Confirm Hire</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HireApplicantModal;
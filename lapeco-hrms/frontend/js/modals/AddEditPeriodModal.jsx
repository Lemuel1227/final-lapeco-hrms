import React, { useState, useEffect } from 'react';

const AddEditPeriodModal = ({ show, onClose, onSave, periodData }) => {
  const isEditMode = Boolean(periodData);
  const initialFormState = {
    name: '',
    evaluationStart: '',
    evaluationEnd: '',
    openDate: '',
    closeDate: '',
  };

  const [formData, setFormData] = useState(initialFormState);
  const [error, setError] = useState('');

  useEffect(() => {
    if (show) {
      setFormData(isEditMode ? { ...periodData } : initialFormState);
      setError('');
    }
  }, [show, periodData, isEditMode]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = () => {
    const { name, evaluationStart, evaluationEnd, openDate, closeDate } = formData;
    if (!name || !evaluationStart || !evaluationEnd || !openDate || !closeDate) {
      setError('All fields are required.');
      return;
    }
    if (new Date(evaluationEnd) < new Date(evaluationStart)) {
      setError('Evaluation end date cannot be before its start date.');
      return;
    }
    if (new Date(closeDate) < new Date(openDate)) {
      setError('Close date cannot be before the open date.');
      return;
    }
    if (new Date(openDate) < new Date(evaluationStart)) {
      setError('The open date must be on or after the evaluation start date.');
      return;
    }
    onSave(formData, periodData?.id);
    onClose();
  };

  if (!show) return null;

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{isEditMode ? 'Edit' : 'Add New'} Evaluation Period</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            {error && <div className="alert alert-danger py-2">{error}</div>}
            <div className="mb-3">
              <label htmlFor="name" className="form-label">Period Name*</label>
              <input type="text" id="name" name="name" className="form-control" value={formData.name} onChange={handleChange} placeholder="e.g., H1 2025 Review" />
            </div>
            <hr />
            <h6 className="form-section-title">Period to Evaluate</h6>
            <p className="text-muted small">The date range of performance that will be reviewed.</p>
            <div className="row g-3 mb-3">
              <div className="col-md-6">
                <label htmlFor="evaluationStart" className="form-label">Start Date*</label>
                <input type="date" id="evaluationStart" name="evaluationStart" className="form-control" value={formData.evaluationStart} onChange={handleChange} />
              </div>
              <div className="col-md-6">
                <label htmlFor="evaluationEnd" className="form-label">End Date*</label>
                <input type="date" id="evaluationEnd" name="evaluationEnd" className="form-control" value={formData.evaluationEnd} onChange={handleChange} />
              </div>
            </div>
            <h6 className="form-section-title">Evaluation Window</h6>
            <p className="text-muted small">The date range when submissions will be open to employees and leaders.</p>
            <div className="row g-3">
              <div className="col-md-6">
                <label htmlFor="openDate" className="form-label">Open Date*</label>
                <input type="date" id="openDate" name="openDate" className="form-control" value={formData.openDate} onChange={handleChange} />
              </div>
              <div className="col-md-6">
                <label htmlFor="closeDate" className="form-label">Close Date*</label>
                <input type="date" id="closeDate" name="closeDate" className="form-control" value={formData.closeDate} onChange={handleChange} />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline-secondary" onClick={onClose}>Cancel</button>
            <button type="button" className="btn btn-success" onClick={handleSubmit}>
              {isEditMode ? 'Save Changes' : 'Create Period'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddEditPeriodModal;
import React, { useState, useEffect } from 'react';
import './AddEditPositionModal.css';

const AddEditPositionModal = ({ show, onClose, onSave, positionData, submitting }) => {
  const initialFormState = { title: '', description: '', monthlySalary: '' };
  const [formData, setFormData] = useState(initialFormState);
  const [errors, setErrors] = useState({});

  const isEditMode = Boolean(positionData && positionData.id);

  useEffect(() => {
    if (show) {
      if (isEditMode && positionData) {
        setFormData({
          title: positionData.title || positionData.name || '',
          description: positionData.description || '',
          monthlySalary: positionData.monthlySalary ?? positionData.monthly_salary ?? '',
        });
      } else {
        setFormData(initialFormState);
      }
      setErrors({});
    }
  }, [positionData, show]); 

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.title.trim()) newErrors.title = 'Position title is required.';
    if (!formData.description.trim()) newErrors.description = 'Description is required.';
    if (formData.monthlySalary === '' || isNaN(formData.monthlySalary) || Number(formData.monthlySalary) < 0) {
      newErrors.monthlySalary = 'Monthly salary must be a valid number.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSave({
        title: formData.title,
        description: formData.description,
        monthlySalary: Number(formData.monthlySalary),
      }, positionData?.id);
    }
  };

  if (!show) return null;

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content position-form-modal">
          <form onSubmit={handleSubmit} noValidate>
            <div className="modal-header">
              <h5 className="modal-title">{isEditMode ? 'Edit Position' : 'Add New Position'}</h5>
              <button type="button" className="btn-close" onClick={onClose} aria-label="Close"></button>
            </div>
            <div className="modal-body">
              <div className="mb-3">
                <label htmlFor="title" className="form-label">Position Title*</label>
                <input type="text" className={`form-control ${errors.title ? 'is-invalid' : ''}`} id="title" name="title" value={formData.title} onChange={handleChange} required />
                {errors.title && <div className="invalid-feedback">{errors.title}</div>}
              </div>
              <div className="mb-3">
                <label htmlFor="description" className="form-label">Description*</label>
                <textarea className={`form-control ${errors.description ? 'is-invalid' : ''}`} id="description" name="description" rows="4" value={formData.description} onChange={handleChange} required></textarea>
                {errors.description && <div className="invalid-feedback">{errors.description}</div>}
              </div>
              <div className="mb-3">
                <label htmlFor="monthlySalary" className="form-label">Monthly Salary*</label>
                <div className="input-group">
                    <span className="input-group-text">₱</span>
                    <input type="number" className={`form-control ${errors.monthlySalary ? 'is-invalid' : ''}`} id="monthlySalary" name="monthlySalary" value={formData.monthlySalary} onChange={handleChange} required placeholder="e.g., 80000" />
                </div>
                {errors.monthlySalary && <div className="invalid-feedback d-block">{errors.monthlySalary}</div>}
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={submitting}>Cancel</button>
              <button type="submit" className="btn btn-success" disabled={submitting}>
                {submitting ? 'Saving...' : (isEditMode ? 'Save Changes' : 'Add Position')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddEditPositionModal;
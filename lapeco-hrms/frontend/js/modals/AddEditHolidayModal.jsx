import React, { useState, useEffect } from 'react';
import './AddEditHolidayModal.css';

const AddEditHolidayModal = ({ show, onClose, onSave, holidayData }) => {
  const initialFormState = { name: '', date: '', type: 'Regular Holiday' };
  const [formData, setFormData] = useState(initialFormState);
  const [errors, setErrors] = useState({});

  const isEditMode = Boolean(holidayData && holidayData.id);

  useEffect(() => {
    if (show) {
      if (isEditMode && holidayData) {
        setFormData({ 
          name: holidayData.name || '', 
          date: holidayData.date || '', 
          type: holidayData.type || 'Regular Holiday' 
        });
      } else {
        setFormData(initialFormState);
      }
      setErrors({});
    }
  }, [holidayData, show, isEditMode]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Holiday name is required.';
    }
    if (!formData.date) {
      newErrors.date = 'Date is required.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault(); 
    if (validate()) {
      onSave(formData, holidayData?.id);
    }
  };

  if (!show) return null;

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content holiday-form-modal">
          <form onSubmit={handleSubmit} noValidate>
            <div className="modal-header">
              <h5 className="modal-title">{isEditMode ? 'Edit Holiday' : 'Add New Holiday'}</h5>
              <button type="button" className="btn-close" onClick={onClose}></button>
            </div>
            <div className="modal-body">
              <div className="mb-3">
                <label htmlFor="name" className="form-label">Holiday Name*</label>
                <input type="text" className={`form-control ${errors.name ? 'is-invalid' : ''}`} id="name" name="name" value={formData.name} onChange={handleChange} required />
                {errors.name && <div className="invalid-feedback">{errors.name}</div>}
              </div>
              <div className="mb-3">
                <label htmlFor="date" className="form-label">Date*</label>
                <input type="date" className={`form-control ${errors.date ? 'is-invalid' : ''}`} id="date" name="date" value={formData.date} onChange={handleChange} required />
                {errors.date && <div className="invalid-feedback">{errors.date}</div>}
              </div>
              <div className="mb-3">
                <label htmlFor="type" className="form-label">Type*</label>
                <select className="form-select" id="type" name="type" value={formData.type} onChange={handleChange}>
                  <option value="Regular Holiday">Regular Holiday</option>
                  <option value="Special Non-Working Day">Special Non-Working Day</option>
                </select>
                <div className="form-text mt-2">
                    <strong>Pay Rule:</strong> {formData.type === 'Regular Holiday' ? 'Double Pay (200%)' : 'Additional 30% Pay'}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-success">{isEditMode ? 'Save Changes' : 'Add Holiday'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddEditHolidayModal;
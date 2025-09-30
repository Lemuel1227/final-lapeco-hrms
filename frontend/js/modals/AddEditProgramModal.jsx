import React, { useState, useEffect } from 'react';
import './AddEditProgramModal.css';

const AddEditProgramModal = ({ show, onClose, onSave, programData }) => {
  const initialFormState = { 
    title: '', 
    description: '', 
    provider: '', 
    duration: '',
    start_date: '',
    end_date: '',
    status: 'Draft',
    cost: '',
    location: '',
    type: '',
    max_participants: '',
    requirements: ''
  };
  const [formData, setFormData] = useState(initialFormState);
  const [errors, setErrors] = useState({});

  const isEditMode = Boolean(programData && programData.id);

  useEffect(() => {
    if (show) {
      if (isEditMode) {
        setFormData({ ...initialFormState, ...programData });
      } else {
        setFormData(initialFormState);
      }
      setErrors({});
    }
  }, [programData, show, isEditMode]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.title.trim()) newErrors.title = 'Program title is required.';
    if (!formData.description.trim()) newErrors.description = 'Description is required.';
    if (!formData.provider.trim()) newErrors.provider = 'Training provider is required.';
    if (!formData.duration.trim()) newErrors.duration = 'Duration is required.';
    if (!formData.start_date) newErrors.start_date = 'Start date is required.';
    if (!formData.end_date) newErrors.end_date = 'End date is required.';
    if (!formData.type.trim()) newErrors.type = 'Training type is required.';
    
    if (formData.start_date && formData.end_date && formData.start_date > formData.end_date) {
      newErrors.end_date = 'End date must be after start date.';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSave(formData, programData?.id);
    }
  };

  if (!show) return null;

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div className="modal-dialog modal-dialog-centered modal-xl">
        <div className="modal-content program-form-modal">
          <form onSubmit={handleSubmit} noValidate>
            <div className="modal-header">
              <h5 className="modal-title">{isEditMode ? 'Edit Training Program' : 'Add New Training Program'}</h5>
              <button type="button" className="btn-close" onClick={onClose}></button>
            </div>
            <div className="modal-body">
              <div className="row">
                <div className="col-md-8 mb-3">
                  <label htmlFor="title" className="form-label">Program Title*</label>
                  <input type="text" className={`form-control ${errors.title ? 'is-invalid' : ''}`} id="title" name="title" value={formData.title} onChange={handleChange} required />
                  {errors.title && <div className="invalid-feedback">{errors.title}</div>}
                </div>
                <div className="col-md-4 mb-3">
                  <label htmlFor="status" className="form-label">Status*</label>
                  <select className="form-select" id="status" name="status" value={formData.status} onChange={handleChange}>
                    <option value="Draft">Draft</option>
                    <option value="Active">Active</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
              
              <div className="mb-3">
                <label htmlFor="description" className="form-label">Description*</label>
                <textarea className={`form-control ${errors.description ? 'is-invalid' : ''}`} id="description" name="description" rows="4" value={formData.description} onChange={handleChange} required></textarea>
                {errors.description && <div className="invalid-feedback">{errors.description}</div>}
              </div>
              
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label htmlFor="provider" className="form-label">Provider*</label>
                  <input type="text" className={`form-control ${errors.provider ? 'is-invalid' : ''}`} id="provider" name="provider" value={formData.provider} onChange={handleChange} required />
                  {errors.provider && <div className="invalid-feedback">{errors.provider}</div>}
                </div>
                <div className="col-md-6 mb-3">
                  <label htmlFor="type" className="form-label">Training Type*</label>
                  <input type="text" className={`form-control ${errors.type ? 'is-invalid' : ''}`} id="type" name="type" value={formData.type} onChange={handleChange} placeholder="e.g., Online, In-person, Hybrid" required />
                  {errors.type && <div className="invalid-feedback">{errors.type}</div>}
                </div>
              </div>
              
              <div className="row">
                <div className="col-md-4 mb-3">
                  <label htmlFor="duration" className="form-label">Duration*</label>
                  <input type="text" className={`form-control ${errors.duration ? 'is-invalid' : ''}`} id="duration" name="duration" value={formData.duration} onChange={handleChange} placeholder="e.g., 2 weeks, 8 hours" required />
                  {errors.duration && <div className="invalid-feedback">{errors.duration}</div>}
                </div>
                <div className="col-md-4 mb-3">
                  <label htmlFor="start_date" className="form-label">Start Date*</label>
                  <input type="date" className={`form-control ${errors.start_date ? 'is-invalid' : ''}`} id="start_date" name="start_date" value={formData.start_date} onChange={handleChange} required />
                  {errors.start_date && <div className="invalid-feedback">{errors.start_date}</div>}
                </div>
                <div className="col-md-4 mb-3">
                  <label htmlFor="end_date" className="form-label">End Date*</label>
                  <input type="date" className={`form-control ${errors.end_date ? 'is-invalid' : ''}`} id="end_date" name="end_date" value={formData.end_date} onChange={handleChange} required />
                  {errors.end_date && <div className="invalid-feedback">{errors.end_date}</div>}
                </div>
              </div>
              
              <div className="row">
                <div className="col-md-4 mb-3">
                  <label htmlFor="cost" className="form-label">Cost</label>
                  <div className="input-group">
                    <span className="input-group-text">₱</span>
                    <input type="number" className="form-control" id="cost" name="cost" value={formData.cost} onChange={handleChange} placeholder="0.00" step="0.01" min="0" />
                  </div>
                </div>
                <div className="col-md-4 mb-3">
                  <label htmlFor="max_participants" className="form-label">Max Participants</label>
                  <input type="number" className="form-control" id="max_participants" name="max_participants" value={formData.max_participants} onChange={handleChange} placeholder="Unlimited" min="1" />
                </div>
                <div className="col-md-4 mb-3">
                  <label htmlFor="location" className="form-label">Location</label>
                  <input type="text" className="form-control" id="location" name="location" value={formData.location} onChange={handleChange} placeholder="e.g., Conference Room A, Online" />
                </div>
              </div>
              
              <div className="mb-3">
                <label htmlFor="requirements" className="form-label">Requirements</label>
                <textarea className="form-control" id="requirements" name="requirements" rows="3" value={formData.requirements} onChange={handleChange} placeholder="Prerequisites, materials needed, etc."></textarea>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-success">{isEditMode ? 'Save Changes' : 'Add Program'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddEditProgramModal;
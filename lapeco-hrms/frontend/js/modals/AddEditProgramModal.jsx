import React, { useState, useEffect } from 'react';
import './AddEditProgramModal.css';

const AddEditProgramModal = ({ show, onClose, onSave, programData }) => {
  const initialFormState = { 
    title: '', 
    description: '', 
    // structured duration fields: daily time + total period
    daily_hours: '',
    daily_minutes: '',
    required_days: '',
    location: '',
    type: 'Online',
    max_participants: '',
    requirements: ''
  };
  const [formData, setFormData] = useState(initialFormState);
  const [errors, setErrors] = useState({});

  const isEditMode = Boolean(programData && programData.id);

  // Parser to prefill structured duration from existing strings
  // Supports examples: "Daily: 3 hours, Required Days: 12",
  // legacy formats: "10 days, 2 hours", "2 months, 1 hour 30 minutes per day",
  // "Daily: 3 hours, Period: 12 days"
  const parseDuration = (text) => {
    if (!text || typeof text !== 'string') {
      return { daily_hours: '', daily_minutes: '', required_days: '' };
    }
    const s = text.trim().toLowerCase();
    // find required days (preferred)
    let required_days = '';
    const reqMatch = s.match(/required\s*days:\s*(\d+)/);
    if (reqMatch) {
      required_days = reqMatch[1];
    } else {
      // fallback: extract period value and unit and convert to days
      const periodMatch = s.match(/(\d+)\s*(day|days|month|months)/);
      if (periodMatch) {
        const value = parseInt(periodMatch[1], 10);
        const unit = periodMatch[2];
        if (Number.isFinite(value)) {
          required_days = unit.startsWith('month') ? String(value * 30) : String(value);
        }
      }
    }

    // find daily time
    const hoursMatch = s.match(/(\d+)\s*hour|hours/);
    let daily_hours = '';
    if (hoursMatch && Array.isArray(hoursMatch)) {
      // regex alternation behavior; ensure correct group handling
      const hm = s.match(/(\d+)\s*(?:hour|hours)/);
      daily_hours = hm ? hm[1] : '';
    }
    const minutesMatch = s.match(/(\d+)\s*(?:minute|minutes)/);
    const daily_minutes = minutesMatch ? minutesMatch[1] : '';

    return { daily_hours, daily_minutes, required_days };
  };

  useEffect(() => {
    if (show) {
      if (isEditMode) {
        const parsed = parseDuration(programData?.duration);
        setFormData({ ...initialFormState, ...programData, ...parsed });
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
    if (!formData.title?.trim()) newErrors.title = 'Program title is required.';
    if (!formData.description?.trim()) newErrors.description = 'Description is required.';
    // Required Days
    if (!String(formData.required_days).toString().trim()) newErrors.required_days = 'Required days is required.';
    const rd = Number(formData.required_days);
    if (!(rd > 0)) newErrors.required_days = 'Required days must be greater than 0.';

    // Daily time: both fields required; hours > 0, minutes 0-59
    const hours = formData.daily_hours;
    const minutes = formData.daily_minutes;
    if (hours === '' || hours === null || hours === undefined) {
      newErrors.daily_hours = 'Daily hours is required.';
    } else if (!(Number(hours) > 0)) {
      newErrors.daily_hours = 'Daily hours must be greater than 0.';
    }
    if (minutes === '' || minutes === null || minutes === undefined) {
      newErrors.daily_minutes = 'Daily minutes is required.';
    } else {
      const m = Number(minutes);
      if (!(m >= 0 && m <= 59)) newErrors.daily_minutes = 'Daily minutes must be between 0 and 59.';
    }

    // Type, Location, Capacity, Requirements are required
    if (!formData.type?.trim()) newErrors.type = 'Training type is required.';
    if (!formData.location?.trim()) newErrors.location = 'Location is required.';
    const mpVal = formData.max_participants;
    if (mpVal === '' || mpVal === null || mpVal === undefined) {
      newErrors.max_participants = 'Max participants is required.';
    } else if (!(Number(mpVal) >= 1)) {
      newErrors.max_participants = 'Max participants must be at least 1.';
    }
    if (!formData.requirements?.trim()) newErrors.requirements = 'Requirements are required.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    const { provider, start_date, end_date, cost, daily_hours, daily_minutes, required_days, ...payload } = formData;
    const dh = Number(daily_hours);
    const dm = Number(daily_minutes);
    const dailyPart = `${dh > 0 ? `${dh} ${dh === 1 ? 'hour' : 'hours'}` : ''}${dh > 0 && dm > 0 ? ' ' : ''}${dm > 0 ? `${dm} ${dm === 1 ? 'minute' : 'minutes'}` : ''}`.trim();
    const reqDays = Number(required_days);
    const requiredPart = isNaN(reqDays) ? '' : `Required Days: ${reqDays}`;
    const dailyLabel = dailyPart ? `${dailyPart} per day` : '';
    payload.duration = [dailyLabel, requiredPart].filter(Boolean).join('; ');
    // Strongly type numeric field
    payload.max_participants = Number(payload.max_participants);

    // Ensure type is present and valid fallback (should be set by validation)
    if (!payload.type) payload.type = 'Online';

    onSave(payload, programData?.id);
  };

  if (!show) return null;

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div className="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable program-form-dialog">
        <div className="modal-content program-form-modal">
          <form onSubmit={handleSubmit} noValidate>
            <div className="modal-header">
              <h5 className="modal-title">{isEditMode ? 'Edit Training Program' : 'Add New Training Program'}</h5>
              <button type="button" className="btn-close" onClick={onClose}></button>
            </div>
            <div className="modal-body">
              {/* Basic Info */}
              <div className="form-section">
                <div className="section-title">Basic Information</div>
                <p className="section-subtitle">Name and describe the training program.</p>
                <div className="row">
                  <div className="col-md-12 mb-3">
                    <label htmlFor="title" className="form-label">Program Title*</label>
                    <div className="input-group">
                      <span className="input-group-text"><i className="bi bi-journal-text"></i></span>
                      <input type="text" className={`form-control ${errors.title ? 'is-invalid' : ''}`} id="title" name="title" value={formData.title} onChange={handleChange} placeholder="e.g., Leadership Essentials" required />
                      {errors.title && <div className="invalid-feedback">{errors.title}</div>}
                    </div>
                  </div>
                </div>

                <div className="mb-3">
                  <label htmlFor="description" className="form-label">Description*</label>
                  <textarea className={`form-control ${errors.description ? 'is-invalid' : ''}`} id="description" name="description" rows="4" value={formData.description} onChange={handleChange} placeholder="Brief overview, objectives, and topics covered" required></textarea>
                  {errors.description && <div className="invalid-feedback">{errors.description}</div>}
                  <div className="helper-text mt-1">Keep it concise and informative for employees.</div>
                </div>
              </div>

              {/* Configuration */}
              <div className="form-section">
                <div className="section-title">Configuration</div>
                <p className="section-subtitle">Choose type and set capacity and location.</p>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label htmlFor="type" className="form-label">Training Type*</label>
                    <div className="input-group">
                      <span className="input-group-text"><i className="bi bi-stack"></i></span>
                      <select
                        className={`form-select ${errors.type ? 'is-invalid' : ''}`}
                        id="type"
                        name="type"
                        value={formData.type}
                        onChange={handleChange}
                        required
                      >
                        <option value="Online">Online</option>
                        <option value="In-person">In-person</option>
                        <option value="Hybrid">Hybrid</option>
                      </select>
                      {errors.type && <div className="invalid-feedback">{errors.type}</div>}
                    </div>
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Daily Time*</label>
                    <div className="d-flex gap-2 align-items-start">
                      <div className="input-group">
                        <span className="input-group-text"><i className="bi bi-clock"></i></span>
                        <input
                          type="number"
                          className={`form-control ${errors.daily_hours ? 'is-invalid' : ''}`}
                          id="daily_hours"
                          name="daily_hours"
                          value={formData.daily_hours}
                          onChange={handleChange}
                          placeholder="Hours"
                          min="0"
                          required
                        />
                        <span className="input-group-text">hrs</span>
                      </div>
                      <div className="input-group">
                        <input
                          type="number"
                          className={`form-control ${errors.daily_minutes ? 'is-invalid' : ''}`}
                          id="daily_minutes"
                          name="daily_minutes"
                          value={formData.daily_minutes}
                          onChange={handleChange}
                          placeholder="Minutes"
                          min="0"
                          max="59"
                          required
                        />
                        <span className="input-group-text">mins</span>
                      </div>
                    </div>
                    {errors.daily_hours && <div className="invalid-feedback d-block">{errors.daily_hours}</div>}
                    {errors.daily_minutes && <div className="invalid-feedback d-block">{errors.daily_minutes}</div>}
                  </div>

                  <div className="col-md-6 mb-3">
                    <label className="form-label">Required Days*</label>
                    <div className="input-group">
                      <span className="input-group-text"><i className="bi bi-calendar-check"></i></span>
                      <input
                        type="number"
                        className={`form-control ${errors.required_days ? 'is-invalid' : ''}`}
                        id="required_days"
                        name="required_days"
                        value={formData.required_days}
                        onChange={handleChange}
                        placeholder="e.g., 10"
                        min="1"
                        required
                      />
                      {errors.required_days && (
                        <div className="invalid-feedback d-block">
                          {errors.required_days}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label htmlFor="max_participants" className="form-label">Max Participants*</label>
                    <div className="input-group">
                      <span className="input-group-text"><i className="bi bi-people"></i></span>
                      <input type="number" className={`form-control ${errors.max_participants ? 'is-invalid' : ''}`} id="max_participants" name="max_participants" value={formData.max_participants} onChange={handleChange} placeholder="e.g., 25" min="1" required />
                    </div>
                    {errors.max_participants && <div className="invalid-feedback d-block">{errors.max_participants}</div>}
                  </div>
                  <div className="col-md-6 mb-3">
                    <label htmlFor="location" className="form-label">Location*</label>
                    <div className="input-group">
                      <span className="input-group-text"><i className="bi bi-geo-alt"></i></span>
                      <input type="text" className={`form-control ${errors.location ? 'is-invalid' : ''}`} id="location" name="location" value={formData.location} onChange={handleChange} placeholder="e.g., Conference Room A, Online" required />
                    </div>
                    {errors.location && <div className="invalid-feedback d-block">{errors.location}</div>}
                  </div>
                </div>
              </div>

              {/* Requirements */}
              <div className="form-section">
                <div className="section-title">Requirements</div>
                <p className="section-subtitle">List prerequisites or materials needed.</p>
                <label htmlFor="requirements" className="form-label">Requirements*</label>
                <textarea className={`form-control ${errors.requirements ? 'is-invalid' : ''}`} id="requirements" name="requirements" rows="3" value={formData.requirements} onChange={handleChange} placeholder="Prerequisites, materials needed, etc." required></textarea>
                {errors.requirements && <div className="invalid-feedback d-block">{errors.requirements}</div>}
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
import React, { useState, useEffect } from 'react';

const ScheduleInterviewModal = ({ show, onClose, onSave, applicant }) => {
  const [formData, setFormData] = useState({
    interview_date: '',
    interview_time: '',
    interviewer: '',
    location: '',
    notes: ''
  });
  const [errors, setErrors] = useState({});

  // Function to convert 12-hour format to 24-hour format
  const convertTo24Hour = (time12h) => {
    if (!time12h) return '';
    
    // Check if it's already in 24-hour format
    if (!time12h.includes('AM') && !time12h.includes('PM')) {
      return time12h;
    }
    
    const [time, modifier] = time12h.split(' ');
    let [hours, minutes] = time.split(':');
    
    if (hours === '12') {
      hours = '00';
    }
    
    if (modifier === 'PM') {
      hours = parseInt(hours, 10) + 12;
    }
    
    return `${hours.toString().padStart(2, '0')}:${minutes}`;
  };

  // Populate form with existing interview schedule data when modal opens
  useEffect(() => {
    if (show && applicant?.interview_schedule) {
      const schedule = applicant.interview_schedule;
      // Format time to HH:MM format if it exists
      let formattedTime = schedule.time || '';
      
      // Convert from 12-hour to 24-hour format if needed
      formattedTime = convertTo24Hour(formattedTime);
      
      // Handle HHMM format (without colon)
      if (formattedTime && !formattedTime.includes(':') && formattedTime.length === 4) {
        formattedTime = formattedTime.substring(0, 2) + ':' + formattedTime.substring(2);
      }
      
      setFormData({
        interview_date: schedule.date || '',
        interview_time: formattedTime,
        interviewer: schedule.interviewer || '',
        location: schedule.location || '',
        notes: schedule.notes || ''
      });
    } else if (show) {
      // Reset form when opening modal without existing data
      setFormData({
        interview_date: '',
        interview_time: '',
        interviewer: '',
        location: '',
        notes: ''
      });
    }
  }, [show, applicant]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.interview_date) {
      newErrors.interview_date = 'Interview date is required';
    }
    if (!formData.interview_time) {
      newErrors.interview_time = 'Interview time is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) {
      return;
    }
    onSave(formData);
    onClose();
  };

  if (!show) return null;

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Schedule Interview for {applicant.full_name || applicant.name}</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            <p>Schedule an interview for this applicant.</p>
            
            <div className="mb-3">
              <label htmlFor="interview_date" className="form-label">Interview Date*</label>
              <input
                type="date"
                className={`form-control ${errors.interview_date ? 'is-invalid' : ''}`}
                id="interview_date"
                value={formData.interview_date}
                onChange={(e) => handleInputChange('interview_date', e.target.value)}
              />
              {errors.interview_date && <div className="invalid-feedback">{errors.interview_date}</div>}
            </div>

            <div className="mb-3">
              <label htmlFor="interview_time" className="form-label">Interview Time*</label>
              <input
                type="time"
                className={`form-control ${errors.interview_time ? 'is-invalid' : ''}`}
                id="interview_time"
                value={formData.interview_time}
                onChange={(e) => handleInputChange('interview_time', e.target.value)}
              />
              {errors.interview_time && <div className="invalid-feedback">{errors.interview_time}</div>}
            </div>

            <div className="mb-3">
              <label htmlFor="interviewer" className="form-label">Interviewer</label>
              <input
                type="text"
                className={`form-control ${errors.interviewer ? 'is-invalid' : ''}`}
                id="interviewer"
                value={formData.interviewer}
                onChange={(e) => handleInputChange('interviewer', e.target.value)}
                placeholder="Enter interviewer name"
              />
              {errors.interviewer && <div className="invalid-feedback">{errors.interviewer}</div>}
            </div>

            <div className="mb-3">
              <label htmlFor="location" className="form-label">Location</label>
              <input
                type="text"
                className="form-control"
                id="location"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                placeholder="Enter interview location"
              />
            </div>

            <div className="mb-3">
              <label htmlFor="notes" className="form-label">Notes</label>
              <textarea
                className="form-control"
                id="notes"
                rows="3"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Additional notes for the interview"
              ></textarea>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline-secondary" onClick={onClose}>Cancel</button>
            <button type="button" className="btn btn-primary" onClick={handleSave}>Save Schedule</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScheduleInterviewModal;
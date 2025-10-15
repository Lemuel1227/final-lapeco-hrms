import React, { useState } from 'react';

const SelectDateForScheduleModal = ({ show, onClose, onProceed, existingScheduleDates }) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [error, setError] = useState('');

  const handleProceed = () => {
    if (!selectedDate) {
      setError('You must select a date to proceed.');
      return;
    }
    if (existingScheduleDates.has(selectedDate)) {
      setError(`A schedule already exists for ${selectedDate}. Please choose a different date.`);
      return;
    }
    onProceed(selectedDate);
    onClose();
  };

  const handleDateChange = (e) => {
    setSelectedDate(e.target.value);
    if (error) {
      setError('');
    }
  };
  
  const handleClose = () => {
    setError('');
    setSelectedDate(new Date().toISOString().split('T')[0]);
    onClose();
  }

  if (!show) {
    return null;
  }

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Select Date for New Schedule</h5>
            <button type="button" className="btn-close" onClick={handleClose} aria-label="Close"></button>
          </div>
          <div className="modal-body">
            <p>Please select a date to create this schedule for.</p>
            <div className="mb-3">
              <label htmlFor="scheduleDate" className="form-label fw-bold">Schedule Date*</label>
              <input 
                type="date" 
                className={`form-control ${error ? 'is-invalid' : ''}`} 
                id="scheduleDate" 
                value={selectedDate} 
                onChange={handleDateChange} 
              />
              {error && <div className="invalid-feedback d-block">{error}</div>}
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline-secondary" onClick={handleClose}>Cancel</button>
            <button type="button" className="btn btn-success" onClick={handleProceed}>
              Proceed to Builder <i className="bi bi-arrow-right"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SelectDateForScheduleModal;
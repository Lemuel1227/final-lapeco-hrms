import React, { useState, useEffect } from 'react';
import { formatDate as formatMDY } from '../utils/dateUtils';

const EditAttendanceModal = ({ show, onClose, onSave, attendanceRecord }) => {
  const [formData, setFormData] = useState({
    signIn: '',
    breakOut: '',
    breakIn: '',
    signOut: '',
    ot_hours: 0,
  });

  useEffect(() => {
    if (attendanceRecord) {
      const otHours = attendanceRecord.otHours || attendanceRecord.ot_hours || 0;
      setFormData({
        signIn: attendanceRecord.timeIn || attendanceRecord.signIn || '',
        breakOut: attendanceRecord.breakOut || '',
        breakIn: attendanceRecord.breakIn || '',
        signOut: attendanceRecord.timeOut || attendanceRecord.signOut || '',
        ot_hours: parseInt(otHours, 10) || 0,
      });
    }
  }, [attendanceRecord]);

  if (!show || !attendanceRecord) {
    return null;
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Handle ot_hours specially to ensure it's always a valid number
    if (name === 'ot_hours') {
      if (value === '') {
        setFormData(prev => ({ ...prev, [name]: '' }));
        return;
      }
      const numValue = parseInt(value, 10);
      setFormData(prev => ({ ...prev, [name]: isNaN(numValue) ? 0 : numValue }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = { ...formData, ot_hours: Number(formData.ot_hours || 0) };
    onSave(attendanceRecord.id, attendanceRecord.date, payload);
  };

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <form onSubmit={handleSubmit}>
            <div className="modal-header">
              <h5 className="modal-title">Edit Time Log for {attendanceRecord.employeeName || attendanceRecord.name}</h5>
              <button type="button" className="btn-close" onClick={onClose} aria-label="Close"></button>
            </div>
            <div className="modal-body">
              <p className="text-muted">Editing attendance for {formatMDY(new Date(attendanceRecord.date + 'T00:00:00'), 'long')}.</p>
              <div className="row g-3">
                <div className="col-md-6 mb-3">
                  <label htmlFor="signIn" className="form-label">Time-In</label>
                  <input type="time" id="signIn" name="signIn" className="form-control" value={formData.signIn} onChange={handleChange} />
                </div>
                <div className="col-md-6 mb-3">
                  <label htmlFor="signOut" className="form-label">Time-Out</label>
                  <input type="time" id="signOut" name="signOut" className="form-control" value={formData.signOut} onChange={handleChange} />
                </div>
                <div className="col-md-6 mb-3">
                  <label htmlFor="breakOut" className="form-label">Break Out</label>
                  <input type="time" id="breakOut" name="breakOut" className="form-control" value={formData.breakOut} onChange={handleChange} />
                </div>
                <div className="col-md-6 mb-3">
                  <label htmlFor="breakIn" className="form-label">Break In</label>
                  <input type="time" id="breakIn" name="breakIn" className="form-control" value={formData.breakIn} onChange={handleChange} />
                </div>
                <div className="col-12 mb-3">
                    <label htmlFor="ot_hours" className="form-label">Overtime (hrs)</label>
                    <input type="number" min="0" id="ot_hours" name="ot_hours" className="form-control" value={formData.ot_hours} onChange={handleChange} />
                    <small className="form-text text-muted">Manually enter approved overtime hours.</small>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-success">Save Changes</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditAttendanceModal;

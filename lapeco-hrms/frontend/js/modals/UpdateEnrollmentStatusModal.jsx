import React, { useState, useEffect } from 'react';

const UpdateEnrollmentStatusModal = ({ show, onClose, onSave, enrollmentData }) => {
  const [status, setStatus] = useState('');
  const [progress, setProgress] = useState(0);
  
  useEffect(() => {
    if (enrollmentData) {
      setStatus(enrollmentData.status);
      setProgress(enrollmentData.progress || 0);
    }
  }, [enrollmentData]);

  const handleStatusChange = (e) => {
    const newStatus = e.target.value;
    setStatus(newStatus);
    
    // Enforce status-progress consistency rules
    if (newStatus === 'Completed') {
      setProgress(100);
    } else if (newStatus === 'Not Started') {
      setProgress(0);
    } else if (newStatus === 'In Progress' && progress === 0) {
      setProgress(10);
    }
  };

  const handleProgressChange = (e) => {
    const raw = e.target.value;
    if (raw === '') {
      setProgress('');
      return;
    }
    const newProgress = Number(raw);
    setProgress(newProgress);
    if (!isNaN(newProgress)) {
      if (newProgress === 0 && status !== 'Not Started') {
        setStatus('Not Started');
      } else if (newProgress === 100 && status !== 'Completed') {
        setStatus('Completed');
      } else if (newProgress > 0 && newProgress < 100 && status !== 'In Progress') {
        setStatus('In Progress');
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const p = Number(progress || 0);
    const clamped = Math.max(0, Math.min(100, isNaN(p) ? 0 : p));
    onSave(enrollmentData.enrollmentId, { status, progress: clamped });
    onClose();
  };

  if (!show) return null;

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <form onSubmit={handleSubmit}>
            <div className="modal-header"><h5 className="modal-title">Update Status for {enrollmentData?.employeeName}</h5><button type="button" className="btn-close" onClick={onClose}></button></div>
            <div className="modal-body">
              <div className="mb-3">
                <label htmlFor="status" className="form-label fw-bold">Enrollment Status</label>
                <select id="status" className="form-select" value={status} onChange={handleStatusChange}>
                  <option value="Not Started">Not Started</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
              <div className="mb-3">
                <label htmlFor="progress" className="form-label fw-bold">Progress (%)</label>
                <input 
                  type="number" 
                  id="progress" 
                  className="form-control" 
                  value={progress} 
                  min="0" 
                  max="100" 
                  onChange={handleProgressChange}
                />
              </div>
            </div>
            <div className="modal-footer"><button type="button" className="btn btn-outline-secondary" onClick={onClose}>Cancel</button><button type="submit" className="btn btn-primary">Save Status</button></div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default UpdateEnrollmentStatusModal;

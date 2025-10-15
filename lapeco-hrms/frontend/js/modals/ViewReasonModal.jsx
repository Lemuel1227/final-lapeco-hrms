import React from 'react';

const ViewReasonModal = ({ show, onClose, request }) => {
  if (!show || !request) {
    return null;
  }

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Leave Request Reason</h5>
            <button type="button" className="btn-close" onClick={onClose} aria-label="Close"></button>
          </div>
          <div className="modal-body">
            <p className="mb-1"><strong>Employee:</strong> {request.name} ({request.empId})</p>
            <p><strong>Leave Type:</strong> {request.leaveType}</p>
            <hr />
            <p className="text-muted">{request.reason || "No reason provided."}</p>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline-secondary" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewReasonModal;
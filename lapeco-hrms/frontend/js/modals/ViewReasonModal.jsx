import React from 'react';

const ViewReasonModal = ({ show, onClose, request, title = 'Request Reason' }) => {
  if (!show || !request) {
    return null;
  }

  const {
    name,
    empId,
    employeeName,
    employeeId,
    leaveType,
    type,
    reason,
    description,
    submittedByName,
  } = request;

  const displayName = name ?? employeeName ?? 'Unknown';
  const displayId = empId ?? employeeId ?? 'N/A';
  const displayType = leaveType ?? type ?? null;
  const displayReason = reason ?? 'No reason provided.';
  const displayDescription = description ?? null;

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{title}</h5>
            <button type="button" className="btn-close" onClick={onClose} aria-label="Close"></button>
          </div>
          <div className="modal-body">
            <p className="mb-1"><strong>Employee:</strong> {displayName} ({displayId})</p>
            {submittedByName && <p className="mb-1"><strong>Submitted By:</strong> {submittedByName}</p>}
            {displayType && <p><strong>Type:</strong> {displayType}</p>}
            <hr />
            <p className="text-muted mb-2">{displayReason}</p>
            {displayDescription && <p className="text-muted small mb-0">{displayDescription}</p>}
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
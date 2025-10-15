import React from 'react';

const AccountGeneratedModal = ({ show, onClose, accountDetails }) => {
  if (!show || !accountDetails) return null;

  const handleCopyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      alert(`${text} copied to clipboard!`);
    }).catch(err => {
      console.error('Failed to copy text: ', err);
    });
  };

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header bg-success text-white">
            <h5 className="modal-title"><i className="bi bi-check-circle-fill me-2"></i>Account Generated Successfully</h5>
            <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            <p>An account has been created for the new employee. Please securely share these credentials with them.</p>
            
            <div className="mb-3">
              <label className="form-label fw-bold">Username</label>
              <div className="input-group">
                <input type="text" className="form-control" value={accountDetails.username} readOnly />
                <button className="btn btn-outline-secondary" onClick={() => handleCopyToClipboard(accountDetails.username)}>
                  <i className="bi bi-clipboard"></i>
                </button>
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label fw-bold">Password</label>
              <div className="input-group">
                <input type="text" className="form-control" value={accountDetails.password} readOnly />
                <button className="btn btn-outline-secondary" onClick={() => handleCopyToClipboard(accountDetails.password)}>
                  <i className="bi bi-clipboard"></i>
                </button>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-primary" onClick={onClose}>Done</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountGeneratedModal;
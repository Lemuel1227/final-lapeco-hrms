import React, { useState, useMemo } from 'react';
import './ResetDataModal.css';

const DATA_CATEGORIES = [
  { key: 'employees', label: 'Employee Records' },
  { key: 'positions', label: 'Positions' },
  { key: 'schedules', label: 'Schedules & Attendance' },
  { key: 'leaveRequests', label: 'Leave Requests' },
  { key: 'applicants', label: 'Recruitment Data (Applicants & Job Openings)' },
  { key: 'performance', label: 'Performance Reviews (KRAs, KPIs, Evaluations)' },
  { key: 'training', label: 'Training Records (Programs & Enrollments)' },
  { key: 'disciplinaryCases', label: 'Disciplinary Cases' },
  { key: 'payrolls', label: 'Payroll History' },
  { key: 'holidays', label: 'Holidays' },
  { key: 'templates', label: 'Schedule Templates' },
  { key: 'userAccounts', label: 'User Accounts (Will log you out)' },
];

const ResetDataModal = ({ show, onClose, onConfirmReset }) => {
  const [step, setStep] = useState(1);
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [confirmationText, setConfirmationText] = useState('');

  const allKeys = useMemo(() => DATA_CATEGORIES.map(cat => cat.key), []);

  const handleCheckboxChange = (key, checked) => {
    if (checked) {
      setSelectedKeys(prev => [...prev, key]);
    } else {
      setSelectedKeys(prev => prev.filter(k => k !== key));
    }
  };

  const handleSelectAll = (checked) => {
    setSelectedKeys(checked ? allKeys : []);
  };
  
  const resetLocalState = () => {
    setStep(1);
    setSelectedKeys([]);
    setConfirmationText('');
  };

  const handleClose = () => {
    resetLocalState();
    onClose();
  };

  const handleConfirm = () => {
    if (confirmationText === 'DELETE') {
      const resetConfig = allKeys.reduce((acc, key) => {
        acc[key] = selectedKeys.includes(key);
        return acc;
      }, {});
      onConfirmReset(resetConfig);
      handleClose();
    }
  };

  if (!show) return null;

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Reset Application Data (Step {step} of 2)</h5>
            <button type="button" className="btn-close" onClick={handleClose}></button>
          </div>

          {step === 1 && (
            <>
              <div className="modal-body">
                <p className="text-muted">Select the data categories you wish to permanently reset to their original state.</p>
                <div className="form-check mb-2">
                  <input
                    className="form-check-input" type="checkbox"
                    id="selectAll"
                    checked={selectedKeys.length === allKeys.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                  <label className="form-check-label fw-bold" htmlFor="selectAll">
                    Select All / Deselect All
                  </label>
                </div>
                <hr />
                <div className="reset-options-list">
                  {DATA_CATEGORIES.map(cat => (
                    <div className="form-check" key={cat.key}>
                      <input
                        className="form-check-input" type="checkbox"
                        id={cat.key}
                        checked={selectedKeys.includes(cat.key)}
                        onChange={(e) => handleCheckboxChange(cat.key, e.target.checked)}
                      />
                      <label className="form-check-label" htmlFor={cat.key}>
                        {cat.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary" onClick={handleClose}>Cancel</button>
                <button type="button" className="btn btn-primary" disabled={selectedKeys.length === 0} onClick={() => setStep(2)}>
                  Proceed to Confirmation <i className="bi bi-arrow-right"></i>
                </button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="modal-body">
                <div className="alert alert-danger">
                  <strong>Final Confirmation:</strong> You are about to permanently delete the following data:
                </div>
                <ul className="list-group list-group-flush mb-3">
                  {DATA_CATEGORIES.filter(cat => selectedKeys.includes(cat.key)).map(cat => (
                    <li key={cat.key} className="list-group-item">{cat.label}</li>
                  ))}
                </ul>
                <p>This action cannot be undone. To confirm, please type <strong>DELETE</strong> into the box below.</p>
                <input
                  type="text"
                  className="form-control"
                  value={confirmationText}
                  onChange={(e) => setConfirmationText(e.target.value)}
                  placeholder='Type "DELETE" to confirm'
                  autoFocus
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary" onClick={() => setStep(1)}>Back</button>
                <button
                  type="button"
                  className="btn btn-danger"
                  disabled={confirmationText !== 'DELETE'}
                  onClick={handleConfirm}
                >
                  <i className="bi bi-trash-fill me-2"></i>Reset Selected Data
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetDataModal;
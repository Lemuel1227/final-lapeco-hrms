import React, { useState } from 'react';

const AddColumnModal = ({ show, onClose, onAdd }) => {
  const [columnName, setColumnName] = useState('');
  const [error, setError] = useState('');

  const handleAddClick = () => {
    if (!columnName.trim()) {
      setError('Column name cannot be empty.');
      return;
    }
    onAdd(columnName.trim());
    handleClose();
  };

  const handleClose = () => {
    setColumnName('');
    setError('');
    onClose();
  };

  if (!show) return null;

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Add New Column</h5>
            <button type="button" className="btn-close" onClick={handleClose}></button>
          </div>
          <div className="modal-body">
            <p className="text-muted">Enter a name for the new custom column you want to add to the report.</p>
            <div className="mb-3">
              <label htmlFor="columnName" className="form-label">Column Name*</label>
              <input
                type="text"
                className={`form-control ${error ? 'is-invalid' : ''}`}
                id="columnName"
                value={columnName}
                onChange={(e) => { setColumnName(e.target.value); setError(''); }}
                placeholder="e.g., Notes, Department Code"
                autoFocus
              />
              {error && <div className="invalid-feedback">{error}</div>}
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline-secondary" onClick={handleClose}>Cancel</button>
            <button type="button" className="btn btn-primary" onClick={handleAddClick}>Add Column</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddColumnModal;
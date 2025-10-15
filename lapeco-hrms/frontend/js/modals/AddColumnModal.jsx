import React, { useState } from 'react';

const AddColumnModal = ({ show, onClose, onAddColumn }) => {
  const [columnName, setColumnName] = useState('');
  const [error, setError] = useState('');

  const handleAdd = () => {
    if (!columnName.trim()) {
      setError('Column name cannot be empty.');
      return;
    }
    const columnKey = columnName.trim().toLowerCase().replace(/\s+/g, '_');
    onAddColumn({ key: columnKey, name: columnName.trim() });
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
            <h5 className="modal-title">Add Custom Column</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            <p>Add a new column to the schedule table (e.g., "Lunch Break", "Notes", "Task").</p>
            <div className="mb-3">
              <label htmlFor="columnName" className="form-label">Column Name*</label>
              <input
                type="text"
                className={`form-control ${error ? 'is-invalid' : ''}`}
                id="columnName"
                value={columnName}
                onChange={(e) => { setColumnName(e.target.value); setError(''); }}
                placeholder="Enter new column name"
              />
              {error && <div className="invalid-feedback">{error}</div>}
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline-secondary" onClick={onClose}>Cancel</button>
            <button type="button" className="btn btn-primary" onClick={handleAdd}>Add Column</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddColumnModal;
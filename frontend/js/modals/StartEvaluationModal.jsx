import React, { useState, useEffect } from 'react';
import Select from 'react-select';

const StartEvaluationModal = ({ show, onClose, onStart, employees }) => {
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [error, setError] = useState('');

  const employeeOptions = employees.map(e => ({ value: e.id, label: `${e.name} (${e.id})` }));

  useEffect(() => {
    if (show) {
      if (employees && employees.length === 1) {
        setSelectedEmployee(employeeOptions[0]);
      } else {
        setSelectedEmployee(null);
      }
      setPeriodStart('');
      setPeriodEnd('');
      setError('');
    }
  }, [show, employees]);

  const handleStart = () => {
    if (!selectedEmployee || !periodStart || !periodEnd) {
      setError('All fields are required.');
      return;
    }
    onStart({
      employeeId: selectedEmployee.value,
      periodStart,
      periodEnd,
    });
  };

  const handleClose = () => {
    onClose();
  };

  if (!show) return null;

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Start New Evaluation</h5>
            <button type="button" className="btn-close" onClick={handleClose}></button>
          </div>
          <div className="modal-body">
            <p className="text-muted">Select an employee and the performance review period.</p>
            {error && <div className="alert alert-danger py-2">{error}</div>}
            <div className="mb-3">
              <label htmlFor="employee" className="form-label">Employee*</label>
              <Select
                id="employee"
                options={employeeOptions}
                value={selectedEmployee}
                onChange={setSelectedEmployee}
                placeholder="Select an employee..."
                isClearable={employees.length > 1} 
                isDisabled={employees.length === 1}
                className="react-select-container"
                classNamePrefix="react-select"
              />
            </div>
            <div className="row g-3">
              <div className="col-md-6">
                <label htmlFor="periodStart" className="form-label">Period Start*</label>
                <input
                  type="date"
                  id="periodStart"
                  className="form-control"
                  value={periodStart}
                  onChange={e => setPeriodStart(e.target.value)}
                />
              </div>
              <div className="col-md-6">
                <label htmlFor="periodEnd" className="form-label">Period End*</label>
                <input
                  type="date"
                  id="periodEnd"
                  className="form-control"
                  value={periodEnd}
                  onChange={e => setPeriodEnd(e.target.value)}
                />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline-secondary" onClick={handleClose}>Cancel</button>
            <button type="button" className="btn btn-success" onClick={handleStart}>Proceed to Form</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StartEvaluationModal;
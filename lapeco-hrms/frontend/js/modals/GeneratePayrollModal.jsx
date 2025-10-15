import React, { useState, useEffect } from 'react';
import './GeneratePayrollModal.css';

const GeneratePayrollModal = ({ show, onClose, onGenerate, allEmployees, existingPayrolls }) => {
  const [step, setStep] = useState(1);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (show) {
      setStep(1);
      setStartDate('');
      setEndDate('');
      setSelectedEmployeeIds([]);
      setError('');
    }
  }, [show]);

  const handleNext = () => {
    setError('');
    if (step === 1) {
      if (!startDate || !endDate) {
        setError('Please select both a start and end date.');
        return;
      }
      if (new Date(endDate) < new Date(startDate)) {
        setError('End date cannot be before the start date.');
        return;
      }
      const cutOff = `${startDate} to ${endDate}`;
      if (existingPayrolls.some(p => p.cutOff === cutOff)) {
          setError('A payroll for this period already exists.');
          return;
      }
      setSelectedEmployeeIds(allEmployees.map(emp => emp.empId));
      setStep(2);
    } else if (step === 2) {
      if (selectedEmployeeIds.length === 0) {
        setError('Please select at least one employee.');
        return;
      }
      setStep(3);
    }
  };

  const handleBack = () => {
    setError('');
    setStep(prev => prev - 1);
  };

  const handleToggleEmployee = (empId) => {
    setSelectedEmployeeIds(prev =>
      prev.includes(empId) ? prev.filter(id => id !== empId) : [...prev, empId]
    );
  };

  const handleToggleAll = () => {
    if (selectedEmployeeIds.length === allEmployees.length) {
        setSelectedEmployeeIds([]);
    } else {
        setSelectedEmployeeIds(allEmployees.map(emp => emp.empId));
    }
  };

  const handleGenerate = () => {
    onGenerate({
      startDate,
      endDate,
      employeeIds: selectedEmployeeIds
    });
    onClose();
  };

  if (!show) return null;

  return (
    <div className="modal fade show d-block generate-payroll-modal" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Generate New Payroll (Step {step} of 3)</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            {error && <div className="alert alert-danger">{error}</div>}
            
            {step === 1 && (
              <div>
                <h6>Define Pay Period</h6>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label htmlFor="startDate" className="form-label">Start Date</label>
                    <input type="date" id="startDate" className="form-control" value={startDate} onChange={e => setStartDate(e.target.value)} />
                  </div>
                  <div className="col-md-6">
                    <label htmlFor="endDate" className="form-label">End Date</label>
                    <input type="date" id="endDate" className="form-control" value={endDate} onChange={e => setEndDate(e.target.value)} />
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <h6>Select Employees</h6>
                 <div className="form-check mb-2">
                    <input className="form-check-input" type="checkbox" id="selectAll"
                        checked={selectedEmployeeIds.length === allEmployees.length}
                        onChange={handleToggleAll}
                    />
                    <label className="form-check-label" htmlFor="selectAll">
                        Select All ({selectedEmployeeIds.length} / {allEmployees.length} selected)
                    </label>
                </div>
                <div className="employee-list-container">
                    <ul className="list-group">
                        {allEmployees.map(emp => (
                            <li key={emp.empId} className="list-group-item">
                                <div className="employee-info">
                                    <span className="employee-name">{emp.employeeName}</span>
                                    <span className="employee-id">{emp.empId}</span>
                                </div>
                                <input className="form-check-input" type="checkbox"
                                    checked={selectedEmployeeIds.includes(emp.empId)}
                                    onChange={() => handleToggleEmployee(emp.empId)}
                                />
                            </li>
                        ))}
                    </ul>
                </div>
              </div>
            )}

            {step === 3 && (
              <div>
                <h6>Confirmation</h6>
                <div className="summary-card">
                    <p>You are about to generate payroll for <strong>{selectedEmployeeIds.length} employee(s)</strong>.</p>
                    <p>Pay Period: <strong>{startDate}</strong> to <strong>{endDate}</strong>.</p>
                    <hr />
                    <p className="text-muted small">This will create "Pending" payroll records for each selected employee. You can adjust each record individually after generation.</p>
                </div>
              </div>
            )}
          </div>
          <div className="modal-footer">
            {step > 1 && <button type="button" className="btn btn-outline-secondary me-auto" onClick={handleBack}>Back</button>}
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            {step < 3 && <button type="button" className="btn btn-primary" onClick={handleNext}>Next</button>}
            {step === 3 && <button type="button" className="btn btn-success" onClick={handleGenerate}>Generate Payroll</button>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GeneratePayrollModal;
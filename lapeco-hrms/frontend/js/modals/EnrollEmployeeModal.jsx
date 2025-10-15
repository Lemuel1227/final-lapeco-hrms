import React, { useState, useMemo } from 'react';
import './EnrollEmployeeModal.css';

const EnrollEmployeeModal = ({ show, onClose, onEnroll, program, allEmployees, existingEnrollments }) => {
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]);

  const unassignedEmployees = useMemo(() => {
    const enrolledIds = new Set(existingEnrollments.map(e => e.employeeId));
    return allEmployees.filter(emp => !enrolledIds.has(emp.id));
  }, [allEmployees, existingEnrollments]);

  const handleToggleEmployee = (empId) => {
    setSelectedEmployeeIds(prev =>
      prev.includes(empId) ? prev.filter(id => id !== empId) : [...prev, empId]
    );
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (selectedEmployeeIds.length > 0) {
        onEnroll(program.id, selectedEmployeeIds);
        onClose();
    } else {
        alert("Please select at least one employee to enroll.");
    }
  };

  if (!show) return null;

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <form onSubmit={handleSubmit}>
            <div className="modal-header"><h5 className="modal-title">Enroll in: {program?.title}</h5><button type="button" className="btn-close" onClick={onClose}></button></div>
            <div className="modal-body">
              <p>Select employees to enroll in this program. Employees already enrolled are not shown.</p>
              <div className="employee-enroll-list">
                <ul className="list-group list-group-flush">
                  {unassignedEmployees.length > 0 ? unassignedEmployees.map(emp => (
                    <li key={emp.id} className="list-group-item d-flex justify-content-between align-items-center">
                      <span>{emp.name} ({emp.id})</span>
                      <input className="form-check-input" type="checkbox" checked={selectedEmployeeIds.includes(emp.id)} onChange={() => handleToggleEmployee(emp.id)} />
                    </li>
                  )) : (
                    <li className="list-group-item text-muted">All employees are already enrolled.</li>
                  )}
                </ul>
              </div>
            </div>
            <div className="modal-footer"><button type="button" className="btn btn-outline-secondary" onClick={onClose}>Cancel</button><button type="submit" className="btn btn-success">Enroll Selected</button></div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EnrollEmployeeModal;
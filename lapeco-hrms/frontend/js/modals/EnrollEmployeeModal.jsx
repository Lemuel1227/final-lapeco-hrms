import React, { useState, useMemo, useEffect } from 'react';
import './EnrollEmployeeModal.css';

const EnrollEmployeeModal = ({ show, onClose, onEnroll, program, allEmployees, existingEnrollments, employeeToEnroll }) => {
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  const isNominationMode = !!employeeToEnroll;

  const enrolledIdSet = useMemo(() => {
    if (isNominationMode) return new Set();

    return new Set(
      existingEnrollments
        .map(e => e.employeeId ?? e.user_id)
        .filter(id => id !== undefined && id !== null)
        .map(id => String(id))
    );
  }, [existingEnrollments, isNominationMode]);

  const unassignedEmployees = useMemo(() => {
    if (isNominationMode) return [];
    
    // Filter out enrolled employees and apply search
    return allEmployees
      .filter(emp => !enrolledIdSet.has(String(emp.id)))
      .filter(emp => {
        if (!searchTerm) return true;
        const searchLower = searchTerm.toLowerCase();
        return (
          emp.name?.toLowerCase().includes(searchLower) ||
          emp.id?.toString().includes(searchLower) ||
          emp.email?.toLowerCase().includes(searchLower)
        );
      });
  }, [allEmployees, enrolledIdSet, isNominationMode, searchTerm]);

  useEffect(() => {
    if (!show) {
      setSelectedEmployeeIds([]);
      setSearchTerm('');
    }
  }, [show]);

  useEffect(() => {
    if (show && !isNominationMode) {
      setSelectedEmployeeIds(prev => prev.filter(id => !enrolledIdSet.has(String(id))));
    }
  }, [show, enrolledIdSet, isNominationMode]);

  const handleToggleEmployee = (empId) => {
    setSelectedEmployeeIds(prev =>
      prev.includes(empId) ? prev.filter(id => id !== empId) : [...prev, empId]
    );
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (isNominationMode) {
      onEnroll(program.id, [employeeToEnroll.id]);
    } else {
      if (selectedEmployeeIds.length > 0) {
        onEnroll(program.id, selectedEmployeeIds);
      } else {
        alert("Please select at least one employee to enroll.");
        return;
      }
    }
    onClose();
  };

  if (!show || !program) return null;

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <form onSubmit={handleSubmit}>
            <div className="modal-header">
              <h5 className="modal-title">
                {isNominationMode ? `Nominate ${employeeToEnroll.name}` : `Enroll in: ${program.title}`}
              </h5>
              <button type="button" className="btn-close" onClick={onClose}></button>
            </div>
            <div className="modal-body">
              {isNominationMode ? (
                <p>Confirm nomination of <strong>{employeeToEnroll.name}</strong> for the training program: <strong>"{program.title}"</strong>?</p>
              ) : (
                <>
                  <p>Select employees to enroll in this program. Employees already enrolled are not shown.</p>
                  
                  {/* Search functionality */}
                  <div className="mb-3">
                    <div className="input-group">
                      <span className="input-group-text">
                        <i className="bi bi-search"></i>
                      </span>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Search by name, ID, or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="employee-enroll-list" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    <ul className="list-group list-group-flush">
                      {unassignedEmployees.length > 0 ? unassignedEmployees.map(emp => (
                        <li key={emp.id} className="list-group-item d-flex justify-content-between align-items-center">
                          <div>
                            <span className="fw-medium">{emp.name}</span>
                            <small className="text-muted d-block">ID: {emp.id}</small>
                            {emp.email && <small className="text-muted d-block">{emp.email}</small>}
                          </div>
                          <input 
                            className="form-check-input" 
                            type="checkbox" 
                            checked={selectedEmployeeIds.includes(emp.id)} 
                            onChange={() => handleToggleEmployee(emp.id)} 
                          />
                        </li>
                      )) : (
                        <li className="list-group-item text-muted text-center">
                          {searchTerm ? 'No employees found matching your search.' : 'All employees are already enrolled.'}
                        </li>
                      )}
                    </ul>
                  </div>
                  
                  {selectedEmployeeIds.length > 0 && (
                    <div className="mt-3">
                      <small className="text-success">
                        <i className="bi bi-check-circle-fill me-1"></i>
                        {selectedEmployeeIds.length} employee(s) selected
                      </small>
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-success">
                {isNominationMode ? 'Confirm Nomination' : 'Enroll Selected'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EnrollEmployeeModal;
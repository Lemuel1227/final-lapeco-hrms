import React, { useMemo } from 'react';
import Select from 'react-select';

const ProgramSelectionModal = ({ show, onClose, onSelect, programs, employee, enrollments }) => {

  const employeeEnrollmentIds = useMemo(() => {
    if (!employee || !enrollments) return new Set();
    return new Set(
      enrollments
        .filter(e => e.employeeId === employee.id)
        .map(e => e.programId)
    );
  }, [employee, enrollments]);

  const programOptions = useMemo(() => {
    return (programs || []).map(prog => ({
      value: prog.id,
      label: prog.title,
      program: prog,
      isEnrolled: employeeEnrollmentIds.has(prog.id)
    }));
  }, [programs, employeeEnrollmentIds]);

  const handleSelectChange = (selectedOption) => {
    if (selectedOption) {
      onSelect(selectedOption.program);
    }
  };
  
  const formatOptionLabel = ({ label, program, isEnrolled }) => (
    <div className="d-flex justify-content-between align-items-center">
      <div>
        <div style={{ fontWeight: 500 }}>{label}</div>
        <small className="text-muted">{program.provider}</small>
      </div>
      {isEnrolled && <span className="badge bg-success">Enrolled</span>}
    </div>
  );

  if (!show) return null;

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Select Program for {employee?.name}</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            <p className="text-muted">Choose a training program to nominate this employee for.</p>
            <Select
              options={programOptions}
              onChange={handleSelectChange}
              formatOptionLabel={formatOptionLabel}
              isOptionDisabled={(option) => option.isEnrolled}
              placeholder="Search for a training program..."
              className="react-select-container"
              classNamePrefix="react-select"
              menuPortalTarget={document.body}
              styles={{ menuPortal: base => ({ ...base, zIndex: 1056 }) }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgramSelectionModal;
import React, { useState, useMemo } from 'react';
import Select from 'react-select';

const AddEmployeeToPositionModal = ({ show, onClose, onSave, onConfirmReassignment, currentPosition, allEmployees, allPositions }) => {
  const [selectedEmployeeOption, setSelectedEmployeeOption] = useState(null);
  const [error, setError] = useState('');

  const positionsMap = useMemo(() => {
    return (allPositions || []).reduce((map, pos) => {
      map[pos.id] = pos.title;
      return map;
    }, {});
  }, [allPositions]);


  const employeeOptions = useMemo(() => {
    return (allEmployees || []).map(emp => {
      let label = `${emp.name} (${emp.id})`;
      let subLabel = 'Unassigned';
      let isDisabled = false;

      if (emp.positionId === currentPosition.id) {
        subLabel = `Already in this position`;
        isDisabled = true;
      } else if (emp.positionId) {
        subLabel = `Current: ${positionsMap[emp.positionId] || 'Other'}`;
      }

      return {
        value: emp.id,
        label: label,
        subLabel: subLabel,
        employee: emp,
        isDisabled: isDisabled,
      };
    });
  }, [allEmployees, currentPosition.id, positionsMap]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedEmployeeOption) {
      setError('Please select an employee to assign.');
      return;
    }
    const selectedEmployee = selectedEmployeeOption.employee;
    const currentPosTitle = positionsMap[selectedEmployee.positionId];

    if (selectedEmployee.positionId && selectedEmployee.positionId !== currentPosition.id) {
      // Close this modal first, then show confirmation
      onClose();
      // Use external confirmation handler instead of window.confirm
      onConfirmReassignment(
        selectedEmployee,
        currentPosTitle,
        currentPosition,
        () => {
          onSave(selectedEmployee.id, currentPosition.id);
        }
      );
    } else {
      onSave(selectedEmployee.id, currentPosition.id);
      onClose();
    }
  };

  const customFormatOptionLabel = ({ label, subLabel }) => (
    <div>
      <span>{label}</span>
      <span className="text-muted ms-2" style={{ fontSize: '0.8rem' }}>({subLabel})</span>
    </div>
  );

  const handleClose = () => {
    setSelectedEmployeeOption(null);
    setError('');
    onClose();
  }

  if (!show) return null;

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <form onSubmit={handleSubmit}>
            <div className="modal-header">
              <h5 className="modal-title">Assign Employee to {currentPosition?.title}</h5>
              <button type="button" className="btn-close" onClick={handleClose} aria-label="Close"></button>
            </div>
            <div className="modal-body">
              <p className="text-muted">Select an employee to assign to this position. If an employee is already assigned elsewhere, they will be re-assigned.</p>
              <div className="mb-3">
                <label htmlFor="employeeToAssign" className="form-label fw-bold">Employee*</label>
                <Select
                  id="employeeToAssign"
                  options={employeeOptions}
                  value={selectedEmployeeOption}
                  onChange={(option) => {
                    setSelectedEmployeeOption(option);
                    if (error) setError('');
                  }}
                  placeholder="Search by name or ID..."
                  isClearable
                  isOptionDisabled={(option) => option.isDisabled}
                  formatOptionLabel={customFormatOptionLabel}
                />
                {error && <div className="invalid-feedback d-block mt-2">{error}</div>}
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={handleClose}>Cancel</button>
              <button type="submit" className="btn btn-success">Assign Employee</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddEmployeeToPositionModal;
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Select from 'react-select';
import './ScheduleManagementPage.css';
import AddColumnModal from '../../../../../../LAPECO-HRMS/src/components/modals/AddColumnModal';
import 'bootstrap-icons/font/bootstrap-icons.css';
import Layout from '@/layout/Layout';

// Default handler for saving schedules
const defaultHandlers = {
  createSchedules: (schedules) => {
    // This function will be replaced by React Router useNavigate
    // For now, it will just return true, indicating success
    // In a real scenario, you would call an API endpoint here
    console.log("Saving schedules:", schedules);
    return true;
  }
};

const ScheduleBuilderPage = (props) => {
  // Get initialDate, method, sourceData from props (passed from backend)
  const { initialDate, method, sourceData } = props;
  const handlers = props.handlers || defaultHandlers;

  const [scheduleDate] = useState(initialDate);
  const [scheduleName, setScheduleName] = useState('');
  const [columns, setColumns] = useState([
    { key: 'start_time', name: 'Start Time' },
    { key: 'end_time', name: 'End Time' },
  ]);
  const [gridData, setGridData] = useState([]);
  const [showAddColumnModal, setShowAddColumnModal] = useState(false);

  const employeeOptions = useMemo(() => (props.employees || []).map(e => ({ value: e.id, label: `${e.name} (${e.id})` })), [props.employees]);
  const positionsMap = useMemo(() => new Map((props.positions || []).map(p => [p.id, p.title])), [props.positions]);

  useEffect(() => {
    if (!initialDate) {
      // This will be replaced by React Router useNavigate
      // For now, it will just visit the dashboard
      console.log("No initial date, visiting dashboard.");
      return;
    }

    let initialGrid = [];
    let initialName = `Schedule for ${initialDate}`;
    let initialColumns = [
      { key: 'start_time', name: 'Start Time' },
      { key: 'end_time', name: 'End Time' },
    ];

    if (method === 'copy' && sourceData && Array.isArray(sourceData)) {
      initialName = `Copy of ${sourceData[0]?.name || `Schedule for ${sourceData[0]?.date}`}`;
      const sourceColumns = new Set(['start_time', 'end_time']);
      sourceData.forEach(entry => {
        Object.keys(entry).forEach(key => {
          if (!['scheduleId', 'empId', 'date', 'name', 'start_time', 'end_time'].includes(key)) {
            sourceColumns.add(key);
          }
        });
      });
      initialColumns = Array.from(sourceColumns).map(key => ({ key, name: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ') }));
      initialGrid = sourceData.map(sch => {
        const row = { empId: sch.empId };
        initialColumns.forEach(col => {
          row[col.key] = sch[col.key] || '';
        });
        return row;
      });
    } else if (method === 'template' && sourceData) {
      initialName = `${sourceData.name} for ${initialDate}`;
      const templateColumnKeys = sourceData.columns && sourceData.columns.length > 0 ? sourceData.columns : ['start_time', 'end_time'];
      initialColumns = templateColumnKeys.map(key => ({
        key,
        name: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ')
      }));
      const applicableEmp = props.employees.filter(emp => sourceData.applicablePositions.includes(positionsMap.get(emp.positionId)));
      const emptyRow = initialColumns.reduce((acc, col) => ({ ...acc, [col.key]: '' }), {});
      initialGrid = applicableEmp.map(emp => ({ ...emptyRow, empId: emp.id }));
    } else {
      initialGrid = [{ empId: '', start_time: '', end_time: '' }];
    }

    setScheduleName(initialName);
    setColumns(initialColumns);
    setGridData(initialGrid);
  }, [initialDate, method, sourceData, props.employees, props.positions, positionsMap]);

  const addEmployeeRow = () => {
    const newRow = columns.reduce((acc, col) => ({ ...acc, [col.key]: '' }), { empId: '' });
    setGridData(prev => [...prev, newRow]);
  };

  const removeEmployeeRow = (rowIndex) => {
    setGridData(prev => prev.filter((_, index) => index !== rowIndex));
  };

  const handleAddColumn = (newColumn) => {
    if (columns.some(c => c.key === newColumn.key) || ['empId', 'name', 'position', 'start_time', 'end_time'].includes(newColumn.key)) {
      alert(`Column "${newColumn.name}" or its key already exists.`);
      return;
    }
    setColumns(prev => [...prev, newColumn]);
    setGridData(prevGrid => prevGrid.map(row => ({ ...row, [newColumn.key]: '' })));
  };

  const handleEmployeeSelect = (rowIndex, selectedOption) => {
    const newGrid = [...gridData];
    newGrid[rowIndex].empId = selectedOption ? selectedOption.value : '';
    setGridData(newGrid);
  };

  const handleGridInputChange = (rowIndex, fieldKey, value) => {
    const newGrid = [...gridData];
    newGrid[rowIndex][fieldKey] = value;
    setGridData(newGrid);
  };

  const handleSaveSchedule = () => {
    if (!scheduleName.trim()) {
      alert("Please provide a name for the schedule.");
      return;
    }

    const newScheduleEntries = [];
    const uniqueEmpIds = new Set();
    let hasDuplicates = false;

    gridData.forEach(row => {
      if (row.empId) {
        if (uniqueEmpIds.has(row.empId)) {
          hasDuplicates = true;
        }
        uniqueEmpIds.add(row.empId);

        const entryData = columns.reduce((acc, col) => {
          if (row[col.key] && String(row[col.key]).trim() !== '') acc[col.key] = row[col.key];
          return acc;
        }, {});

        if (Object.keys(entryData).length > 0 && entryData.start_time && entryData.end_time) {
          newScheduleEntries.push({ empId: row.empId, date: scheduleDate, name: scheduleName, ...entryData });
        }
      }
    });

    if (hasDuplicates) {
      alert("Error: Each employee can only be listed once per schedule.");
      return;
    }
    if (newScheduleEntries.length === 0) {
      alert("Please add at least one employee and assign a valid shift.");
      return;
    }

    const success = handlers.createSchedules(newScheduleEntries);
    if (success) {
      // This will be replaced by React Router useNavigate
      // For now, it will just visit the dashboard
      console.log("Saving successful, visiting dashboard.");
      // router.visit('/dashboard/schedule-management');
    }
  };

  return (
    <div className="container-fluid page-module-container p-lg-4 p-md-3 p-2">
      <header className="page-header d-flex align-items-center mb-4 detail-view-header">
        <button className="btn btn-light me-3 back-button" onClick={() => {
          // This will be replaced by React Router useNavigate
          // For now, it will just visit the dashboard
          console.log("Going back to dashboard.");
          // router.visit('/dashboard/schedule-management');
        }}><i className="bi bi-arrow-left"></i></button>
        <div className="flex-grow-1">
          <h1 className="page-main-title mb-0">Schedule Builder</h1>
          <p className="page-subtitle text-muted mb-0">Building schedule for <strong>{scheduleDate}</strong></p>
        </div>
        <div className="header-actions">
          <button className="btn btn-outline-secondary action-button-secondary" onClick={() => setShowAddColumnModal(true)}><i className="bi bi-layout-three-columns"></i> Add Column</button>
        </div>
      </header>
      <div className="mb-3 schedule-name-input-container">
        <label htmlFor="scheduleName" className="form-label fw-bold">Schedule Name*</label>
        <input type="text" className="form-control form-control-lg" id="scheduleName" placeholder="e.g., Weekday Production Team" value={scheduleName} onChange={e => setScheduleName(e.target.value)} required />
      </div>

      <div className="card data-table-card">
        <div className="card-body">
          <div className="table-responsive schedule-builder-table">
            <table className="table table-bordered table-sm">
              <thead>
                <tr>
                  <th className="employee-id-column">Employee ID</th>
                  <th className="employee-name-column">Employee Name</th>
                  <th className="position-column">Position</th>
                  {columns.map(col => <th key={col.key} className="text-center custom-column">{col.name}</th>)}
                  <th className="action-column"></th>
                </tr>
              </thead>
              <tbody>
                {gridData.map((row, rowIndex) => {
                  const selectedEmployee = props.employees.find(e => e.id === row.empId);
                  const positionTitle = selectedEmployee ? (positionsMap.get(selectedEmployee.positionId) || 'Unassigned') : '';
                  return (
                    <tr key={rowIndex}>
                      <td>
                        <input type="text" className="form-control form-control-sm readonly-input" value={selectedEmployee?.id || ''} readOnly disabled />
                      </td>
                      <td>
                        <div className="react-select-container">
                          <Select
                            options={employeeOptions}
                            isClearable
                            placeholder="Search & Select..."
                            value={employeeOptions.find(o => o.value === row.empId)}
                            onChange={(selectedOption) => handleEmployeeSelect(rowIndex, selectedOption)}
                            menuPortalTarget={document.body}
                            styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
                          />
                        </div>
                      </td>
                      <td>
                        <input type="text" className="form-control form-control-sm readonly-input" value={positionTitle} readOnly disabled />
                      </td>
                      {columns.map(col => (
                        <td key={col.key}>
                          {col.key === 'start_time' || col.key === 'end_time' ? (
                            <input type="time" className="form-control form-control-sm shift-input" value={row[col.key] || ''} onChange={e => handleGridInputChange(rowIndex, col.key, e.target.value)} />
                          ) : (
                            <input type="text" className="form-control form-control-sm shift-input" value={row[col.key] || ''} onChange={e => handleGridInputChange(rowIndex, col.key, e.target.value)} />
                          )}
                        </td>
                      ))}
                      <td>
                        <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => removeEmployeeRow(rowIndex)} title="Remove Row">
                          <i className="bi bi-x-lg"></i>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <button type="button" className="btn btn-sm btn-outline-secondary mt-2" onClick={addEmployeeRow}><i className="bi bi-plus-lg"></i> Add Row</button>
        </div>
      </div>

      <div className="d-flex justify-content-end mt-3 gap-2">
        <button type="button" className="btn btn-outline-secondary" onClick={() => {
          // This will be replaced by React Router useNavigate
          // For now, it will just visit the dashboard
          console.log("Cancelling, visiting dashboard.");
          // router.visit('/dashboard/schedule-management');
        }}>Cancel</button>
        <button type="button" className="btn btn-success action-button-primary" onClick={handleSaveSchedule}>Save Schedule</button>
      </div>

      <AddColumnModal
        show={showAddColumnModal}
        onClose={() => setShowAddColumnModal(false)}
        onAddColumn={handleAddColumn}
      />
    </div>
  );
};

export default ScheduleBuilderPage;
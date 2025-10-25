import React, { useState, useEffect } from 'react';
import AddColumnModal from './AddColumnModal';
import { scheduleAPI, employeeAPI } from '../services/api';
import '../pages/Schedule-Management/ScheduleManagementPage.css';

const EditScheduleModal = ({ show, onClose, onSave, scheduleId, scheduleDate, initialAssignments = [] }) => {
  const [scheduleName, setScheduleName] = useState('');
  const [columns, setColumns] = useState([
    { key: 'start_time', name: 'Start Time' },
    { key: 'end_time', name: 'End Time' },
    { key: 'break_start', name: 'Break Start' },
    { key: 'break_end', name: 'Break End' },
    { key: 'ot_hours', name: 'OT Hours' }
  ]);
  const [gridData, setGridData] = useState([]);
  const [showAddColumnModal, setShowAddColumnModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);

  useEffect(() => {
    const loadScheduleData = async () => {
      if (show && scheduleId) {
        setLoading(true);
        try {
          const response = await scheduleAPI.getById(scheduleId);
          const scheduleData = response.data;

          const formatTime = (timeValue) => {
            if (!timeValue) return '';

            if (typeof timeValue === 'string' && timeValue.match(/^\d{2}:\d{2}(:\d{2})?$/)) {
              return timeValue.substring(0, 5);
            }

            if (typeof timeValue === 'string' && timeValue.includes('T') && timeValue.includes('Z')) {
              const timePart = timeValue.split('T')[1].split('.')[0];
              return timePart.substring(0, 5);
            }
            if (typeof timeValue === 'string') {
              const date = new Date(timeValue);
              if (!isNaN(date.getTime())) {
                return date.toLocaleTimeString('en-US', { 
                  hour: '2-digit', 
                  minute: '2-digit',
                  hour12: false 
                });
              }
            }

            return timeValue || '';
          };

          const mapAssignmentsToRows = (assignmentsSource) => assignmentsSource.map(assignment => {
            const row = { 
              empId: assignment.employee_id,
              employeeName: assignment.user_name || '',
              employeeId: assignment.employee_id || '',
              positionName: assignment.position_name || '',
              start_time: formatTime(assignment.start_time),
              end_time: formatTime(assignment.end_time),
              break_start: formatTime(assignment.break_start),
              break_end: formatTime(assignment.break_end),
              ot_hours: assignment.ot_hours || '',
              notes: assignment.notes || ''
            };
            return row;
          });

          if (scheduleData.assignments && scheduleData.assignments.length > 0) {
            setGridData(mapAssignmentsToRows(scheduleData.assignments));
          } else if (initialAssignments && initialAssignments.length > 0) {
            setGridData(mapAssignmentsToRows(initialAssignments));
          } else {
            setGridData([{ empId: '', employeeName: '', employeeId: '', positionName: '', start_time: '', end_time: '', break_start: '', break_end: '', ot_hours: '', notes: '' }]);
          }
        } catch (error) {
        } finally {
          setLoading(false);
        }
      }
    };

    loadScheduleData();
  }, [show, scheduleId, scheduleDate]);

  useEffect(() => {
    let isMounted = true;
    const fetchEmployees = async () => {
      if (!show) return;
      setEmployeesLoading(true);
      try {
        const response = await employeeAPI.getList();
        if (!isMounted) return;
        const rawEmployees = Array.isArray(response.data) ? response.data : (response.data?.data || []);
        const normalized = rawEmployees.map(emp => {
          const name = emp.name
            || [emp.first_name, emp.middle_name, emp.last_name].filter(Boolean).join(' ').trim()
            || emp.full_name
            || emp.username
            || '';
          let positionName = '';
          if (emp.position_name) {
            positionName = emp.position_name;
          } else if (emp.position?.name) {
            positionName = emp.position.name;
          } else if (emp.position) {
            positionName = emp.position;
          }
          return {
            id: emp.id,
            name,
            positionName,
          };
        });
        setEmployees(normalized);
      } catch (error) {
        console.error('Failed to load employees for schedule editing:', error);
      } finally {
        if (isMounted) {
          setEmployeesLoading(false);
        }
      }
    };

    fetchEmployees();

    return () => {
      isMounted = false;
    };
  }, [show]);

  const addEmployeeRow = () => {
    const newRow = columns.reduce((acc, col) => ({ ...acc, [col.key]: '' }), { empId: '', employeeName: '', employeeId: '', positionName: '', notes: '' });
    if (!('break_start' in newRow)) newRow.break_start = '';
    if (!('break_end' in newRow)) newRow.break_end = '';
    setGridData(prev => [...prev, newRow]);
  };

  const removeEmployeeRow = (rowIndex) => setGridData(prev => prev.filter((_, index) => index !== rowIndex));

  const handleAddColumn = (newColumn) => {
    if (columns.some(c => c.key === newColumn.key)) return;
    setColumns(prev => [...prev, newColumn]);
    setGridData(prevGrid => prevGrid.map(row => ({ ...row, [newColumn.key]: '' })));
  };

  const handleDeleteColumn = (keyToDelete) => {
    if (['start_time', 'end_time', 'break_start', 'break_end'].includes(keyToDelete)) {
      alert('The Start Time and End Time columns cannot be deleted.');
      return;
    }
    setColumns(prev => prev.filter(col => col.key !== keyToDelete));
    setGridData(prevGrid => prevGrid.map(row => {
      const newRow = { ...row };
      delete newRow[keyToDelete];
      return newRow;
    }));
  };

  const handleGridChange = (rowIndex, field, value) => {
    const newGrid = [...gridData];
    newGrid[rowIndex][field] = value;
    setGridData(newGrid);
  };

  const handleEmpIdChange = (rowIndex, value) => {
    const newGrid = [...gridData];
    const selectedEmployee = employees.find(emp => String(emp.id) === String(value));
    newGrid[rowIndex].empId = value || '';
    newGrid[rowIndex].employeeId = value || '';
    if (selectedEmployee) {
      newGrid[rowIndex].employeeName = selectedEmployee.name || '';
      newGrid[rowIndex].positionName = selectedEmployee.positionName || '';
    } else {
      newGrid[rowIndex].employeeName = '';
      newGrid[rowIndex].positionName = '';
    }
    setGridData(newGrid);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const updatedScheduleEntries = [];
    const uniqueEmpIds = new Set();
    let hasDuplicates = false;
    gridData.forEach(row => {
      if (row.empId) {
        if(uniqueEmpIds.has(row.empId)) { hasDuplicates = true; }
        uniqueEmpIds.add(row.empId);
        const entryData = columns.reduce((acc, col) => {
          const value = row[col.key];
          if (['break_start', 'break_end'].includes(col.key)) {
            acc[col.key] = value && String(value).trim() !== '' ? value : null;
          } else if (col.key === 'ot_hours') {
            acc[col.key] = value && value !== '---' ? value : '0';
          } else if (value && String(value).trim() !== '') {
            acc[col.key] = value;
          }
          return acc;
        }, {});
        if (!('break_start' in entryData) && Object.prototype.hasOwnProperty.call(row, 'break_start')) {
          entryData.break_start = row.break_start ? row.break_start : null;
        }
        if (!('break_end' in entryData) && Object.prototype.hasOwnProperty.call(row, 'break_end')) {
          entryData.break_end = row.break_end ? row.break_end : null;
        }
        // Require both start_time and end_time
        if (Object.keys(entryData).length > 0 && entryData.start_time && entryData.end_time) {
          updatedScheduleEntries.push({ ...entryData, empId: row.empId, date: scheduleDate, name: scheduleName, notes: row.notes || null });
        }
      }
    });
    if (hasDuplicates) { alert("Error: Each employee can only be listed once per schedule."); return; }
    onSave(scheduleDate, updatedScheduleEntries);
  };

  if (!show) return null;

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{backgroundColor: 'rgba(0,0,0,0.6)'}}>
      <div className="modal-dialog modal-dialog-centered modal-xl">
        <div className="modal-content">
          <form onSubmit={handleSubmit}>
            <div className="modal-header">
              <h5 className="modal-title">Edit Schedule for {scheduleDate}</h5>
              <div className="ms-auto"><button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setShowAddColumnModal(true)}><i className="bi bi-layout-three-columns me-1"></i> Add Column</button></div>
              <button type="button" className="btn-close ms-2" onClick={onClose}></button>
            </div>
            <div className="modal-body">
              {loading ? (
                <div className="text-center py-4">
                  <div className="spinner-border" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="mt-2">Loading schedule data...</p>
                </div>
              ) : (
                <>
                  <div className="mb-3"><label className="form-label">Schedule Name (Optional)</label><input type="text" className="form-control" value={scheduleName} onChange={e => setScheduleName(e.target.value)} /></div>
              <div className="table-responsive schedule-builder-table">
                <table className="table table-bordered table-sm">
                  <thead>
                    <tr>
                      <th className="employee-id-column">Employee ID</th>
                      <th className="employee-name-column">Employee Name</th>
                      <th className="position-column">Position</th>
                      {columns.map(col => (
                        (col.key !== 'user_name' && col.key !== 'employee_id' && col.key !== 'position_name') && (
                          <th key={col.key} className="text-center custom-column">
                            {col.name}
                            {(!['start_time', 'end_time', 'break_start', 'break_end'].includes(col.key)) && (<button type="button" className="btn btn-sm btn-outline-danger p-0 ms-2 delete-column-btn" onClick={() => handleDeleteColumn(col.key)} title={`Delete '${col.name}' column`}><i className="bi bi-x"></i></button>)}
                          </th>
                        )
                      ))}
                      <th className="action-column"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {gridData.map((row, rowIndex) => (
                        <tr key={rowIndex}>
                          <td>
                            <input
                              type="text"
                              className="form-control form-control-sm readonly-input"
                              value={row.employeeId || ''}
                              readOnly
                              disabled
                            />
                          </td>
                          <td>
                            <select
                              className="form-select form-select-sm"
                              value={row.empId || ''}
                              onChange={e => handleEmpIdChange(rowIndex, e.target.value)}
                              disabled={employeesLoading}
                            >
                              <option value="">Select employee</option>
                              {employees.map(emp => (
                                <option key={emp.id} value={emp.id}>{emp.name || emp.id}</option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <input
                              type="text"
                              className="form-control form-control-sm readonly-input"
                              value={row.positionName || ''}
                              readOnly
                              disabled
                            />
                          </td>
                          {columns.map(col => (
                            (col.key !== 'user_name' && col.key !== 'employee_id' && col.key !== 'position_name') && (
                              <td key={col.key}>
                                {['start_time', 'end_time', 'break_start', 'break_end'].includes(col.key) ? (
                                  <input type="time" className="form-control form-control-sm shift-input" value={row[col.key] || ''} onChange={e => handleGridChange(rowIndex, col.key, e.target.value)} />
                                ) : col.key === 'ot_hours' ? (
                                  <input type="text" className="form-control form-control-sm shift-input" 
                                    value={row[col.key] && parseFloat(row[col.key]) > 0 ? row[col.key] : '---'} 
                                    onChange={e => handleGridChange(rowIndex, col.key, e.target.value === '---' ? '0' : e.target.value)} 
                                    onFocus={e => { if (e.target.value === '---') e.target.value = '0'; }}
                                  />
                                ) : col.key === 'notes' ? (
                                  <textarea
                                    className="form-control form-control-sm"
                                    rows={1}
                                    value={row.notes || ''}
                                    onChange={e => handleGridChange(rowIndex, 'notes', e.target.value)}
                                  />
                                ) : (
                                  <input type="text" className="form-control form-control-sm shift-input" value={row[col.key] || ''} onChange={e => handleGridChange(rowIndex, col.key, e.target.value)} />
                                )}
                              </td>
                            )
                          ))}
                          <td><button type="button" className="btn btn-sm btn-outline-danger" onClick={() => removeEmployeeRow(rowIndex)} title="Remove Row"><i className="bi bi-x-lg"></i></button></td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              <button type="button" className="btn btn-sm btn-outline-secondary mt-2" onClick={addEmployeeRow}><i className="bi bi-plus-lg"></i> Add Row</button>
                </>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-success action-button-primary">Save Changes</button>
            </div>
          </form>
        </div>
      </div>
      <AddColumnModal show={showAddColumnModal} onClose={() => setShowAddColumnModal(false)} onAddColumn={handleAddColumn} />
    </div>
  );
};
export default EditScheduleModal;
import React, { useState, useEffect, useMemo } from 'react';
import Select from 'react-select';
import AddColumnModal from './AddColumnModal';
import { scheduleAPI } from '../services/api';
import '../pages/Schedule-Management/ScheduleManagementPage.css';

const EditScheduleModal = ({ show, onClose, onSave, scheduleId, scheduleDate, allEmployees = [], positions }) => {
  const [scheduleName, setScheduleName] = useState('');
  const [columns, setColumns] = useState([
    { key: 'start_time', name: 'Start Time' },
    { key: 'end_time', name: 'End Time' },
  ]);
  const [gridData, setGridData] = useState([]);
  const [showAddColumnModal, setShowAddColumnModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const employeeOptions = useMemo(() => (allEmployees || []).map(e => ({ value: e.id, label: `${e.name} (${e.id})` })), [allEmployees]);
  const positionsMap = useMemo(() => new Map((positions || []).map(p => [p.id, p.title])), [positions]);
  
  useEffect(() => {
    const loadScheduleData = async () => {
      if (show && scheduleId) {
        setLoading(true);
        try {
          const response = await scheduleAPI.getById(scheduleId);
          const scheduleData = response.data;
          
          // Debug: Log the raw data to see what we're receiving
          console.log('Raw schedule data:', scheduleData);
          if (scheduleData.assignments && scheduleData.assignments.length > 0) {
            console.log('First assignment times:', {
              start_time: scheduleData.assignments[0].start_time,
              end_time: scheduleData.assignments[0].end_time,
              start_time_type: typeof scheduleData.assignments[0].start_time,
              end_time_type: typeof scheduleData.assignments[0].end_time
            });
          }
          
          setScheduleName(scheduleData.name || `Schedule for ${scheduleDate}`);
          
          // Set default columns for start_time, end_time, and notes
          const defaultColumns = [
            { key: 'start_time', name: 'Start Time' },
            { key: 'end_time', name: 'End Time' },
            { key: 'notes', name: 'Notes' }
          ];
          setColumns(defaultColumns);
          
          // Helper function to format time values from database
          const formatTime = (timeValue) => {
            if (!timeValue) return '';
            
            // If it's already in HH:MM format, return as is
            if (typeof timeValue === 'string' && timeValue.match(/^\d{2}:\d{2}(:\d{2})?$/)) {
              return timeValue.substring(0, 5); // Return only HH:MM part
            }
            
            // If it's a UTC datetime string (ISO format), extract time part without timezone conversion
            if (typeof timeValue === 'string' && timeValue.includes('T') && timeValue.includes('Z')) {
              // Extract time part from ISO datetime string (e.g., "2025-09-30T10:07:00.000000Z" -> "10:07")
              const timePart = timeValue.split('T')[1].split('.')[0]; // Get "10:07:00"
              return timePart.substring(0, 5); // Return only "10:07"
            }
            
            // If it's a datetime string, extract time part
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
          
          // Map the assignments to grid data
          const initialGrid = scheduleData.assignments.map(assignment => {
            const row = { 
              empId: assignment.employee_id,
              employeeName: assignment.user_name || '',
              employeeId: assignment.employee_id || '',
              positionName: assignment.position_name || '',
              start_time: formatTime(assignment.start_time),
              end_time: formatTime(assignment.end_time),
              notes: assignment.notes || ''
            };
            return row;
          });
          setGridData(initialGrid);
        } catch (error) {
        } finally {
          setLoading(false);
        }
      }
    };
    
    loadScheduleData();
  }, [show, scheduleId, scheduleDate]);

  const addEmployeeRow = () => {
    const newRow = columns.reduce((acc, col) => ({ ...acc, [col.key]: '' }), { empId: '' });
    setGridData(prev => [...prev, newRow]);
  };
  const removeEmployeeRow = (rowIndex) => setGridData(prev => prev.filter((_, index) => index !== rowIndex));
  
  const handleAddColumn = (newColumn) => {
    if (columns.some(c => c.key === newColumn.key)) return;
    setColumns(prev => [...prev, newColumn]);
    setGridData(prevGrid => prevGrid.map(row => ({ ...row, [newColumn.key]: '' })));
  };

  const handleDeleteColumn = (keyToDelete) => {
    if (keyToDelete === 'start_time' || keyToDelete === 'end_time') {
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

  const handleSubmit = (e) => {
    e.preventDefault();
    const updatedScheduleEntries = [];
    const uniqueEmpIds = new Set();
    let hasDuplicates = false;
    gridData.forEach(row => {
      if (row.empId) {
        if(uniqueEmpIds.has(row.empId)) { hasDuplicates = true; }
        uniqueEmpIds.add(row.empId);
        const entryData = columns.reduce((acc, col) => { if(row[col.key] && String(row[col.key]).trim() !== '') acc[col.key] = row[col.key]; return acc; }, {});
        // Require both start_time and end_time
        if (Object.keys(entryData).length > 0 && entryData.start_time && entryData.end_time) {
          updatedScheduleEntries.push({ ...entryData, empId: row.empId, date: scheduleDate, name: scheduleName });
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
                      <th className="employee-name-column">Employee Name</th>
                      <th className="employee-id-column">Employee ID</th>
                      <th className="position-column">Position</th>
                      {columns.map(col => (
                        (col.key !== 'user_name' && col.key !== 'employee_id' && col.key !== 'position_name') && (
                          <th key={col.key} className="text-center custom-column">
                            {col.name}
                            {(col.key !== 'start_time' && col.key !== 'end_time') && (<button type="button" className="btn btn-sm btn-outline-danger p-0 ms-2 delete-column-btn" onClick={() => handleDeleteColumn(col.key)} title={`Delete '${col.name}' column`}><i className="bi bi-x"></i></button>)}
                          </th>
                        )
                      ))}
                      <th className="action-column"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {gridData.map((row, rowIndex) => {
                      const selectedEmployee = allEmployees.find(e => e.id === row.empId);
                      const positionTitle = selectedEmployee ? (positionsMap.get(selectedEmployee.positionId) || 'Unassigned') : '';
                      return (
                        <tr key={rowIndex}>
                          <td>
                            <div className="react-select-container">
                              <Select 
                                options={employeeOptions} 
                                isClearable 
                                placeholder="Select..." 
                                value={employeeOptions.find(o => o.value === row.empId)} 
                                onChange={opt => handleGridChange(rowIndex, 'empId', opt ? opt.value : '')} 
                                menuPortalTarget={document.body} 
                                styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }} 
                              />
                            </div>
                          </td>
                          <td>
                            <input type="text" className="form-control form-control-sm readonly-input" value={selectedEmployee?.id || ''} readOnly disabled />
                          </td>
                          <td>
                            <input type="text" className="form-control form-control-sm readonly-input" value={positionTitle} readOnly disabled />
                          </td>
                          {columns.map(col => (
                            (col.key !== 'user_name' && col.key !== 'employee_id' && col.key !== 'position_name') && (
                              <td key={col.key}>
                                {col.key === 'start_time' || col.key === 'end_time' ? (
                                  <input type="time" className="form-control form-control-sm shift-input" value={row[col.key] || ''} onChange={e => handleGridChange(rowIndex, col.key, e.target.value)} />
                                ) : (
                                  <input type="text" className="form-control form-control-sm shift-input" value={row[col.key] || ''} onChange={e => handleGridChange(rowIndex, col.key, e.target.value)} />
                                )}
                              </td>
                            )
                          ))}
                          <td><button type="button" className="btn btn-sm btn-outline-danger" onClick={() => removeEmployeeRow(rowIndex)} title="Remove Row"><i className="bi bi-x-lg"></i></button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <button type="button" className="btn btn-sm btn-outline-secondary mt-2" onClick={addEmployeeRow}><i className="bi bi-plus-lg"></i> Add Row</button>
                </>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary action-button-primary">Save Changes</button>
            </div>
          </form>
        </div>
      </div>
      <AddColumnModal show={showAddColumnModal} onClose={() => setShowAddColumnModal(false)} onAddColumn={handleAddColumn} />
    </div>
  );
};
export default EditScheduleModal;
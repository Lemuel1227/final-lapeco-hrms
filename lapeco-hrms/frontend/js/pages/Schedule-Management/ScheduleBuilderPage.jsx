import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Select from 'react-select';
import './ScheduleManagementPage.css';
import AddColumnModal from '../../modals/AddColumnModal';
import 'bootstrap-icons/font/bootstrap-icons.css';
import Layout from '@/layout/Layout';
import { scheduleAPI, employeeAPI, positionAPI } from '../../services/api';
import ToastNotification from '../../common/ToastNotification';

// Default handler for saving schedules
const defaultHandlers = {
  createSchedules: async (schedules, showToast) => {
    try {
      // Transform the schedule entries to match the backend API format
      const scheduleData = {
        name: schedules[0].name,
        date: schedules[0].date,
        description: null,
        assignments: schedules.map(schedule => ({
          empId: schedule.empId,
          start_time: schedule.start_time,
          end_time: schedule.end_time,
          break_start: schedule.break_start || null,
          break_end: schedule.break_end || null,
          ot_hours: schedule.ot_hours || '0'
        }))
      };

      const response = await scheduleAPI.create(scheduleData);
      showToast('Schedule saved successfully!', 'success');
      return true;
    } catch (error) {
      console.error('Error saving schedule:', error);
      
      // Handle different error types from backend
      if (error.response?.data?.error === 'SCHEDULE_EXISTS_FOR_DATE') {
        showToast('A schedule already exists for this date. Only one schedule per date is allowed.', 'error');
      } else if (error.response?.data?.error === 'VALIDATION_ERROR') {
        // Handle detailed validation errors
        const errors = error.response.data.errors;
        if (errors) {
          const errorMessages = [];
          
          // Format validation errors into readable messages
          Object.keys(errors).forEach(field => {
            const fieldErrors = errors[field];
            fieldErrors.forEach(errorMsg => {
              // Convert field names to more user-friendly names and simplify messages
              let friendlyField = field;
              let simplifiedMessage = errorMsg;
              
              if (field.includes('assignments.')) {
                const match = field.match(/assignments\.(\d+)\.(.+)/);
                if (match) {
                  const index = parseInt(match[1]) + 1;
                  const fieldName = match[2];
                  friendlyField = `Row ${index}`;
                  
                  // Simplify common validation messages
                  if (fieldName === 'start_time' && errorMsg.includes('required')) {
                    simplifiedMessage = 'Start time is required';
                  } else if (fieldName === 'end_time' && errorMsg.includes('required')) {
                    simplifiedMessage = 'End time is required';
                  } else if (fieldName === 'end_time' && errorMsg.includes('after')) {
                    simplifiedMessage = 'End time must be after start time';
                  } else if (fieldName === 'empId' && errorMsg.includes('required')) {
                    simplifiedMessage = 'Employee is required';
                  } else if (fieldName === 'empId' && errorMsg.includes('exists')) {
                    simplifiedMessage = 'Invalid employee selected';
                  } else if (fieldName.includes('time') && errorMsg.includes('date_format')) {
                    simplifiedMessage = 'Invalid time format (use HH:MM)';
                  } else {
                    simplifiedMessage = errorMsg.replace(/The .+? field /, '').replace(/assignments\.\d+\./, '');
                  }
                }
              } else {
                friendlyField = field.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
                // Simplify general field messages
                if (errorMsg.includes('required')) {
                  simplifiedMessage = `${friendlyField} is required`;
                } else {
                  simplifiedMessage = errorMsg.replace(/The .+? field /, '');
                }
              }
              
              errorMessages.push(`${friendlyField}: ${simplifiedMessage}`);
            });
          });
          
          showToast(`Validation errors:\n${errorMessages.join('\n')}`, 'error');
        } else {
          showToast('Please check your input data and try again.', 'error');
        }
      } else if (error.response?.data?.error === 'INVALID_TIME_RANGE') {
        const assignmentIndex = error.response.data.assignment_index;
        showToast(`Row ${assignmentIndex + 1}: Start time and end time cannot be the same.`, 'error');
      } else if (error.response?.data?.error === 'INVALID_TIME_FORMAT') {
        const assignmentIndex = error.response.data.assignment_index;
        showToast(`Row ${assignmentIndex + 1}: Invalid time format. Please use HH:MM format.`, 'error');
      } else if (error.response?.data?.error === 'INVALID_NIGHT_SHIFT') {
        const assignmentIndex = error.response.data.assignment_index;
        showToast(`Row ${assignmentIndex + 1}: End time cannot be before start time unless it's a night shift starting at 4 PM or later.`, 'error');
      } else if (error.response?.data?.error === 'EXCEEDS_WORK_LIMIT') {
        const assignmentIndex = error.response.data.assignment_index;
        const workDuration = error.response.data.work_duration;
        showToast(`Row ${assignmentIndex + 1}: Work duration (${workDuration} hours) exceeds the 8-hour limit per Philippine Labor Code.`, 'error');
      } else if (error.response?.data?.message) {
        showToast(error.response.data.message, 'error');
      } else if (error.response?.status === 422) {
        showToast('Please check your input data and try again.', 'error');
      } else if (error.response?.status === 500) {
        showToast('Server error occurred. Please try again later.', 'error');
      } else {
        showToast('Failed to save schedule. Please check your connection and try again.', 'error');
      }
      return false;
    }
  }
};

const ScheduleBuilderPage = (props) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get data from navigation state or props
  const { date, method, sourceData } = location.state || {};
  const { initialDate, handlers: propHandlers } = props;
  
  const scheduleDate = date;
  const handlers = propHandlers || defaultHandlers;

  const [scheduleName, setScheduleName] = useState('');
  const [columns, setColumns] = useState([
    { key: 'start_time', name: 'Start Time' },
    { key: 'end_time', name: 'End Time' },
    { key: 'break_start', name: 'Break Start' },
    { key: 'break_end', name: 'Break End' },
    { key: 'ot_hours', name: 'OT Hours' },
  ]);
  const [gridData, setGridData] = useState([]);
  const [showAddColumnModal, setShowAddColumnModal] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
  };

  const employeeOptions = useMemo(() => employees.map(e => ({ value: e.id, label: `${e.name} (${e.id})` })), [employees]);
  const positionsMap = useMemo(() => new Map(positions.map(p => [p.id, p.title])), [positions]);

  // Load employees and positions data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [employeesResponse, positionsResponse] = await Promise.all([
          employeeAPI.getAll(),
          positionAPI.getAll()
        ]);
        
        const empData = Array.isArray(employeesResponse.data) ? employeesResponse.data : (employeesResponse.data?.data || []);
        const posData = Array.isArray(positionsResponse.data) ? positionsResponse.data : (positionsResponse.data?.data || []);
        
        // Create position lookup map
        const positionMap = {};
        posData.forEach(p => {
          positionMap[p.id] = p.title ?? p.name;
        });
        
        // Normalize employees and add position title
        const normalizedEmployees = empData.map(e => {
          const normalized = {
            id: e.id,
            name: e.name,
            email: e.email,
            role: e.role,
            positionId: e.position_id ?? e.positionId,
            joiningDate: e.joining_date ?? e.joiningDate,
            birthday: e.birthday,
            gender: e.gender,
            address: e.address,
            contactNumber: e.contact_number ?? e.contactNumber,
            imageUrl: e.image_url ?? e.imageUrl,
            sssNo: e.sss_no ?? e.sssNo,
            tinNo: e.tin_no ?? e.tinNo,
            pagIbigNo: e.pag_ibig_no ?? e.pagIbigNo,
            philhealthNo: e.philhealth_no ?? e.philhealthNo,
            resumeFile: e.resume_file ?? e.resumeFile,
            status: e.account_status ?? e.status ?? 'Active',
            position: positionMap[e.position_id ?? e.positionId] || null
          };
          normalized.positionTitle = normalized.positionId ? positionMap[normalized.positionId] : null;
          return normalized;
        });
        
        setEmployees(normalizedEmployees);
        setPositions(posData);
        setLoading(false);
      } catch (error) {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    const currentDate = scheduleDate || initialDate;
    if (!currentDate || loading) {
      return;
    }

    let initialGrid = [];
    let initialName = `Schedule for ${currentDate}`;
    let initialColumns = [
      { key: 'start_time', name: 'Start Time' },
      { key: 'end_time', name: 'End Time' },
      { key: 'break_start', name: 'Break Start' },
      { key: 'break_end', name: 'Break End' },
      { key: 'ot_hours', name: 'OT Hours' },
    ];

    if (method === 'copy' && sourceData && Array.isArray(sourceData)) {
      console.log('Copy method - sourceData:', sourceData);
      initialName = `Copy of ${sourceData[0]?.name || `Schedule for ${sourceData[0]?.date}`}`;
      const sourceColumns = new Set(['start_time', 'end_time', 'break_start', 'break_end', 'ot_hours']);
      sourceData.forEach(entry => {
        Object.keys(entry).forEach(key => {
          // Filter out employee-related fields that are already displayed as fixed columns
          if (!['scheduleId', 'empId', 'date', 'name', 'user_name', 'employee_id', 'position_name', 'id', 'user_id'].includes(key)) {
            sourceColumns.add(key);
          }
        });
      });
      initialColumns = Array.from(sourceColumns).map(key => ({ key, name: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ') }));
      
      // Helper function to format time for input fields
      const formatTimeForInput = (timeStr) => {
        console.log('Formatting time:', timeStr);
        if (!timeStr) return '';
        
        // Handle ISO datetime strings (e.g., "2025-09-30T07:00:00.000000Z")
        if (timeStr.includes('T')) {
          const timePart = timeStr.split('T')[1];
          if (timePart) {
            // Extract just the HH:MM part from the time portion
            return timePart.substring(0, 5);
          }
        }
        
        // If it's already in HH:MM format, return as is
        if (timeStr.match(/^\d{2}:\d{2}$/)) return timeStr;
        // If it's in HH:MM:SS format, extract HH:MM
        if (timeStr.match(/^\d{2}:\d{2}:\d{2}$/)) return timeStr.substring(0, 5);
        return timeStr;
      };
      
      initialGrid = sourceData.map(sch => {
        console.log('Processing schedule item:', sch);
        const row = { empId: sch.employee_id || sch.empId || sch.user_id };
        
        // Handle time fields directly like in template method
        row.start_time = formatTimeForInput(sch.start_time);
        row.end_time = formatTimeForInput(sch.end_time);
        row.break_start = formatTimeForInput(sch.break_start);
        row.break_end = formatTimeForInput(sch.break_end);
        row.ot_hours = sch.ot_hours || '0';
        console.log(`start_time: ${sch.start_time} -> ${row.start_time}`);
        console.log(`end_time: ${sch.end_time} -> ${row.end_time}`);
        console.log(`ot_hours: ${sch.ot_hours} -> ${row.ot_hours}`);
        
        // Handle other columns
        initialColumns.forEach(col => {
          if (col.key !== 'start_time' && col.key !== 'end_time' && col.key !== 'ot_hours') {
            row[col.key] = sch[col.key] || '';
          }
        });
        console.log('Final row:', row);
        return row;
      });
    } else if (method === 'template' && sourceData) {
      initialName = `${sourceData.name} for ${currentDate}`;
      const templateColumnKeys = sourceData.columns && sourceData.columns.length > 0 ? sourceData.columns : [];
      
      // Always include start_time, end_time, and ot_hours as base columns, then add template columns and notes if needed
      const baseColumns = ['start_time', 'end_time', 'break_start', 'break_end', 'ot_hours'];
      const allColumnKeys = sourceData.assignments && sourceData.assignments.length > 0 
        ? [...new Set([...baseColumns, ...templateColumnKeys, 'notes'])]
        : [...new Set([...baseColumns, ...templateColumnKeys])];
        
      initialColumns = allColumnKeys.map(key => ({
        key,
        name: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ')
      }));
      
      // If template has assignments, use them to populate the grid
      if (sourceData.assignments && sourceData.assignments.length > 0) {
        initialGrid = sourceData.assignments.map(assignment => {
          const row = { empId: assignment.user_id };
          
          // Convert time format from database (HH:MM or HH:MM:SS) to HTML time input format (HH:MM)
          const formatTimeForInput = (timeStr) => {
            if (!timeStr) return '';
            
            // Handle ISO datetime strings (e.g., "2025-09-30T07:00:00.000000Z")
            if (timeStr.includes('T')) {
              const timePart = timeStr.split('T')[1];
              if (timePart) {
                // Extract just the HH:MM part from the time portion
                return timePart.substring(0, 5);
              }
            }
            
            // If it's already in HH:MM format, return as is
            if (timeStr.match(/^\d{2}:\d{2}$/)) return timeStr;
            // If it's in HH:MM:SS format, extract HH:MM
            if (timeStr.match(/^\d{2}:\d{2}:\d{2}$/)) return timeStr.substring(0, 5);
            return timeStr;
          };
          
          // Populate standard columns from assignment data with proper time formatting
          row.start_time = formatTimeForInput(assignment.start_time);
          row.end_time = formatTimeForInput(assignment.end_time);
          row.break_start = formatTimeForInput(assignment.break_start);
          row.break_end = formatTimeForInput(assignment.break_end);
          row.ot_hours = assignment.ot_hours || '0';
          
          // Populate any additional template columns with empty values
          allColumnKeys.forEach(key => {
            if (!row.hasOwnProperty(key)) {
              row[key] = '';
            }
          });
          
          return row;
        });
      } else {
        // If no assignments, create empty rows for all employees
        const emptyRow = initialColumns.reduce((acc, col) => ({ ...acc, [col.key]: '' }), {});
        initialGrid = employees.map(emp => ({ ...emptyRow, empId: emp.id }));
      }
    } else {
      initialGrid = [{ empId: '', start_time: '', end_time: '', break_start: '', break_end: '', ot_hours: '0' }];
    }

    setScheduleName(initialName);
    setColumns(initialColumns);
    setGridData(initialGrid);
  }, [scheduleDate, initialDate, method, sourceData, employees, positions, positionsMap, loading]);

  const addEmployeeRow = () => {
    const newRow = columns.reduce((acc, col) => ({ ...acc, [col.key]: '' }), { empId: '' });
    setGridData(prev => [...prev, newRow]);
  };

  const removeEmployeeRow = (rowIndex) => {
    setGridData(prev => prev.filter((_, index) => index !== rowIndex));
  };

  const handleAddColumn = (newColumn) => {
    if (columns.some(c => c.key === newColumn.key) || ['empId', 'name', 'position', 'start_time', 'end_time', 'break_start', 'break_end', 'ot_hours'].includes(newColumn.key)) {
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

  const handleSaveSchedule = async () => {
    // Auto-generate schedule name if not provided
    const finalScheduleName = scheduleName.trim() || `Schedule for ${scheduleDate}`;

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

        if (!entryData.ot_hours) {
          entryData.ot_hours = '0';
        }

        if (Object.keys(entryData).length > 0 && entryData.start_time && entryData.end_time) {
          newScheduleEntries.push({ empId: row.empId, date: scheduleDate, name: finalScheduleName, ...entryData });
        }
      }
    });

    if (hasDuplicates) {
      showToast("Error: Each employee can only be listed once per schedule.", "error");
      return;
    }
    if (newScheduleEntries.length === 0) {
      showToast("Please add at least one employee and assign a valid shift.", "warning");
      return;
    }

    const success = await handlers.createSchedules(newScheduleEntries, showToast);
    if (success) {
      // Navigate immediately with success message
      navigate('/dashboard/schedule-management', {
        state: { 
          successMessage: 'Schedule saved successfully!',
          scheduleDate: scheduleDate,
          scheduleName: finalScheduleName
        }
      });
    }
  };

  return (
    <div className="container-fluid page-module-container p-lg-4 p-md-3 p-2">
      <header className="page-header d-flex align-items-center mb-4 detail-view-header">
        <button className="btn btn-light me-3 back-button" onClick={() => {
          navigate('/dashboard/schedule-management');
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
        <label htmlFor="scheduleName" className="form-label fw-bold">Schedule Name</label>
        <input type="text" className="form-control form-control-lg" id="scheduleName" placeholder={`e.g., Weekday Production Team")`} value={scheduleName} onChange={e => setScheduleName(e.target.value)} />
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
                  const selectedEmployee = employees.find(e => e.id === row.empId);
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
                          {col.key === 'start_time' || col.key === 'end_time' || col.key === 'break_start' || col.key === 'break_end' ? (
                            <input type="time" className="form-control form-control-sm shift-input" value={row[col.key] || ''} onChange={e => handleGridInputChange(rowIndex, col.key, e.target.value)} />
                          ) : col.key === 'ot_hours' ? (
                            <input type="text" className="form-control form-control-sm shift-input" 
                              value={row[col.key] && parseFloat(row[col.key]) > 0 ? row[col.key] : '---'} 
                              onChange={e => handleGridInputChange(rowIndex, col.key, e.target.value === '---' ? '0' : e.target.value)}
                              onFocus={e => { if (e.target.value === '---') e.target.value = '0'; }}
                            />
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
          navigate('/dashboard/schedule-management');
        }}>Cancel</button>
        <button type="button" className="btn btn-success action-button-primary" onClick={handleSaveSchedule}>Save Schedule</button>
      </div>

      <AddColumnModal
        show={showAddColumnModal}
        onClose={() => setShowAddColumnModal(false)}
        onAddColumn={handleAddColumn}
      />

      {toast.show && (
        <ToastNotification
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ show: false, message: '', type: 'success' })}
        />
      )}
    </div>
  );
};

export default ScheduleBuilderPage;
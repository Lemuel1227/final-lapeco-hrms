import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Select from 'react-select';
import './ScheduleManagementPage.css';
import './ScheduleBuilderPage.css'; // Import the new CSS
import AddColumnModal from '../../modals/AddColumnModal';
import 'bootstrap-icons/font/bootstrap-icons.css';
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

      await scheduleAPI.create(scheduleData);
      showToast('Schedule saved successfully!', 'success');
      return true;
    } catch (error) {
      console.error('Error saving schedule:', error);
      
      // Handle different error types from backend
      if (error.response?.data?.error === 'SCHEDULE_EXISTS_FOR_DATE') {
        showToast('A schedule already exists for this date. Only one schedule per date is allowed.', 'error');
      } else if (error.response?.data?.error === 'VALIDATION_ERROR') {
        const errors = error.response.data.errors;
        if (errors) {
          const errorMessages = [];
          Object.keys(errors).forEach(field => {
            const fieldErrors = errors[field];
            fieldErrors.forEach(errorMsg => {
               errorMessages.push(errorMsg);
            });
          });
          showToast(`Validation errors:\n${errorMessages.join('\n')}`, 'error');
        } else {
          showToast('Please check your input data and try again.', 'error');
        }
      } else if (error.response?.data?.message) {
        showToast(error.response.data.message, 'error');
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
  const { dates, date, method, sourceData } = location.state || {};
  const { initialDate, handlers: propHandlers } = props;
  
  const selectedDates = Array.isArray(dates) && dates.length ? dates : (date ? [date] : []);
  const scheduleDate = selectedDates[0] || date;
  const handlers = propHandlers || defaultHandlers;

  const [scheduleName, setScheduleName] = useState('');
  const [dateNames, setDateNames] = useState({});
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

  const formatPrettyDate = (iso) => {
    if (!iso) return '';
    const parts = String(iso).split('-');
    if (parts.length !== 3) return iso;
    const y = Number(parts[0]);
    const m = Number(parts[1]);
    const d = Number(parts[2]);
    const dt = new Date(y, m - 1, d);
    if (Number.isNaN(dt.getTime())) return iso;
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const dd = String(dt.getDate()).padStart(2, '0');
    return `${mm}-${dd}-${String(y)}`;
  };

  useEffect(() => {
    if (selectedDates && selectedDates.length) {
      setDateNames(prev => {
        const next = {};
        selectedDates.forEach(d => {
          next[d] = prev[d] ?? `Schedule for ${d}`;
        });
        return next;
      });
    } else {
      setDateNames({});
    }
  }, [selectedDates]);

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
        
        setEmployees(empData);
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
      // Try to get the original schedule name from sourceScheduleInfo or use a default
      const sourceScheduleName = location.state?.sourceScheduleInfo?.name || 
                                sourceData[0]?.name || 
                                `Schedule for ${location.state?.sourceScheduleInfo?.date || 'selected date'}`;
      initialName = `Copy of ${sourceScheduleName}`;
      // ... (Copy logic simplified for brevity, keeping existing logic if complex)
       const formatTimeForInput = (timeStr) => {
        if (!timeStr) return '';
        if (timeStr.includes('T')) {
          const timePart = timeStr.split('T')[1];
          if (timePart) return timePart.substring(0, 5);
        }
        if (timeStr.match(/^\d{2}:\d{2}$/)) return timeStr;
        if (timeStr.match(/^\d{2}:\d{2}:\d{2}$/)) return timeStr.substring(0, 5);
        return timeStr;
      };
      
      initialGrid = sourceData.map(sch => {
        const row = { empId: sch.employee_id || sch.empId || sch.user_id };
        row.start_time = formatTimeForInput(sch.start_time);
        row.end_time = formatTimeForInput(sch.end_time);
        row.break_start = formatTimeForInput(sch.break_start);
        row.break_end = formatTimeForInput(sch.break_end);
        row.ot_hours = sch.ot_hours || '0';
        // Copy other dynamic columns if they exist in initialColumns
        return row;
      });
    } else if (method === 'template' && sourceData) {
      initialName = `${sourceData.name} for ${currentDate}`;
      const templateColumnKeys = sourceData.columns && sourceData.columns.length > 0 ? sourceData.columns : [];
      const baseColumns = ['start_time', 'end_time', 'break_start', 'break_end', 'ot_hours'];
      const allColumnKeys = [...new Set([...baseColumns, ...templateColumnKeys])];
      
      initialColumns = allColumnKeys.map(key => ({
        key,
        name: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ')
      }));

      if (sourceData.assignments && sourceData.assignments.length > 0) {
         // Logic to map template assignments
         initialGrid = sourceData.assignments.map(assignment => {
            // ... same logic as before
            const row = { empId: assignment.user_id || assignment.empId || '' };
            const formatTime = (t) => t ? (t.includes('T') ? t.split('T')[1].substring(0,5) : t.substring(0,5)) : '';
            row.start_time = formatTime(assignment.start_time);
            row.end_time = formatTime(assignment.end_time);
            row.break_start = formatTime(assignment.break_start);
            row.break_end = formatTime(assignment.break_end);
            row.ot_hours = assignment.ot_hours || '0';
            allColumnKeys.forEach(key => { if (!row[key]) row[key] = ''; });
            return row;
         });
      } else {
        const emptyRow = initialColumns.reduce((acc, col) => ({ ...acc, [col.key]: '' }), {});
        initialGrid = employees.map(emp => ({ ...emptyRow, empId: emp.id }));
      }
    } else {
      // New blank schedule
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

  const handleSave = async () => {
    const finalScheduleName = (dateNames && dateNames[scheduleDate] && String(dateNames[scheduleDate]).trim() !== '') ? dateNames[scheduleDate].trim() : (scheduleName.trim() || `Schedule for ${scheduleDate}`);

    const baseEntries = [];
    const uniqueEmpIds = new Set();
    let hasDuplicates = false;

    gridData.forEach(row => {
      if (row.empId) {
        if (uniqueEmpIds.has(row.empId)) hasDuplicates = true; else uniqueEmpIds.add(row.empId);
        
        const entryData = columns.reduce((acc, col) => {
          const value = row[col.key];
          if (['break_start', 'break_end'].includes(col.key)) acc[col.key] = value && String(value).trim() !== '' ? value : null;
          else if (col.key === 'ot_hours') acc[col.key] = value && value !== '---' ? value : '0';
          else if (value && String(value).trim() !== '') acc[col.key] = value;
          return acc;
        }, {});
        
        if (!entryData.ot_hours) entryData.ot_hours = '0';
        if (Object.keys(entryData).length > 0 && entryData.start_time && entryData.end_time) baseEntries.push({ empId: row.empId, ...entryData });
      }
    });

    if (hasDuplicates) { showToast("Error: Each employee can only be listed once per schedule.", "error"); return; }
    if (baseEntries.length === 0) { showToast("Please add at least one employee and assign a valid shift.", "warning"); return; }

    const datesToProcess = (selectedDates && selectedDates.length) ? selectedDates : [scheduleDate];
    let createdCount = 0; let failedDates = [];
    for (const d of datesToProcess) {
      const nameForDate = (dateNames && dateNames[d] && String(dateNames[d]).trim() !== '') ? dateNames[d].trim() : (scheduleName.trim() || `Schedule for ${d}`);
      const entriesForDate = baseEntries.map(e => ({ ...e, date: d, name: nameForDate }));
      const ok = await handlers.createSchedules(entriesForDate, showToast);
      if (ok) createdCount++; else failedDates.push(d);
    }
    if (createdCount > 0) {
      navigate('/dashboard/schedule-management', {
        state: {
          successMessage: failedDates.length ? `Created ${createdCount} schedule(s). Skipped: ${failedDates.join(', ')}` : 'Schedule saved successfully!',
          scheduleDate: scheduleDate,
          scheduleName: finalScheduleName
        }
      });
    }
  };

  return (
    <div className="container-fluid page-module-container p-lg-4 p-md-3 p-2 builder-container">
      {/* --- Header Section --- */}
      <div className="builder-header-card">
        <div className="d-flex align-items-center gap-3">
          <button className="btn btn-light border" onClick={() => navigate('/dashboard/schedule-management')}>
            <i className="bi bi-arrow-left"></i>
          </button>
          <div className="builder-title-section">
            <h1 className="mb-1">Schedule Builder</h1>
            <p className="builder-subtitle">
              Creating schedule for <strong>{formatPrettyDate(scheduleDate)}</strong>
              {selectedDates && selectedDates.length > 1 && ` and ${selectedDates.length - 1} others`}
            </p>
            {selectedDates && selectedDates.length > 0 && (
              <div className="date-badge-list">
                {selectedDates.map(d => (
                  <span key={d} className="date-badge-item">{formatPrettyDate(d)}</span>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="d-flex gap-2">
           <button className="btn btn-outline-secondary action-button-secondary" onClick={() => setShowAddColumnModal(true)}>
             <i className="bi bi-layout-three-columns me-2"></i> Add Column
           </button>
        </div>
      </div>

      {/* --- Schedule Name Input Section --- */}
      <div className="schedule-name-section">
        {(!selectedDates || selectedDates.length <= 1) ? (
          <div>
            <label htmlFor="scheduleName" className="form-label fw-bold text-secondary text-uppercase small">Schedule Name</label>
            <input 
              type="text" 
              className="form-control" 
              id="scheduleName" 
              placeholder={`e.g. Production Schedule for ${formatPrettyDate(scheduleDate)}`} 
              value={scheduleName} 
              onChange={e => setScheduleName(e.target.value)} 
            />
          </div>
        ) : (
          <div>
            <label className="form-label fw-bold text-secondary text-uppercase small mb-3">Schedule Names by Date</label>
            <div className="row g-3">
              {selectedDates.map(d => (
                <div key={d} className="col-12 col-md-6 col-xl-4">
                  <div className="input-group">
                    <span className="input-group-text bg-light">{formatPrettyDate(d)}</span>
                    <input
                      type="text"
                      className="form-control"
                      value={dateNames[d] || ''}
                      onChange={e => setDateNames(prev => ({ ...prev, [d]: e.target.value }))}
                      placeholder={`Schedule for ${d}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* --- Main Grid Section --- */}
      <div className="builder-grid-card flex-grow-1">
        <div className="builder-table-wrapper">
          <table className="builder-table">
            <thead>
              <tr>
                <th className="col-emp-id">Emp ID</th>
                <th className="col-emp-name">Employee Name</th>
                <th className="col-position">Position</th>
                {columns.map(col => (
                  <th key={col.key} className={`col-time text-center ${col.key === 'ot_hours' ? 'text-warning' : ''}`}>{col.name}</th>
                ))}
                <th className="col-action"></th>
              </tr>
            </thead>
            <tbody>
              {gridData.map((row, rowIndex) => {
                const selectedEmployee = employees.find(e => e.id === row.empId);
                const positionTitle = selectedEmployee ? (positionsMap.get(selectedEmployee.position_id) || 'Unassigned') : '';
                
                return (
                  <tr key={rowIndex}>
                    <td className="p-2">
                      <input type="text" className="form-control form-control-sm border-0 bg-light text-muted" value={selectedEmployee?.id || ''} readOnly disabled />
                    </td>
                    <td>
                      <div className="react-select-container px-2">
                        <Select
                          options={employeeOptions}
                          isClearable
                          placeholder="Select Employee..."
                          value={employeeOptions.find(o => o.value === row.empId)}
                          onChange={(selectedOption) => handleEmployeeSelect(rowIndex, selectedOption)}
                          menuPortalTarget={document.body}
                          styles={{ 
                            menuPortal: base => ({ ...base, zIndex: 9999 }),
                            control: (base) => ({ ...base, border: 'none', boxShadow: 'none', background: 'transparent' }) 
                          }}
                        />
                      </div>
                    </td>
                    <td className="p-2">
                      <input type="text" className="form-control form-control-sm border-0 bg-light text-muted" value={positionTitle} readOnly disabled />
                    </td>
                    {columns.map(col => (
                      <td key={col.key}>
                        {col.key === 'start_time' || col.key === 'end_time' || col.key === 'break_start' || col.key === 'break_end' ? (
                          <input 
                            type="time" 
                            className="cell-input text-center" 
                            value={row[col.key] || ''} 
                            onChange={e => handleGridInputChange(rowIndex, col.key, e.target.value)} 
                          />
                        ) : col.key === 'ot_hours' ? (
                          <input 
                            type="text" 
                            className="cell-input text-center fw-bold text-warning" 
                            value={row[col.key] && parseFloat(row[col.key]) > 0 ? row[col.key] : '---'} 
                            onChange={e => handleGridInputChange(rowIndex, col.key, e.target.value === '---' ? '0' : e.target.value)}
                            onFocus={e => { if (e.target.value === '---') e.target.value = '0'; }}
                          />
                        ) : (
                          <input 
                            type="text" 
                            className="cell-input" 
                            value={row[col.key] || ''} 
                            onChange={e => handleGridInputChange(rowIndex, col.key, e.target.value)} 
                          />
                        )}
                      </td>
                    ))}
                    <td className="text-center">
                      <button type="button" className="btn btn-link text-danger p-0" onClick={() => removeEmployeeRow(rowIndex)} title="Remove Row">
                        <i className="bi bi-trash3-fill"></i>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="add-row-section">
           <button type="button" className="btn btn-add-row" onClick={addEmployeeRow}>
             <i className="bi bi-plus-circle me-2"></i> Add Employee Row
           </button>
        </div>
      </div>

      {/* --- Sticky Footer --- */}
      <div className="builder-footer">
        <div className="footer-info">
           <span className="text-muted"><i className="bi bi-info-circle me-1"></i> {gridData.filter(r => r.empId).length} employees assigned</span>
        </div>
        <div className="footer-actions">
          <button type="button" className="btn btn-light border" onClick={() => navigate('/dashboard/schedule-management')}>
            Cancel
          </button>
          <button type="button" className="btn btn-success px-4" onClick={handleSave}>
            <i className="bi bi-check2-circle me-2"></i> Save Schedule
          </button>
        </div>
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

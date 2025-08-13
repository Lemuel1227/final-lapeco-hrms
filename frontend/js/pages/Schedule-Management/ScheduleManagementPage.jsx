import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './ScheduleManagementPage.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import CreateTemplateModal from '../../modals/CreateTemplateModal';
import EditScheduleModal from '../../modals/EditScheduleModal';
import SelectDateForScheduleModal from '../../modals/SelectDateForScheduleModal';
import Layout from '@/layout/Layout';
import { scheduleAPI } from '../../services/api';

const ScheduleManagementPage = (props) => {
  const [activeView, setActiveView] = useState('daily');
  const [previewData, setPreviewData] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [basicSchedules, setBasicSchedules] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);

  // View-specific state
  const [currentDate, setCurrentDate] = useState(new Date().toISOString().split('T')[0]);
  const [dailySortConfig, setDailySortConfig] = useState({ key: 'name', direction: 'ascending' });
  const [positionFilter, setPositionFilter] = useState('');
  const [listSearchTerm, setListSearchTerm] = useState('');
  const [listSortConfig, setListSortConfig] = useState({ key: 'date', direction: 'descending' });
  const [templateSearchTerm, setTemplateSearchTerm] = useState('');
  
  // Modal State
  const [showCreateTemplateModal, setShowCreateTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [showEditScheduleModal, setShowEditScheduleModal] = useState(false);
  const [editingScheduleDate, setEditingScheduleDate] = useState(null);
  const [showSelectDateModal, setShowSelectDateModal] = useState(false);
  const [creationSource, setCreationSource] = useState(null);
  
  // Fetch basic schedule data for list view
  useEffect(() => {
    const fetchBasicSchedules = async () => {
      try {
        setLoading(true);
        const basicSchedulesResponse = await scheduleAPI.getAllBasic();
        
        // Set basic schedule data for list view
         console.log('Basic schedules response:', basicSchedulesResponse.data);
         setBasicSchedules(basicSchedulesResponse.data || []);
        
        // Also fetch detailed data for the current date if needed
        const detailedResponse = await scheduleAPI.getAll();
        
        // Transform the detailed data for daily view
        const transformedSchedules = [];
        if (detailedResponse.data && detailedResponse.data.schedules) {
          detailedResponse.data.schedules.forEach(schedule => {
            schedule.assignments.forEach(assignment => {
              transformedSchedules.push({
                id: assignment.id,
                date: schedule.date,
                name: schedule.name,
                user_name: assignment.user_name,
                employee_id: assignment.employee_id,
                position_name: assignment.position_name,
                start_time: assignment.start_time,
                end_time: assignment.end_time,
                notes: assignment.notes
              });
            });
          });
        }
        
        setSchedules(transformedSchedules);
        setTemplates(detailedResponse.data.templates || []);
        setEmployees(detailedResponse.data.employees || []);
        setPositions(detailedResponse.data.positions || []);
      } catch (error) {
        console.error('Error fetching schedule data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchBasicSchedules();
  }, []);
  
  const formatTimeToAMPM = (timeString) => {
    if (!timeString) return '---';
    try {
      // Handle ISO datetime strings by extracting time portion
      let timeOnly = timeString;
      if (timeString.includes('T')) {
        // Extract time from ISO datetime (e.g., '2025-08-13T07:00:00.000000Z' -> '07:00:00')
        timeOnly = timeString.split('T')[1].split('.')[0];
      }
      
      const [hours, minutes] = timeOnly.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      let displayHour = hour;
      if (hour === 0) {
        displayHour = 12; // 00:xx becomes 12:xx AM
      } else if (hour > 12) {
        displayHour = hour - 12; // 13:xx becomes 1:xx PM, 14:xx becomes 2:xx PM, etc.
      }
      return `${displayHour}:${minutes} ${ampm}`;
    } catch (error) {
      console.error('Error in formatTimeToAMPM:', error);
      return timeString; // Return original if parsing fails
    }
  };

  // --- MEMOIZED DATA & DERIVED STATE ---
  // Use basicSchedules for list view with correct employee counts
  const schedulesByDate = useMemo(() => {
    console.log('Processing basicSchedules:', basicSchedules);
    const grouped = {};
    
    // Create grouped data from basicSchedules for list view
    (basicSchedules || []).forEach(schedule => {
      console.log('Processing schedule:', schedule);
      const normalizedDate = schedule.date instanceof Date ? schedule.date.toISOString().split('T')[0] : schedule.date.split('T')[0];
      grouped[normalizedDate] = {
        info: {
          id: schedule.id,
          name: schedule.name,
          date: normalizedDate,
          employeeCount: schedule.employees_count
        }
      };
      console.log('Created schedule info:', grouped[normalizedDate].info);
    });
    
    // Add detailed schedule data for daily view
    (schedules || []).forEach(sch => {
      const normalizedDate = sch.date instanceof Date ? sch.date.toISOString().split('T')[0] : sch.date.split('T')[0];
      if (!grouped[normalizedDate]) {
        grouped[normalizedDate] = { info: { name: sch.name, date: normalizedDate, employeeCount: 0 } };
      }
      (grouped[normalizedDate].assignments = grouped[normalizedDate].assignments || []).push(sch);
    });
    
    return grouped;
  }, [schedules, basicSchedules]);
  
  const scheduledEmployeesForDate = useMemo(() => {
    return (schedulesByDate[currentDate]?.assignments || []).map(schedule => ({ ...schedule }));
  }, [currentDate, schedulesByDate]);
  
  const sortedAndFilteredDailyEmployees = useMemo(() => {
    let employeesToProcess = [...scheduledEmployeesForDate];
    if (positionFilter) {
      employeesToProcess = employeesToProcess.filter(emp => emp.position === positionFilter);
    }
    if (dailySortConfig.key) {
      employeesToProcess.sort((a, b) => {
        const valA = String(a[dailySortConfig.key] || '').toLowerCase();
        const valB = String(b[dailySortConfig.key] || '').toLowerCase();
        if (valA < valB) return dailySortConfig.direction === 'ascending' ? -1 : 1;
        if (valA > valB) return dailySortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }
    return employeesToProcess;
  }, [scheduledEmployeesForDate, positionFilter, dailySortConfig]);
  
  const sortedAndFilteredSchedules = useMemo(() => {
    let scheds = Object.values(schedulesByDate).map(s => s.info);
    if (listSearchTerm) {
      scheds = scheds.filter(s => s.name.toLowerCase().includes(listSearchTerm.toLowerCase()));
    }
    scheds.sort((a, b) => {
      let valA = a[listSortConfig.key];
      let valB = b[listSortConfig.key];
      if (listSortConfig.key === 'date') {
        valA = new Date(valA); valB = new Date(valB);
      } else {
        valA = String(valA).toLowerCase(); valB = String(valB).toLowerCase();
      }
      if (valA < valB) return listSortConfig.direction === 'ascending' ? -1 : 1;
      if (valA > valB) return listSortConfig.direction === 'ascending' ? 1 : -1;
      return 0;
    });
    return scheds;
  }, [schedulesByDate, listSearchTerm, listSortConfig]);
  
  const listSortLabel = useMemo(() => {
    const { key, direction } = listSortConfig;
    if (key === 'date' && direction === 'descending') return 'Date (Newest First)';
    if (key === 'date' && direction === 'ascending') return 'Date (Oldest First)';
    if (key === 'name' && direction === 'ascending') return 'Name (A-Z)';
    if (key === 'name' && direction === 'descending') return 'Name (Z-A)';
    return 'Sort by';
  }, [listSortConfig]);

  const filteredTemplates = useMemo(() => {
    if (!templateSearchTerm) return templates;
    return templates.filter(tpl => tpl.name.toLowerCase().includes(templateSearchTerm.toLowerCase()));
  }, [templates, templateSearchTerm]);

  // No dynamic columns needed, we know the fields
  const dailyViewColumns = [
    { key: 'user_name', name: 'Employee Name' },
    { key: 'employee_id', name: 'Employee ID' },
    { key: 'position_name', name: 'Position' },
    { key: 'start_time', name: 'Start Time' },
    { key: 'end_time', name: 'End Time' },
  ];
  
  const positionsOnDate = useMemo(() => {
    const positions = new Set(scheduledEmployeesForDate.map(e => e.position));
    return ['All Positions', ...Array.from(positions).sort()];
  }, [scheduledEmployeesForDate]);

  const existingScheduleDatesSet = useMemo(() => new Set(Object.keys(schedulesByDate)), [schedulesByDate]);

  // --- HANDLERS ---
  const handleOpenCreateTemplateModal = (template = null) => { setEditingTemplate(template); setShowCreateTemplateModal(true); };
  const handleCloseCreateTemplateModal = () => { setShowCreateTemplateModal(false); setEditingTemplate(null); };
  const handleSaveAndCloseTemplateModal = async (formData, templateId) => {
    try {
      // TODO: Implement template API when available
      console.log('Template save:', formData, templateId);
      // await templateAPI.create(formData) or templateAPI.update(templateId, formData)
    } catch (error) {
      console.error('Error saving template:', error);
    }
    handleCloseCreateTemplateModal();
  };
  
  const handleCreateSchedule = async (scheduleData) => {
    try {
      await scheduleAPI.create(scheduleData);
      // Refresh data after creation
      const response = await scheduleAPI.getAll();
      const transformedSchedules = [];
      if (response.data && response.data.schedules) {
        response.data.schedules.forEach(schedule => {
        schedule.assignments.forEach(assignment => {
          transformedSchedules.push({
            id: assignment.id,
            date: schedule.date,
            name: schedule.name,
            user_name: assignment.user_name,
            employee_id: assignment.employee_id,
            position_name: assignment.position_name,
            start_time: assignment.start_time,
            end_time: assignment.end_time,
            notes: assignment.notes
          });
          });
        });
      }
      setSchedules(transformedSchedules);
    } catch (error) {
      console.error('Error creating schedule:', error);
    }
  };
  
  const handleUpdateSchedule = async (scheduleId, scheduleData) => {
    try {
      await scheduleAPI.update(scheduleId, scheduleData);
      // Refresh data after update
      const response = await scheduleAPI.getAll();
      const transformedSchedules = [];
      if (response.data && response.data.schedules) {
        response.data.schedules.forEach(schedule => {
        schedule.assignments.forEach(assignment => {
          transformedSchedules.push({
            id: assignment.id,
            date: schedule.date,
            name: schedule.name,
            user_name: assignment.user_name,
            employee_id: assignment.employee_id,
            position_name: assignment.position_name,
            start_time: assignment.start_time,
            end_time: assignment.end_time,
            notes: assignment.notes
          });
          });
        });
      }
      setSchedules(transformedSchedules);
    } catch (error) {
      console.error('Error updating schedule:', error);
    }
  };
  
  const handleDeleteSchedule = async (scheduleId) => {
    try {
      await scheduleAPI.delete(scheduleId);
      // Refresh data after deletion
      const response = await scheduleAPI.getAll();
      const transformedSchedules = [];
      if (response.data && response.data.schedules) {
        response.data.schedules.forEach(schedule => {
        schedule.assignments.forEach(assignment => {
          transformedSchedules.push({
            id: assignment.id,
            date: schedule.date,
            name: schedule.name,
            user_name: assignment.user_name,
            employee_id: assignment.employee_id,
            position_name: assignment.position_name,
            start_time: assignment.start_time,
            end_time: assignment.end_time,
            notes: assignment.notes
          });
          });
        });
      }
      setSchedules(transformedSchedules);
    } catch (error) {
      console.error('Error deleting schedule:', error);
    }
  };

  const handleOpenEditScheduleModal = (date) => { setEditingScheduleDate(date); setShowEditScheduleModal(true); };
  const handleCloseEditScheduleModal = () => { setEditingScheduleDate(null); setShowEditScheduleModal(false); };
  const handleSaveAndCloseEditModal = (date, updatedEntries) => {
    // This function will need to be updated to use React Router's navigate
    // For now, it will just console.log and not navigate
    console.log('Saving schedule for date:', date, 'with updated entries:', updatedEntries);
    // In a real application, you would use navigate('/dashboard/schedule-management/update', { state: { date, schedules: updatedEntries } });
  };
  
  const handleStartCreationFlow = (source) => {
    setCreationSource(source);
    setShowSelectDateModal(true);
  };

  const handleProceedToBuilder = (selectedDate) => {
    // This function will need to be updated to use React Router's navigate
    // For now, it will just console.log and not navigate
    console.log('Proceeding to builder with selected date:', selectedDate, 'and creation source:', creationSource);
    // In a real application, you would use navigate('/dashboard/schedule-management/create', { state: { date: selectedDate, method: creationSource.type, sourceData: creationSource.data } });
  };

  const getSortIcon = (key, config) => {
    if (config.key !== key) return <i className="bi bi-arrow-down-up sort-icon ms-1"></i>;
    return config.direction === 'ascending' ? <i className="bi bi-sort-up sort-icon active ms-1"></i> : <i className="bi bi-sort-down sort-icon active ms-1"></i>;
  };
  
  const requestDailySort = (key) => {
    let direction = 'ascending';
    if (dailySortConfig.key === key && dailySortConfig.direction === 'ascending') { direction = 'descending'; }
    setDailySortConfig({ key, direction });
  };

  // --- RENDER FUNCTIONS ---
  const renderPreviewScreen = () => {
    if (!previewData) return null;
    const isTemplate = previewData.type === 'template';
    const title = isTemplate ? previewData.name : previewData.info.name;
    const subtitle = isTemplate ? previewData.description : `Schedule for ${new Date(previewData.info.date + 'T00:00:00').toLocaleDateString()}`;
    const dataForTable = isTemplate ? [] : schedulesByDate[previewData.info.date] || [];
    const columnsForTable = isTemplate ? previewData.columns : previewData.info.columns;
    return (
      <div className="schedule-preview-container">
          <div className="schedule-preview-header">
              <div>
                  <button className="btn btn-sm btn-outline-secondary mb-3" onClick={() => setPreviewData(null)}><i className="bi bi-arrow-left me-2"></i>Back</button>
                  <h2 className="preview-title">{title}</h2>
                  <p className="preview-subtitle">{subtitle}</p>
              </div>
              <div className="preview-actions">
                  <button className="btn btn-success" onClick={() => handleStartCreationFlow({ type: isTemplate ? 'template' : 'copy', data: isTemplate ? previewData : schedulesByDate[previewData.info.date] })}>
                      <i className="bi bi-calendar-plus-fill me-2"></i>Use this Structure
                  </button>
              </div>
          </div>
          {isTemplate ? (
              <>
                  <h5 className="mb-3">Template Structure</h5>
                  <div className="table-responsive">
                      <table className="table template-preview-table">
                          <thead><tr>{(columnsForTable || []).map(key => <th key={key}>{key.charAt(0).toUpperCase() + key.slice(1)}</th>)}</tr></thead>
                          <tbody><tr><td colSpan={(columnsForTable || []).length} className="text-center">This is a template. It defines columns but contains no employee data.</td></tr></tbody>
                      </table>
                  </div>
              </>
          ) : (
              <>
                  <p className="fw-bold">This schedule includes the following employees:</p>
                  <div className="table-responsive schedule-preview-table">
                      <table className="table table-sm table-striped">
                          <thead>
                              <tr>
                                  <th>Employee ID</th><th>Employee Name</th><th>Position</th>
                                  {(columnsForTable || []).map(key => <th key={key}>{key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ')}</th>)}
                              </tr>
                          </thead>
                          <tbody>
                              {dataForTable.map(emp => (
                                  <tr key={emp.employee_id}>
                                      <td>{emp.employee_id}</td><td>{emp.user_name}</td><td>{emp.position_name || 'Unassigned'}</td>
                                      {(columnsForTable || []).map(key => {
                                        const value = emp[key];
                                        if (key === 'start_time' || key === 'end_time') {
                                          return <td key={key}>{formatTimeToAMPM(value)}</td>;
                                        }
                                        return <td key={key}>{value || '---'}</td>;
                                      })}
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              </>
          )}
      </div>
    );
  };
  
  const renderMainContent = () => {
    switch(activeView) {
      case 'daily':
        return (
          <>
            <div className="daily-view-header">
              <h4 className="daily-view-title">Daily Schedule</h4>
              <div className="daily-view-controls">
                <input type="date" className="form-control form-control-lg" value={currentDate} onChange={(e) => setCurrentDate(e.target.value)} />
                {scheduledEmployeesForDate.length > 0 && (
                  <button className="btn btn-lg btn-outline-secondary" onClick={() => handleOpenEditScheduleModal(currentDate)} title="Edit Schedule">
                    <i className="bi bi-pencil-fill"></i>
                  </button>
                )}
              </div>
            </div>
            {sortedAndFilteredDailyEmployees.length > 0 ? (
              <>
                <div className="card data-table-card shadow-sm"><div className="card-body p-0"><div className="table-responsive">
                    <table className="table data-table mb-0">
                        <thead>
                            <tr>
                              {dailyViewColumns.map(col => <th key={col.key}>{col.name}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {sortedAndFilteredDailyEmployees.map((sch, idx) => (
                                <tr key={idx}>
                                  {dailyViewColumns.map(col => {
                                    const value = sch[col.key];
                                    if (col.key === 'start_time' || col.key === 'end_time') {
                                      return <td key={col.key}>{formatTimeToAMPM(value)}</td>;
                                    }
                                    return <td key={col.key}>{value || '---'}</td>;
                                  })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div></div></div>
              </>
            ) : (
                <div className="text-center p-5 bg-light rounded">
                    <i className="bi bi-calendar2-x fs-1 text-muted mb-3 d-block"></i>
                    <h4 className="text-muted">{scheduledEmployeesForDate.length > 0 && positionFilter ? 'No employees match the filter.' : `No schedule created for ${new Date(currentDate + 'T00:00:00').toLocaleDateString()}.`}</h4>
                </div>
            )}
          </>
        );
      case 'list':
        return (
          <div className="schedule-list-container">
            <div className="schedule-list-controls">
                <div className="input-group">
                    <span className="input-group-text"><i className="bi bi-search"></i></span>
                    <input type="text" className="form-control" placeholder="Search by schedule name..." value={listSearchTerm} onChange={(e) => setListSearchTerm(e.target.value)} />
                </div>
                <div className="dropdown sort-dropdown">
                    <button className="btn btn-outline-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                        <i className="bi bi-funnel me-2"></i>{listSortLabel}
                    </button>
                    <ul className="dropdown-menu dropdown-menu-end">
                        <li><h6 className="dropdown-header">Sort by Date</h6></li>
                        <li><a className={`dropdown-item ${listSortConfig.key === 'date' && listSortConfig.direction === 'descending' ? 'active' : ''}`} href="#" onClick={(e) => {e.preventDefault(); setListSortConfig({ key: 'date', direction: 'descending' });}}>Newest First</a></li>
                        <li><a className={`dropdown-item ${listSortConfig.key === 'date' && listSortConfig.direction === 'ascending' ? 'active' : ''}`} href="#" onClick={(e) => {e.preventDefault(); setListSortConfig({ key: 'date', direction: 'ascending' });}}>Oldest First</a></li>
                        <li><hr className="dropdown-divider"/></li>
                        <li><h6 className="dropdown-header">Sort by Name</h6></li>
                        <li><a className={`dropdown-item ${listSortConfig.key === 'name' && listSortConfig.direction === 'ascending' ? 'active' : ''}`} href="#" onClick={(e) => {e.preventDefault(); setListSortConfig({ key: 'name', direction: 'ascending' });}}>A to Z</a></li>
                        <li><a className={`dropdown-item ${listSortConfig.key === 'name' && listSortConfig.direction === 'descending' ? 'active' : ''}`} href="#" onClick={(e) => {e.preventDefault(); setListSortConfig({ key: 'name', direction: 'descending' });}}>Z to A</a></li>
                    </ul>
                </div>
            </div>
            <div className="schedule-card-grid mt-3">
                {sortedAndFilteredSchedules.length > 0 ? sortedAndFilteredSchedules.map(scheduleInfo => (
                    <div key={scheduleInfo.date} className="schedule-item-card type-schedule">
                        <div className="card-header"><h5 className="card-title">{scheduleInfo.name}</h5></div>
                        <div className="card-body">
                            <div className="info-row"><span className="info-label">Date:</span><span className="info-value">{new Date(scheduleInfo.date).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' })}</span></div>
                            <div className="info-row"><span className="info-label">Employees Scheduled:</span><span className="info-value">{scheduleInfo.employeeCount}</span></div>
                        </div>
                        <div className="card-footer">
                            <button className="btn btn-sm btn-outline-secondary" onClick={() => handleOpenEditScheduleModal(scheduleInfo.date)}>Edit</button>
                            <button className="btn btn-sm btn-success" onClick={() => setPreviewData({ info: scheduleInfo, type: 'schedule' })}>View Details</button>
                        </div>
                    </div>
                )) : <div className="w-100"><p className="text-muted text-center mt-4">No schedules match your search.</p></div>}
            </div>
          </div>
        );
      case 'templates':
        return (
          <div className="templates-container">
            <div className="schedule-list-controls">
                <div className="input-group" style={{maxWidth: '400px'}}>
                    <span className="input-group-text"><i className="bi bi-search"></i></span>
                    <input type="text" className="form-control" placeholder="Search by template name..." value={templateSearchTerm} onChange={(e) => setTemplateSearchTerm(e.target.value)} />
                </div>
            </div>
            <div className="schedule-card-grid mt-3">
                <div className="schedule-item-card" style={{borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', minHeight: '220px', cursor: 'pointer'}} onClick={() => handleOpenCreateTemplateModal()}>
                    <div className="text-center text-muted"><i className="bi bi-plus-square-dotted fs-2"></i><p className="mt-2 mb-0 fw-bold">Create New Template</p></div>
                </div>
                {filteredTemplates.length > 0 ? filteredTemplates.map(tpl => (
                    <div key={tpl.id} className="schedule-item-card type-template">
                        <div className="card-header"><h5 className="card-title">{tpl.name}</h5></div>
                        <div className="card-body">
                            <dl className="mb-0">
                                <div className="template-info-section"><dt>Columns</dt><dd>{(tpl.columns || []).map(c => <span key={c} className="badge bg-secondary">{c.charAt(0).toUpperCase() + c.slice(1)}</span>)}</dd></div>
                                <div className="template-info-section"><dt>Applies to Positions</dt><dd>{(tpl.applicablePositions || []).map(p => <span key={p} className="badge bg-dark">{p}</span>)}</dd></div>
                            </dl>
                        </div>
                        <div className="card-footer">
                            <button className="btn btn-sm btn-outline-secondary" onClick={() => handleOpenCreateTemplateModal(tpl)}>Edit</button>
                            <button className="btn btn-sm btn-success" onClick={() => setPreviewData({ ...tpl, type: 'template' })}>View Details</button>
                        </div>
                    </div>
                )) : <div className="w-100"><p className="text-muted text-center mt-4">No templates match your search.</p></div>}
            </div>
          </div>
        );
      default: return null;
    }
  };

  // --- Main Component Return ---
  if (loading) {
    return (
      <div className="container-fluid page-module-container p-lg-4 p-md-3 p-2">
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container-fluid page-module-container p-lg-4 p-md-3 p-2">
      {previewData ? renderPreviewScreen() : (
        <>
            <header className="page-header d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4">
                <h1 className="page-main-title mb-3 mb-md-0">Schedule Management</h1>
                <div className="header-actions">
                    <button className="btn btn-success action-button-primary" onClick={() => handleStartCreationFlow({ type: 'scratch' })}>
                        <i className="bi bi-plus-circle-fill"></i> New Schedule
                    </button>
                </div>
            </header>

            <div className="schedule-view-controls">
                <button className={`btn ${activeView === 'daily' ? 'active' : ''}`} onClick={() => setActiveView('daily')}><i className="bi bi-calendar-day me-2"></i>Daily View</button>
                <button className={`btn ${activeView === 'list' ? 'active' : ''}`} onClick={() => setActiveView('list')}><i className="bi bi-calendar-range me-2"></i>Schedule List</button>
                <button className={`btn ${activeView === 'templates' ? 'active' : ''}`} onClick={() => setActiveView('templates')}><i className="bi bi-file-earmark-spreadsheet me-2"></i>Templates</button>
            </div>
            
            <div className="mt-4">
                {renderMainContent()}
            </div>
        </>
      )}

      {/* --- MODALS --- */}
      {showCreateTemplateModal && ( <CreateTemplateModal show={showCreateTemplateModal} onClose={handleCloseCreateTemplateModal} onSave={handleSaveAndCloseTemplateModal} positions={[]} templateData={editingTemplate} /> )}
      {showEditScheduleModal && editingScheduleDate && ( <EditScheduleModal show={showEditScheduleModal} onClose={handleCloseEditScheduleModal} onSave={handleSaveAndCloseEditModal} scheduleId={schedulesByDate[editingScheduleDate]?.info?.id} scheduleDate={editingScheduleDate} allEmployees={employees} positions={positions} /> )}
      {showSelectDateModal && ( <SelectDateForScheduleModal show={showSelectDateModal} onClose={() => setShowSelectDateModal(false)} onProceed={handleProceedToBuilder} existingScheduleDates={existingScheduleDatesSet} />)}
    </div>
  );
};

export default ScheduleManagementPage;
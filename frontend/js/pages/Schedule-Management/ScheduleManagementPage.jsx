import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './ScheduleManagementPage.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import CreateTemplateModal from '../../modals/CreateTemplateModal';
import EditScheduleModal from '../../modals/EditScheduleModal';
import SelectDateForScheduleModal from '../../modals/SelectDateForScheduleModal';
import ConfirmationModal from '../../modals/ConfirmationModal';
import Layout from '@/layout/Layout';
import { scheduleAPI, templateAPI, employeeAPI, positionAPI } from '../../services/api';
import ToastNotification from '../../common/ToastNotification';

const ScheduleManagementPage = (props) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [schedules, setSchedules] = useState([]);
  const [basicSchedules, setBasicSchedules] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeView, setActiveView] = useState('daily');
  const [previewData, setPreviewData] = useState(null);
  const [activeTab, setActiveTab] = useState('schedules');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'descending' });
  const [itemToDelete, setItemToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editingType, setEditingType] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

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

  // Check for success message from navigation state
  useEffect(() => {
    if (location.state?.successMessage) {
      setToast({
        show: true,
        message: location.state.successMessage,
        type: 'success'
      });
      // Clear the navigation state to prevent showing the message again
      navigate(location.pathname, { replace: true });
    }
  }, [location.state, navigate, location.pathname]);

  // Fetch all data
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setLoading(true);
        const [schedulesRes, templatesRes, employeesRes, positionsRes] = await Promise.all([
          scheduleAPI.getAll(),
          templateAPI.getAll(),
          employeeAPI.getAll(),
          positionAPI.getAll()
        ]);

        // Transform schedules data
        const transformedSchedules = [];
        const scheduleMap = new Map();
        if (schedulesRes.data && schedulesRes.data.schedules) {
          schedulesRes.data.schedules.forEach(schedule => {
            // Add to basic schedules map using actual schedule ID
            const key = `${schedule.date}-${schedule.name}`;
            if (!scheduleMap.has(key)) {
              scheduleMap.set(key, {
                id: schedule.id, // Use actual schedule ID, not assignment ID
                date: schedule.date,
                name: schedule.name,
                employees_count: 0
              });
            }
            
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
              
              // Increment employee count for this schedule
              scheduleMap.get(key).employees_count++;
            });
          });
        }
        setSchedules(transformedSchedules);
        setBasicSchedules(Array.from(scheduleMap.values()));

        // Set other data
        setTemplates(Array.isArray(templatesRes.data) ? templatesRes.data : (templatesRes.data?.data || []));
        
        const empData = Array.isArray(employeesRes.data) ? employeesRes.data : (employeesRes.data?.data || []);
        const posData = Array.isArray(positionsRes.data) ? positionsRes.data : (positionsRes.data?.data || []);
        
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
        
        setError(null);
      } catch (err) {
        setError('Failed to load data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, []);
  
  const formatTimeToAMPM = (timeString) => {
    console.log('formatTimeToAMPM called with:', timeString, 'type:', typeof timeString);
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
      const result = `${displayHour}:${minutes} ${ampm}`;
      console.log('formatTimeToAMPM result:', result);
      return result;
    } catch (error) {
      console.log('formatTimeToAMPM error:', error);
      return timeString; // Return original if parsing fails
    }
  };

  // --- MEMOIZED DATA & DERIVED STATE ---
  // Use basicSchedules for list view with correct employee counts
  const schedulesByDate = useMemo(() => {
    
    const grouped = {};
    
    // Create grouped data from basicSchedules for list view
    (basicSchedules || []).forEach(schedule => {
      
      const normalizedDate = schedule.date instanceof Date ? schedule.date.toISOString().split('T')[0] : schedule.date.split('T')[0];
      grouped[normalizedDate] = {
        info: {
          id: schedule.id,
          name: schedule.name,
          date: normalizedDate,
          employeeCount: schedule.employees_count
        }
      };
      
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
      
      // await templateAPI.create(formData) or templateAPI.update(templateId, formData)
    } catch (error) {
    }
    handleCloseCreateTemplateModal();
  };
  
  const handleDeleteTemplate = async (templateId) => {
    if (isDeleting) return; // Prevent double-click
    
    setIsDeleting(true);
    try {
      // TODO: Implement template API when available
      // await templateAPI.delete(templateId);
      
      // For now, just remove from local state
      setTemplates(prev => prev.filter(template => template.id !== templateId));
    } catch (error) {
      if (error.response?.status === 404) {
        alert('Template not found. It may have already been deleted.');
        // Refresh data to sync with server state
        await loadData();
      } else {
        alert('Failed to delete template. Please try again.');
      }
      throw error;
    } finally {
      setIsDeleting(false);
    }
  };
  
  const handleCreateSchedule = async (scheduleData) => {
    try {
      await scheduleAPI.create(scheduleData);
      // Refresh data after creation
      const response = await scheduleAPI.getAll();
      const transformedSchedules = [];
      const scheduleMap = new Map();
      if (response.data && response.data.schedules) {
        response.data.schedules.forEach(schedule => {
          // Add to basic schedules map using actual schedule ID
          const key = `${schedule.date}-${schedule.name}`;
          if (!scheduleMap.has(key)) {
            scheduleMap.set(key, {
              id: schedule.id, // Use actual schedule ID, not assignment ID
              date: schedule.date,
              name: schedule.name,
              employees_count: 0
            });
          }
          
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
            
            // Increment employee count for this schedule
            scheduleMap.get(key).employees_count++;
          });
        });
      }
      setSchedules(transformedSchedules);
      setBasicSchedules(Array.from(scheduleMap.values()));
    } catch (error) {
    }
  };
  
  const handleUpdateSchedule = async (scheduleId, scheduleData) => {
    try {
      await scheduleAPI.update(scheduleId, scheduleData);
      // Refresh data after update
      const response = await scheduleAPI.getAll();
      const transformedSchedules = [];
      const scheduleMap = new Map();
      if (response.data && response.data.schedules) {
        response.data.schedules.forEach(schedule => {
          // Add to basic schedules map using actual schedule ID
          const key = `${schedule.date}-${schedule.name}`;
          if (!scheduleMap.has(key)) {
            scheduleMap.set(key, {
              id: schedule.id, // Use actual schedule ID, not assignment ID
              date: schedule.date,
              name: schedule.name,
              employees_count: 0
            });
          }
          
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
            
            // Increment employee count for this schedule
            scheduleMap.get(key).employees_count++;
          });
        });
      }
      setSchedules(transformedSchedules);
      setBasicSchedules(Array.from(scheduleMap.values()));
    } catch (error) {
    }
  };
  
  const handleDeleteSchedule = async (scheduleId) => {
    if (isDeleting) return; // Prevent double-click
    
    setIsDeleting(true);
    try {
      await scheduleAPI.delete(scheduleId);
      // Refresh data after deletion
      const response = await scheduleAPI.getAll();
      const transformedSchedules = [];
      const scheduleMap = new Map();
      if (response.data && response.data.schedules) {
        response.data.schedules.forEach(schedule => {
          // Add to basic schedules map using actual schedule ID
          const key = `${schedule.date}-${schedule.name}`;
          if (!scheduleMap.has(key)) {
            scheduleMap.set(key, {
              id: schedule.id, // Use actual schedule ID, not assignment ID
              date: schedule.date,
              name: schedule.name,
              employees_count: 0
            });
          }
          
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
            
            // Increment employee count for this schedule
            scheduleMap.get(key).employees_count++;
          });
        });
      }
      setSchedules(transformedSchedules);
      setBasicSchedules(Array.from(scheduleMap.values()));
    } catch (error) {
      if (error.response?.status === 404) {
        alert('Schedule not found. It may have already been deleted.');
        // Refresh data to sync with server state
        await loadData();
      } else {
        alert('Failed to delete schedule. Please try again.');
      }
      throw error;
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenEditScheduleModal = (date) => { setEditingScheduleDate(date); setShowEditScheduleModal(true); };
  const handleCloseEditScheduleModal = () => { setEditingScheduleDate(null); setShowEditScheduleModal(false); };
  const handleSaveAndCloseEditModal = (date, updatedEntries) => {
    // This function will need to be updated to use React Router's navigate
    // For now, it will just log and not navigate
    // In a real application, you would use navigate('/dashboard/schedule-management/update', { state: { date, schedules: updatedEntries } });
  };
  
  const handleStartCreationFlow = (source) => {
    setCreationSource(source);
    setShowSelectDateModal(true);
  };

  const handleProceedToBuilder = (selectedDate) => {
    navigate('/dashboard/schedule-management/create', { 
      state: { 
        date: selectedDate, 
        method: creationSource.type, 
        sourceData: creationSource.data 
      } 
    });
    setShowSelectDateModal(false);
  };

  const handleOpenDeleteConfirm = (item, type) => {
    setItemToDelete({ item, type });
  };
  
  const handleConfirmDelete = async () => {
    if (isDeleting) return; // Prevent double-click
    
    try {
      if (itemToDelete.type === 'schedule') {
        await handleDeleteSchedule(itemToDelete.item.id);
      } else if (itemToDelete.type === 'template') {
        await handleDeleteTemplate(itemToDelete.item.id);
      }
    } catch (error) {
      // Error handling is already done in individual delete functions
    }
    setItemToDelete(null);
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
    const dataForTable = isTemplate ? [] : schedulesByDate[previewData.info.date]?.assignments || [];
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
                  <button className="btn btn-success" onClick={() => handleStartCreationFlow({ type: isTemplate ? 'template' : 'copy', data: isTemplate ? previewData : schedulesByDate[previewData.info.date]?.assignments || [] })}>
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
                                  <th>Start Time</th><th>End Time</th>
                                  {(columnsForTable || []).map(key => <th key={key}>{key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ')}</th>)}
                              </tr>
                          </thead>
                          <tbody>
                              {dataForTable.map(emp => (
                                  <tr key={emp.employee_id}>
                                      <td>{emp.employee_id}</td><td>{emp.user_name}</td><td>{emp.position_name || 'Unassigned'}</td>
                                      <td>{formatTimeToAMPM(emp.start_time)}</td>
                                      <td>{formatTimeToAMPM(emp.end_time)}</td>
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
                            <button className="btn btn-sm btn-outline-danger" onClick={() => handleOpenDeleteConfirm(scheduleInfo, 'schedule')}>Delete</button>
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
                            <button className="btn btn-sm btn-outline-danger" onClick={() => handleOpenDeleteConfirm(tpl, 'template')}>Delete</button>
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

  return (
    <div className="container-fluid page-module-container p-lg-4 p-md-3 p-2">
      <header className="page-header d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4">
        <h1 className="page-main-title mb-3 mb-md-0">Schedule Management</h1>
        <div className="header-actions">
          <button className="btn btn-success action-button-primary" onClick={() => handleStartCreationFlow({ type: 'scratch' })}>
            <i className="bi bi-plus-circle-fill"></i> New Schedule
          </button>
        </div>
      </header>

      {loading && (
        <div className="text-center p-5">
          <div className="spinner-border text-success" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3 text-muted">Loading schedule data...</p>
        </div>
      )}

      {error && (
        <div className="text-center p-5">
          <i className="bi bi-exclamation-triangle fs-1 text-danger mb-3 d-block"></i>
          <h4 className="text-danger">Error Loading Data</h4>
          <p className="text-muted">{error}</p>
          <button 
            className="btn btn-primary" 
            onClick={() => window.location.reload()}
          >
            Try Again
          </button>
        </div>
      )}

      {!loading && !error && (
         <>
           {previewData ? renderPreviewScreen() : (
             <>
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
         </>
       )}

      <ConfirmationModal
        show={!!itemToDelete}
        onClose={() => !isDeleting && setItemToDelete(null)}
        onConfirm={handleConfirmDelete}
        title={`Confirm ${itemToDelete?.type === 'template' ? 'Template' : 'Schedule'} Deletion`}
        confirmText={isDeleting ? 'Deleting...' : 'Yes, Delete'}
        confirmVariant="danger"
        disabled={isDeleting}
      >
        {itemToDelete?.type === 'template' ? (
          <>
            <p>Are you sure you want to permanently delete the template <strong>{itemToDelete?.item?.name}</strong>?</p>
            <p className="text-danger">This action cannot be undone and will affect any schedules using this template.</p>
          </>
        ) : (
          <>
            <p>Are you sure you want to permanently delete the schedule for <strong>{itemToDelete?.item?.date ? new Date(itemToDelete.item.date + 'T00:00:00').toLocaleDateString() : 'this date'}</strong>?</p>
            <p className="text-danger">This action cannot be undone and will remove all employee assignments for this date.</p>
          </>
        )}
      </ConfirmationModal>

      {/* --- MODALS --- */}
      {showCreateTemplateModal && ( <CreateTemplateModal show={showCreateTemplateModal} onClose={handleCloseCreateTemplateModal} onSave={handleSaveAndCloseTemplateModal} positions={[]} templateData={editingTemplate} /> )}
      {showEditScheduleModal && editingScheduleDate && ( <EditScheduleModal show={showEditScheduleModal} onClose={handleCloseEditScheduleModal} onSave={handleSaveAndCloseEditModal} scheduleId={schedulesByDate[editingScheduleDate]?.info?.id} scheduleDate={editingScheduleDate} allEmployees={employees} positions={positions} /> )}
      {showSelectDateModal && ( <SelectDateForScheduleModal show={showSelectDateModal} onClose={() => setShowSelectDateModal(false)} onProceed={handleProceedToBuilder} existingScheduleDates={existingScheduleDatesSet} />)}
      
      {/* Toast Notification */}
      {toast.show && (
        <ToastNotification
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ ...toast, show: false })}
        />
      )}
    </div>
  );
};

export default ScheduleManagementPage;
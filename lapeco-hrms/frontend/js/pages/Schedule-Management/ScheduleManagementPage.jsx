import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './ScheduleManagementPage.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import CreateTemplateModal from '../../modals/CreateTemplateModal';
import EditScheduleModal from '../../modals/EditScheduleModal';
import SelectDateForScheduleModal from '../../modals/SelectDateForScheduleModal';
import ConfirmationModal from '../../modals/ConfirmationModal';
import Layout from '@/layout/Layout';
import { scheduleAPI, templateAPI } from '../../services/api';
import ToastNotification from '../../common/ToastNotification';
import DailyScheduleView from './DailyScheduleView';
import ScheduleListView from './ScheduleListView';
import ScheduleTemplatesView from './ScheduleTemplatesView';

const ScheduleManagementPage = (props) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [basicSchedules, setBasicSchedules] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
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
  const [scheduleDetailsByDate, setScheduleDetailsByDate] = useState({});
  const [dailyScheduleLoading, setDailyScheduleLoading] = useState(false);
  const [basicSchedulesLoading, setBasicSchedulesLoading] = useState(false);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templateDetailsById, setTemplateDetailsById] = useState({});
  const basicSchedulesFetchedRef = useRef(false);
  const templatesFetchedRef = useRef(false);
  const basicSchedulesLoadingRef = useRef(false);
  const templatesLoadingRef = useRef(false);
  const templateDetailsLoadingRef = useRef({});

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

  const refreshBasicSchedules = useCallback(async ({ force = false } = {}) => {
    if (!force && basicSchedulesFetchedRef.current) {
      return basicSchedules;
    }
    if (basicSchedulesLoadingRef.current) {
      return basicSchedules;
    }

    basicSchedulesLoadingRef.current = true;
    setBasicSchedulesLoading(true);
    try {
      const response = await scheduleAPI.getAllBasic();
      const rawSchedules = Array.isArray(response.data) ? response.data : (response.data?.schedules || []);
      const normalized = rawSchedules.map(item => ({
        id: item.id,
        name: item.name,
        date: normalizeScheduleDate(item.date),
        employeeCount: item.employees_count ?? item.employeeCount ?? 0
      }));
      basicSchedulesFetchedRef.current = true;
      setBasicSchedules(normalized);
      return normalized;
    } finally {
      basicSchedulesLoadingRef.current = false;
      setBasicSchedulesLoading(false);
    }
  }, [basicSchedules]);

  const refreshTemplates = useCallback(async ({ force = false } = {}) => {
    if (!force && templatesFetchedRef.current) {
      return templates;
    }
    if (templatesLoadingRef.current) {
      return templates;
    }

    templatesLoadingRef.current = true;
    setTemplatesLoading(true);
    try {
      const response = await templateAPI.getAll();
      const templatesData = Array.isArray(response.data) ? response.data : (response.data?.data || []);
      templatesFetchedRef.current = true;
      setTemplates(templatesData);
      return templatesData;
    } finally {
      templatesLoadingRef.current = false;
      setTemplatesLoading(false);
    }
  }, [templates]);

  const hasScheduleCacheEntry = useCallback((dateKey) => (
    Object.prototype.hasOwnProperty.call(scheduleDetailsByDate, dateKey)
  ), [scheduleDetailsByDate]);

  const loadScheduleForDate = useCallback(async (date, { force = false, showSpinner = false } = {}) => {
    const normalizedDate = normalizeScheduleDate(date);
    if (!normalizedDate) return null;

    if (!force && hasScheduleCacheEntry(normalizedDate)) {
      return scheduleDetailsByDate[normalizedDate];
    }

    if (showSpinner) {
      setDailyScheduleLoading(true);
    }

    try {
      const response = await scheduleAPI.getByDate(normalizedDate);
      const scheduleData = response.data?.schedule || null;

      const normalizedSchedule = scheduleData
        ? {
            ...scheduleData,
            date: normalizedDate,
            assignments: (scheduleData.assignments || []).map(assignment => ({
              ...assignment,
              date: normalizedDate
            }))
          }
        : null;

      setScheduleDetailsByDate(prev => ({
        ...prev,
        [normalizedDate]: normalizedSchedule
      }));

      return normalizedSchedule;
    } catch (err) {
      if (showSpinner) {
        setToast({ show: true, message: 'Failed to load schedule for the selected date.', type: 'error' });
      }
      throw err;
    } finally {
      if (showSpinner) {
        setDailyScheduleLoading(false);
      }
    }
  }, [scheduleDetailsByDate, hasScheduleCacheEntry, setToast]);

  const loadTemplateDetails = useCallback(async (templateId, { force = false } = {}) => {
    if (!templateId) return null;

    if (!force && templateDetailsById[templateId]) {
      return templateDetailsById[templateId];
    }

    if (templateDetailsLoadingRef.current[templateId]) {
      return templateDetailsById[templateId] || null;
    }

    templateDetailsLoadingRef.current[templateId] = true;
    try {
      const response = await templateAPI.getById(templateId);
      const templateData = response.data?.template || null;

      const normalizedTemplate = templateData
        ? (() => {
            let columns = templateData.columns;
            if (typeof columns === 'string') {
              try {
                columns = JSON.parse(columns);
              } catch (err) {
                columns = [];
              }
            }
            if (!Array.isArray(columns) && columns) {
              columns = Object.values(columns);
            }
            if (!Array.isArray(columns)) {
              columns = [];
            }

            const assignments = Array.isArray(templateData.assignments)
              ? templateData.assignments.map(assignment => ({
                  ...assignment,
                  user: assignment.user || null,
                }))
              : [];

            return {
              ...templateData,
              columns,
              assignments,
            };
          })()
        : null;

      setTemplateDetailsById(prev => ({
        ...prev,
        [templateId]: normalizedTemplate,
      }));

      return normalizedTemplate;
    } finally {
      delete templateDetailsLoadingRef.current[templateId];
    }
  }, [templateDetailsById]);

  useEffect(() => {
    setLoading(false);
    setError(null);
  }, []);

  useEffect(() => {
    if (activeView === 'list') {
      refreshBasicSchedules().catch(() => {});
    } else if (activeView === 'templates') {
      refreshTemplates().catch(() => {});
    }
  }, [activeView, refreshBasicSchedules, refreshTemplates]);

  useEffect(() => {
    if (!currentDate) return;
    loadScheduleForDate(currentDate, { showSpinner: activeView === 'daily' }).catch(() => {});
  }, [currentDate, loadScheduleForDate, activeView]);
  
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

  const normalizeScheduleDate = (dateValue) => {
    if (!dateValue) return '';
    if (dateValue instanceof Date) {
      const year = dateValue.getFullYear();
      const month = String(dateValue.getMonth() + 1).padStart(2, '0');
      const day = String(dateValue.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    const parsed = new Date(dateValue);
    if (!Number.isNaN(parsed.getTime())) {
      const year = parsed.getFullYear();
      const month = String(parsed.getMonth() + 1).padStart(2, '0');
      const day = String(parsed.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    if (typeof dateValue === 'string' && dateValue.includes('T')) {
      return dateValue.split('T')[0];
    }
    return dateValue;
  };

  // --- MEMOIZED DATA & DERIVED STATE ---
  const schedulesByDate = useMemo(() => {
    const grouped = {};
    (basicSchedules || []).forEach(schedule => {
      const normalizedDate = normalizeScheduleDate(schedule.date);
      grouped[normalizedDate] = {
        info: {
          id: schedule.id,
          name: schedule.name,
          date: normalizedDate,
          employeeCount: schedule.employeeCount ?? schedule.employees_count ?? 0
        }
      };
    });

    Object.entries(scheduleDetailsByDate || {}).forEach(([date, detail]) => {
      if (!detail) return;
      const normalizedDate = normalizeScheduleDate(date);
      const assignments = (detail.assignments || []).map(assignment => ({ ...assignment, date: normalizedDate }));
      if (!grouped[normalizedDate]) {
        grouped[normalizedDate] = {
          info: {
            id: detail.id,
            name: detail.name,
            date: normalizedDate,
            employeeCount: assignments.length
          }
        };
      } else {
        grouped[normalizedDate].info = {
          id: detail.id,
          name: detail.name,
          date: normalizedDate,
          employeeCount: assignments.length
        };
      }
      grouped[normalizedDate].assignments = assignments;
    });

    return grouped;
  }, [basicSchedules, scheduleDetailsByDate]);

  const scheduledEmployeesForDate = useMemo(() => {
    return (schedulesByDate[currentDate]?.assignments || []).map(schedule => ({ ...schedule }));
  }, [currentDate, schedulesByDate]);
  
  const sortedAndFilteredDailyEmployees = useMemo(() => {
    let employeesToProcess = [...scheduledEmployeesForDate];
    if (positionFilter) {
      employeesToProcess = employeesToProcess.filter(emp => emp.position_name === positionFilter);
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
    { key: 'break_start', name: 'Break Start' },
    { key: 'break_end', name: 'Break End' },
    { key: 'end_time', name: 'End Time' },
    { key: 'ot_hours', name: 'OT (hrs)' },
  ];
  
  const positionsOnDate = useMemo(() => {
    const positions = new Set(scheduledEmployeesForDate.map(e => e.position_name).filter(Boolean));
    return ['All Positions', ...Array.from(positions).sort()];
  }, [scheduledEmployeesForDate]);

  const existingScheduleDatesSet = useMemo(() => new Set(Object.keys(schedulesByDate)), [schedulesByDate]);

  const formatDateInMessage = useCallback((message) => {
    if (!message) return message;
    return message.replace(/(\d{4})-(\d{2})-(\d{2})/g, (_, year, month, day) => {
      const date = new Date(Number(year), Number(month) - 1, Number(day));
      if (Number.isNaN(date.getTime())) {
        return `${year}-${month}-${day}`;
      }
      return date.toLocaleDateString(undefined, {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    });
  }, []);

  // --- HANDLERS ---
  const handleOpenCreateTemplateModal = (template = null) => { setEditingTemplate(template); setShowCreateTemplateModal(true); };
  const handleCloseCreateTemplateModal = () => { setShowCreateTemplateModal(false); setEditingTemplate(null); };
  const handleSaveAndCloseTemplateModal = async (formData, templateId) => {
    try {
      if (templateId) {
        await templateAPI.update(templateId, formData);
        setToast({ show: true, message: 'Template updated successfully!', type: 'success' });
      } else {
        await templateAPI.create(formData);
        setToast({ show: true, message: 'Template created successfully!', type: 'success' });
      }

      await refreshTemplates({ force: true });
      handleCloseCreateTemplateModal();
      return true;
    } catch (error) {
      const message = error?.response?.data?.message || 'Failed to save template. Please try again.';
      setToast({ show: true, message, type: 'error' });
      return false;
    }
  };
  
  const handleDeleteTemplate = async (templateId) => {
    if (isDeleting) return; // Prevent double-click

    setIsDeleting(true);
    let deleteSucceeded = false;

    try {
      const response = await templateAPI.delete(templateId);
      const successMessage = formatDateInMessage(response?.data?.message || 'Template deleted successfully!');
      setToast({ show: true, message: successMessage, type: 'success' });
      deleteSucceeded = true;
    } catch (error) {
      const successMessage = error?.response?.data?.message;
      if (successMessage && successMessage.toLowerCase().includes('deleted successfully')) {
        setToast({ show: true, message: formatDateInMessage(successMessage), type: 'success' });
        deleteSucceeded = true;
      } else if (error.response?.status === 404) {
        setToast({ show: true, message: 'Template not found. It may have already been deleted.', type: 'warning' });
      } else {
        const message = error?.response?.data?.message || 'Failed to delete template. Please try again.';
        setToast({ show: true, message: formatDateInMessage(message), type: 'error' });
      }
    }

    if (deleteSucceeded) {
      try {
        await refreshTemplates({ force: true });
      } catch (refreshError) {
        console.error('Failed to refresh templates after delete:', refreshError);
      }
    }

    // Always reset the deleting state and close the modal
    setIsDeleting(false);
    setItemToDelete(null);
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
              ot_hours: assignment.ot_hours || '0'
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
              ot_hours: assignment.ot_hours || '0'
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
    let deleteSucceeded = false;
    let successMessage = 'Schedule deleted successfully!';

    try {
      const response = await scheduleAPI.delete(scheduleId);
      successMessage = response?.data?.message || successMessage;
      deleteSucceeded = true;
    } catch (error) {
      const apiMessage = error?.response?.data?.message;
      if (apiMessage && apiMessage.toLowerCase().includes('deleted successfully')) {
        successMessage = apiMessage;
        deleteSucceeded = true;
      } else if (error.response?.status === 404) {
        setToast({ show: true, message: 'Schedule not found. It may have already been deleted.', type: 'warning' });
      } else {
        const message = apiMessage || 'Failed to delete schedule. Please try again.';
        setToast({ show: true, message, type: 'error' });
      }
    }

    if (deleteSucceeded) {
      setToast({ show: true, message: formatDateInMessage(successMessage), type: 'success' });

      setBasicSchedules(prev => prev.filter(schedule => schedule.id !== scheduleId));
      setSchedules(prev => prev.filter(assignment => assignment.id !== scheduleId));

      try {
        const response = await scheduleAPI.getAll();
        const transformedSchedules = [];
        const scheduleMap = new Map();
        if (response.data && response.data.schedules) {
          response.data.schedules.forEach(schedule => {
            const key = `${schedule.date}-${schedule.name}`;
            if (!scheduleMap.has(key)) {
              scheduleMap.set(key, {
                id: schedule.id,
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
                ot_hours: assignment.ot_hours || '0'
              });
              scheduleMap.get(key).employees_count++;
            });
          });
        }
        setSchedules(transformedSchedules);
        setBasicSchedules(Array.from(scheduleMap.values()));
      } catch (refreshError) {
        console.error('Failed to refresh schedules after delete:', refreshError);
      }
    }

    // Always reset the deleting state and close the modal
    setIsDeleting(false);
    setItemToDelete(null);
  };

  const handleOpenEditScheduleModal = (date) => { setEditingScheduleDate(date); setShowEditScheduleModal(true); };
  const handleCloseEditScheduleModal = () => { setEditingScheduleDate(null); setShowEditScheduleModal(false); };
  const handleSaveAndCloseEditModal = async (date, updatedEntries) => {
    try {
      // Get the schedule ID for the date being edited
      const scheduleInfo = schedulesByDate[date]?.info;
      if (!scheduleInfo || !scheduleInfo.id) {
        setToast({ show: true, message: 'Error: Could not find schedule to update', type: 'error' });
        return;
      }

      // Transform the updated entries to match the backend API format
      const scheduleData = {
        name: updatedEntries[0]?.name || `Schedule for ${date}`,
        date: date,
        description: null,
        assignments: updatedEntries.map(entry => ({
          empId: entry.empId,
          start_time: entry.start_time,
          end_time: entry.end_time,
          break_start: entry.break_start || null,
          break_end: entry.break_end || null,
          ot_hours: entry.ot_hours || '0',
          notes: entry.notes || null
        }))
      };

      // Log the data being sent for debugging
      console.log('Sending schedule update data:', {
        scheduleId: scheduleInfo.id,
        scheduleData: scheduleData
      });

      // Call the update API
      await scheduleAPI.update(scheduleInfo.id, scheduleData);
      
      // Refresh the schedule data
      await Promise.all([
        refreshBasicSchedules({ force: true }),
        refreshTemplates({ force: true }),
        loadScheduleForDate(scheduleInfo.date, { force: true, showSpinner: false })
      ]);

      // Close the modal and show success message
      handleCloseEditScheduleModal();
      setToast({ show: true, message: 'Schedule updated successfully!', type: 'success' });
      
    } catch (error) {
      console.error('Error updating schedule:', error);
      console.error('Full error object:', JSON.stringify(error, null, 2));
      console.error('Error response:', error.response);
      console.error('Error response data:', error.response?.data);
      
      let errorMessage = 'Unable to save schedule changes. Please try again.';
      
      if (error.response?.data?.error === 'SCHEDULE_EXISTS_FOR_DATE') {
        errorMessage = 'A schedule already exists for this date. Only one schedule per date is allowed.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.errors) {
        // Handle validation errors
        const validationErrors = Object.values(error.response.data.errors).flat();
        errorMessage = `Please check your input: ${validationErrors.join(', ')}`;
      } else if (error.response?.status === 404) {
        errorMessage = 'Schedule not found. It may have been deleted by another user.';
      } else if (error.response?.status === 403) {
        errorMessage = 'You do not have permission to update this schedule.';
      } else if (error.response?.status >= 500) {
        errorMessage = 'Server error occurred. Please try again later.';
      } else if (error.message && !error.message.includes('ReferenceError') && !error.message.includes('TypeError')) {
        errorMessage = 'Unable to save schedule changes. Please check your connection and try again.';
      }
      
      setToast({ show: true, message: errorMessage, type: 'error' });
    }
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

  const handleViewScheduleDetails = async (scheduleInfo) => {
    try {
      await loadScheduleForDate(scheduleInfo.date, { force: false, showSpinner: false });
      setPreviewData({ info: scheduleInfo, type: 'schedule' });
    } catch (err) {
      setToast({ show: true, message: 'Failed to load schedule details.', type: 'error' });
    }
  };

  const handleViewTemplateDetails = async (templateInfo) => {
    try {
      const detailedTemplate = await loadTemplateDetails(templateInfo.id, { force: false });
      const templateToUse = detailedTemplate || templateInfo;

      let columns = templateToUse.columns;
      if (typeof columns === 'string') {
        try {
          columns = JSON.parse(columns);
        } catch (err) {
          columns = [];
        }
      }
      if (!Array.isArray(columns) && columns) {
        columns = Object.values(columns);
      }
      if (!Array.isArray(columns)) {
        columns = [];
      }

      const assignments = Array.isArray(templateToUse.assignments)
        ? templateToUse.assignments
        : [];

      setPreviewData({
        ...templateToUse,
        columns,
        assignments,
        type: 'template',
      });
    } catch (err) {
      setToast({ show: true, message: 'Failed to load template details.', type: 'error' });
    }
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
      // Ensure state is reset even if there's an error
      setIsDeleting(false);
      setItemToDelete(null);
    }
  };

  // --- RENDER FUNCTIONS ---
  const renderPreviewScreen = () => {
    if (!previewData) return null;
    const isTemplate = previewData.type === 'template';
    const title = isTemplate ? previewData.name : previewData.info.name;
    const subtitle = isTemplate ? previewData.description : `Schedule for ${new Date(previewData.info.date + 'T00:00:00').toLocaleDateString()}`;
    const dataForTable = isTemplate ? (previewData.assignments || []) : schedulesByDate[previewData.info.date]?.assignments || [];
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
                  {dataForTable.length > 0 ? (
                      <div className="table-responsive schedule-preview-table">
                          <table className="table table-sm table-striped">
                              <thead>
                                  <tr>
                                      <th>Employee Name</th><th>Employee ID</th><th>Position</th>
                                      <th>Start Time</th><th>Break Start</th><th>Break End</th><th>End Time</th><th>OT (hrs)</th>
                                      {(columnsForTable || []).map(key => <th key={key}>{key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ')}</th>)}
                                  </tr>
                              </thead>
                              <tbody>
                                  {dataForTable.map(assignment => (
                                      <tr key={assignment.id}>
                                          <td>
                                            {assignment.user
                                              ? ([assignment.user.first_name, assignment.user.middle_name, assignment.user.last_name]
                                                  .filter(Boolean)
                                                  .join(' ') || assignment.user.name || assignment.user.username || 'Unknown')
                                              : 'Unknown'}
                                          </td>
                                          <td>{assignment.user?.id || 'N/A'}</td>
                                          <td>{assignment.user?.position?.name || 'Unassigned'}</td>
                                          <td>{formatTimeToAMPM(assignment.start_time)}</td>
                                          <td>{formatTimeToAMPM(assignment.break_start)}</td>
                                          <td>{formatTimeToAMPM(assignment.break_end)}</td>
                                          <td>{formatTimeToAMPM(assignment.end_time)}</td>
                                          <td>{assignment.ot_hours && parseFloat(assignment.ot_hours) > 0 ? assignment.ot_hours : '---'}</td>
                                          {(columnsForTable || []).map(key => <td key={key}>-</td>)}
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>
                  ) : (
                      <div className="table-responsive">
                          <table className="table template-preview-table">
                              <thead>
                                  <tr>
                                      <th>Employee Name</th><th>Employee ID</th><th>Position</th>
                                      <th>Start Time</th><th>Break Start</th><th>Break End</th><th>End Time</th><th>OT (hrs)</th>
                                      {(columnsForTable || []).map(key => <th key={key}>{key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ')}</th>)}
                                  </tr>
                              </thead>
                              <tbody>
                                  <tr>
                                      <td colSpan={8 + (columnsForTable || []).length} className="text-center">This template has no assigned employees yet.</td>
                                  </tr>
                              </tbody>
                          </table>
                      </div>
                  )}
              </>
          ) : (
              <>
                  <p className="fw-bold">This schedule includes the following employees:</p>
                  <div className="table-responsive schedule-preview-table">
                      <table className="table table-sm table-striped">
                          <thead>
                              <tr>
                                  <th>Employee ID</th><th>Employee Name</th><th>Position</th>
                                  <th>Start Time</th><th>Break Start</th><th>Break End</th><th>End Time</th><th>OT Hours</th>
                                  {(columnsForTable || []).map(key => <th key={key}>{key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ')}</th>)}
                              </tr>
                          </thead>
                          <tbody>
                              {dataForTable.map(emp => (
                                  <tr key={emp.employee_id}>
                                      <td>{emp.employee_id}</td><td>{emp.user_name}</td><td>{emp.position_name || 'Unassigned'}</td>
                                      <td>{formatTimeToAMPM(emp.start_time)}</td>
                                      <td>{formatTimeToAMPM(emp.break_start)}</td>
                                      <td>{formatTimeToAMPM(emp.break_end)}</td>
                                      <td>{formatTimeToAMPM(emp.end_time)}</td>
                                      <td>{emp.ot_hours && parseFloat(emp.ot_hours) > 0 ? emp.ot_hours : '---'}</td>
                                      {(columnsForTable || []).map(key => {
                                        if (['start_time', 'break_start', 'break_end', 'end_time', 'ot_hours'].includes(key)) {
                                          return null;
                                        }
                                        const value = emp[key];
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
    switch (activeView) {
      case 'daily':
        return (
          <DailyScheduleView
            currentDate={currentDate}
            onDateChange={setCurrentDate}
            scheduledEmployeesForDate={scheduledEmployeesForDate}
            sortedAndFilteredDailyEmployees={sortedAndFilteredDailyEmployees}
            dailyViewColumns={dailyViewColumns}
            formatTimeToAMPM={formatTimeToAMPM}
            onEditSchedule={handleOpenEditScheduleModal}
            positionFilter={positionFilter}
            isLoading={dailyScheduleLoading}
          />
        );
      case 'list':
        return (
          <ScheduleListView
            listSearchTerm={listSearchTerm}
            onSearchChange={setListSearchTerm}
            listSortLabel={listSortLabel}
            listSortConfig={listSortConfig}
            onSortChange={setListSortConfig}
            sortedAndFilteredSchedules={sortedAndFilteredSchedules}
            onEditSchedule={handleOpenEditScheduleModal}
            onDeleteSchedule={(scheduleInfo) => handleOpenDeleteConfirm(scheduleInfo, 'schedule')}
            onViewDetails={handleViewScheduleDetails}
            isLoading={basicSchedulesLoading && basicSchedules.length === 0}
          />
        );
      case 'templates':
        return (
          <ScheduleTemplatesView
            templateSearchTerm={templateSearchTerm}
            setTemplateSearchTerm={setTemplateSearchTerm}
            filteredTemplates={filteredTemplates}
            isLoading={templatesLoading && templates.length === 0}
            handleOpenCreateTemplateModal={handleOpenCreateTemplateModal}
            handleOpenDeleteConfirm={(tpl, type) => handleOpenDeleteConfirm(tpl, type)}
            onViewTemplateDetails={handleViewTemplateDetails}
            setPreviewData={setPreviewData}
          />
        );
      default:
        return null;
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
      {showEditScheduleModal && editingScheduleDate && (
        <EditScheduleModal
          show={showEditScheduleModal}
          onClose={handleCloseEditScheduleModal}
          onSave={handleSaveAndCloseEditModal}
          scheduleId={schedulesByDate[editingScheduleDate]?.info?.id}
          scheduleDate={editingScheduleDate}
          initialAssignments={schedulesByDate[editingScheduleDate]?.assignments || []}
        />
      )}
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
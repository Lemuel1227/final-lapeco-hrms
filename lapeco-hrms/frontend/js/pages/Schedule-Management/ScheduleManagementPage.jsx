import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation, Outlet, Link } from 'react-router-dom';
import './ScheduleManagementPage.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import CreateTemplateModal from '../../modals/CreateTemplateModal';
import EditScheduleModal from '../../modals/EditScheduleModal';
import SelectDateForScheduleModal from '../../modals/SelectDateForScheduleModal';
import ToastNotification from '../../common/ToastNotification'; 

const ScheduleManagementPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [basicSchedules, setBasicSchedules] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeView, setActiveView] = useState('daily');
  const [previewData, setPreviewData] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
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

  const existingScheduleDatesSet = useMemo(() => new Set(Object.keys(schedulesByDate)), [schedulesByDate]);

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

  const handleProceedToBuilder = (selectedDates) => {
    navigate('/dashboard/schedule-management/create', { 
      state: { 
        dates: Array.isArray(selectedDates) ? selectedDates : [selectedDates], 
        method: creationSource.type, 
        sourceData: creationSource.data 
      } 
    });
    setShowSelectDateModal(false);
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
                 <Link to="daily-view" className={`btn ${location.pathname.endsWith('/daily-view') ? 'active' : ''}`}><i className="bi bi-calendar-day me-2"></i>Daily View</Link>
                 <Link to="schedule-list" className={`btn ${location.pathname.endsWith('/schedule-list') ? 'active' : ''}`}><i className="bi bi-calendar-range me-2"></i>Schedule List</Link>
                 <Link to="templates" className={`btn ${location.pathname.endsWith('/templates') ? 'active' : ''}`}><i className="bi bi-file-earmark-spreadsheet me-2"></i>Templates</Link>
               </div>
            
               <div className="mt-4">
                 <Outlet />
               </div>
             </>
           )}
         </>
       )}

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
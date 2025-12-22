import React, { useState, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import DailyScheduleView from './DailyScheduleView';
import { scheduleAPI } from '../../services/api';
import ToastNotification from '../../common/ToastNotification';

const ScheduleDailyViewPage = () => {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date().toISOString().split('T')[0]);
  const [scheduleDetailsByDate, setScheduleDetailsByDate] = useState({});
  const [dailyScheduleLoading, setDailyScheduleLoading] = useState(false);
  const [positionFilter, setPositionFilter] = useState('');
  const [dailySortConfig, setDailySortConfig] = useState({ key: 'name', direction: 'ascending' });
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

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
    if (!currentDate) return;
    loadScheduleForDate(currentDate, { showSpinner: true }).catch(() => {});
  }, [currentDate, loadScheduleForDate]);

  const scheduledEmployeesForDate = useMemo(() => {
    const scheduleData = scheduleDetailsByDate[currentDate];
    return (scheduleData?.assignments || []).map(schedule => ({ ...schedule }));
  }, [currentDate, scheduleDetailsByDate]);

  const sortedAndFilteredDailyEmployees = useMemo(() => {
    let employeesToProcess = [...scheduledEmployeesForDate];
    if (positionFilter) {
      employeesToProcess = employeesToProcess.filter(emp => emp.position_name === positionFilter);
    }
    
    if (dailySortConfig.key) {
      employeesToProcess.sort((a, b) => {
        if (a[dailySortConfig.key] == null) return 1;
        if (b[dailySortConfig.key] == null) return -1;
        
        if (['start_time', 'end_time', 'break_start', 'break_end'].includes(dailySortConfig.key)) {
          const timeA = a[dailySortConfig.key] || '';
          const timeB = b[dailySortConfig.key] || '';
          return dailySortConfig.direction === 'ascending' 
            ? timeA.localeCompare(timeB)
            : timeB.localeCompare(timeA);
        }
        
        const valA = String(a[dailySortConfig.key] || '').toLowerCase();
        const valB = String(b[dailySortConfig.key] || '').toLowerCase();
        if (valA < valB) return dailySortConfig.direction === 'ascending' ? -1 : 1;
        if (valA > valB) return dailySortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }
    return employeesToProcess;
  }, [scheduledEmployeesForDate, positionFilter, dailySortConfig]);

  const positionsOnDate = useMemo(() => {
    const positions = new Set(scheduledEmployeesForDate.map(e => e.position_name).filter(Boolean));
    return ['All Positions', ...Array.from(positions).sort()];
  }, [scheduledEmployeesForDate]);

  const formatTimeToAMPM = (timeString) => {
    if (!timeString) return '---';
    try {
      let timeOnly = timeString;
      if (timeString.includes('T')) {
        timeOnly = timeString.split('T')[1].split('.')[0];
      }
      
      const [hours, minutes] = timeOnly.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      let displayHour = hour;
      if (hour === 0) {
        displayHour = 12;
      } else if (hour > 12) {
        displayHour = hour - 12;
      }
      const result = `${displayHour}:${minutes} ${ampm}`;
      return result;
    } catch (error) {
      return timeString;
    }
  };

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

  const handleEditSchedule = (date) => {
    navigate('/dashboard/schedule-management/create', { 
      state: { 
        dates: [date], 
        method: 'edit', 
        sourceData: scheduleDetailsByDate[date]?.assignments || [] 
      } 
    });
  };

  return (
    <>
      <DailyScheduleView
        currentDate={currentDate}
        onDateChange={setCurrentDate}
        scheduledEmployeesForDate={scheduledEmployeesForDate}
        sortedAndFilteredDailyEmployees={sortedAndFilteredDailyEmployees}
        dailyViewColumns={dailyViewColumns}
        formatTimeToAMPM={formatTimeToAMPM}
        onEditSchedule={handleEditSchedule}
        positionFilter={positionFilter}
        sortConfig={dailySortConfig}
        onSortChange={setDailySortConfig}
        isLoading={dailyScheduleLoading}
        positionsOnDate={positionsOnDate}
        onPositionFilterChange={setPositionFilter}
      />
      
      {toast.show && (
        <ToastNotification
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ ...toast, show: false })}
        />
      )}
    </>
  );
};

export default ScheduleDailyViewPage;

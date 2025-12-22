import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ScheduleListView from './ScheduleListView';
import { scheduleAPI } from '../../services/api';
import ToastNotification from '../../common/ToastNotification';

const ScheduleListViewPage = () => {
  const navigate = useNavigate();
  const [basicSchedules, setBasicSchedules] = useState([]);
  const [scheduleDetailsByDate, setScheduleDetailsByDate] = useState({});
  const [loading, setLoading] = useState(false);
  const [listSearchTerm, setListSearchTerm] = useState('');
  const [listSortConfig, setListSortConfig] = useState({ key: 'date', direction: 'descending' });
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

  const refreshBasicSchedules = useCallback(async ({ force = false } = {}) => {
    setLoading(true);
    try {
      const response = await scheduleAPI.getAllBasic();
      const rawSchedules = Array.isArray(response.data) ? response.data : (response.data?.schedules || []);
      const normalized = rawSchedules.map(item => ({
        id: item.id,
        name: item.name,
        date: normalizeScheduleDate(item.date),
        employeeCount: item.employees_count ?? item.employeeCount ?? 0
      }));
      setBasicSchedules(normalized);
      return normalized;
    } catch (error) {
      setToast({ show: true, message: 'Failed to load schedules.', type: 'error' });
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const loadScheduleForDate = useCallback(async (date, { force = false } = {}) => {
    const normalizedDate = normalizeScheduleDate(date);
    if (!normalizedDate) return null;

    if (scheduleDetailsByDate[normalizedDate]) {
      return scheduleDetailsByDate[normalizedDate];
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
      console.error('Failed to load schedule details:', err);
      return null;
    }
  }, [scheduleDetailsByDate]);

  useEffect(() => {
    refreshBasicSchedules().catch(() => {});
  }, [refreshBasicSchedules]);

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

  const handleEditSchedule = (scheduleInfo) => {
    navigate('/dashboard/schedule-management/create', { 
      state: { 
        dates: [scheduleInfo.date], 
        method: 'edit', 
        sourceData: schedulesByDate[scheduleInfo.date]?.assignments || [] 
      } 
    });
  };

  const handleDeleteSchedule = async (scheduleId) => {
    try {
      await scheduleAPI.delete(scheduleId);
      setToast({ show: true, message: 'Schedule deleted successfully!', type: 'success' });
      await refreshBasicSchedules({ force: true });
    } catch (error) {
      const message = error?.response?.data?.message || 'Failed to delete schedule. Please try again.';
      setToast({ show: true, message, type: 'error' });
    }
  };

  const handleViewDetails = async (scheduleInfo) => {
    await loadScheduleForDate(scheduleInfo.date, { force: false });
    // In a real implementation, you might show a modal or navigate to details
    setToast({ show: true, message: 'Schedule details loaded', type: 'info' });
  };

  return (
    <>
      <ScheduleListView
        listSearchTerm={listSearchTerm}
        onSearchChange={setListSearchTerm}
        listSortLabel={listSortLabel}
        listSortConfig={listSortConfig}
        onSortChange={setListSortConfig}
        sortedAndFilteredSchedules={sortedAndFilteredSchedules}
        onEditSchedule={handleEditSchedule}
        onDeleteSchedule={handleDeleteSchedule}
        onViewDetails={handleViewDetails}
        isLoading={loading}
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

export default ScheduleListViewPage;

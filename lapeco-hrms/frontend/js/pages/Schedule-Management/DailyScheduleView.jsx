import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { scheduleAPI } from '../../services/api';
import EditScheduleModal from '../../modals/EditScheduleModal';
import ToastNotification from '../../common/ToastNotification';

const DailyScheduleView = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Get date from URL parameter or default to today
  const getDateFromURL = () => {
    const dateParam = searchParams.get('date');
    if (dateParam) {
      // Validate that it's a valid date
      const date = new Date(dateParam);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    }
    return new Date().toISOString().split('T')[0];
  };
  
  const [currentDate, setCurrentDate] = useState(getDateFromURL());
  const [scheduleDetails, setScheduleDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [positionFilter, setPositionFilter] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'ascending' });
  const [showEditModal, setShowEditModal] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // Function to update date and URL parameter
  const updateDate = (newDate) => {
    setCurrentDate(newDate);
    setSearchParams({ date: newDate });
  };

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
      return `${displayHour}:${minutes} ${ampm}`;
    } catch (error) {
      return timeString;
    }
  };

  const loadScheduleForDate = useCallback(async (date) => {
    setLoading(true);
    try {
      const response = await scheduleAPI.getByDate(date);
      const scheduleData = response.data?.schedule || null;
      setScheduleDetails(scheduleData);
    } catch (err) {
      console.error('Failed to load schedule:', err);
      setScheduleDetails(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentDate) {
      loadScheduleForDate(currentDate);
    }
  }, [currentDate, loadScheduleForDate]);

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

  const scheduledEmployeesForDate = scheduleDetails?.assignments || [];

  const sortedAndFilteredDailyEmployees = useMemo(() => {
    let employeesToProcess = [...scheduledEmployeesForDate];
    if (positionFilter && positionFilter !== 'All Positions') {
      employeesToProcess = employeesToProcess.filter(emp => emp.position_name === positionFilter);
    }
    
    if (sortConfig.key) {
      employeesToProcess.sort((a, b) => {
        if (a[sortConfig.key] == null) return 1;
        if (b[sortConfig.key] == null) return -1;
        
        if (['start_time', 'end_time', 'break_start', 'break_end'].includes(sortConfig.key)) {
          const timeA = a[sortConfig.key] || '';
          const timeB = b[sortConfig.key] || '';
          return sortConfig.direction === 'ascending' 
            ? timeA.localeCompare(timeB)
            : timeB.localeCompare(timeA);
        }
        
        const valA = String(a[sortConfig.key] || '').toLowerCase();
        const valB = String(b[sortConfig.key] || '').toLowerCase();
        if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }
    return employeesToProcess;
  }, [scheduledEmployeesForDate, positionFilter, sortConfig]);

  const handleSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const renderSortIcon = (key) => {
    if (sortConfig?.key !== key) return <i className="bi bi-arrow-down-up sort-icon ms-1"></i>;
    return sortConfig?.direction === 'ascending' 
      ? <i className="bi bi-sort-up sort-icon active ms-1"></i> 
      : <i className="bi bi-sort-down sort-icon active ms-1"></i>;
  };

  const handleSaveSchedule = async (scheduleDate, scheduleEntries) => {
    try {
      console.log('Saving schedule:', { scheduleDate, scheduleEntries });
      
      // Generate a name for the schedule based on the date
      const scheduleName = `Schedule for ${new Date(scheduleDate + 'T00:00:00').toLocaleDateString()}`;
      
      if (scheduleDetails?.id) {
        // Update existing schedule
        await scheduleAPI.update(scheduleDetails.id, {
          name: scheduleName,
          date: scheduleDate,
          assignments: scheduleEntries
        });
      } else {
        // Create new schedule
        await scheduleAPI.create({
          name: scheduleName,
          date: scheduleDate,
          assignments: scheduleEntries
        });
      }
      
      // Refresh the data
      await loadScheduleForDate(currentDate);
      setShowEditModal(false);
      setToast({ show: true, message: 'Schedule updated successfully!', type: 'success' });
    } catch (error) {
      console.error('Failed to save schedule:', error);
      const message = error?.response?.data?.message || 'Failed to save schedule. Please try again.';
      setToast({ show: true, message, type: 'error' });
    }
  };

  return (
    <>
      <div className="daily-view-header">
        <h4 className="daily-view-title">Daily Schedule</h4>
        <div className="daily-view-controls">
          <input
            type="date"
            className="form-control form-control-lg"
            value={currentDate}
            onChange={(e) => updateDate(e.target.value)}
          />
          {scheduledEmployeesForDate?.length > 0 && (
            <button
              className="btn btn-lg btn-outline-secondary"
              onClick={() => setShowEditModal(true)}
              title="Edit Schedule"
            >
              <i className="bi bi-pencil-fill"></i>
            </button>
          )}
        </div>
      </div>
      {loading ? (
        <div className="text-center p-5">
          <div className="spinner-border text-success" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3 text-muted">Loading schedule data...</p>
        </div>
      ) : sortedAndFilteredDailyEmployees?.length > 0 ? (
        <>
          <div className="card data-table-card shadow-sm">
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table data-table mb-0">
                  <thead>
                    <tr>
                      {dailyViewColumns.map((col) => (
                        <th 
                          key={col.key} 
                          className={sortConfig?.key === col.key ? 'sortable active' : 'sortable'}
                          onClick={() => handleSort(col.key)}
                          style={{ cursor: 'pointer' }}
                        >
                          {col.name}
                          {renderSortIcon(col.key)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedAndFilteredDailyEmployees.map((sch, idx) => (
                      <tr key={idx}>
                        {dailyViewColumns.map((col) => {
                          const value = sch[col.key];
                          if (['start_time', 'end_time', 'break_start', 'break_end'].includes(col.key)) {
                            return <td key={col.key}>{formatTimeToAMPM(value)}</td>;
                          } else if (col.key === 'ot_hours') {
                            return (
                              <td key={col.key}>
                                {value && parseFloat(value) > 0 ? value : '---'}
                              </td>
                            );
                          }
                          return <td key={col.key}>{value || '---'}</td>;
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center p-5 bg-light rounded">
          <i className="bi bi-calendar2-x fs-1 text-muted mb-3 d-block"></i>
          <h4 className="text-muted">
            {scheduledEmployeesForDate?.length > 0 && positionFilter && positionFilter !== 'All Positions'
              ? 'No employees match the filter.'
              : `No schedule created for ${new Date(
                  currentDate + 'T00:00:00'
                ).toLocaleDateString()}.`}
          </h4>
        </div>
      )}
      
      <EditScheduleModal
        show={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSave={handleSaveSchedule}
        scheduleId={scheduleDetails?.id}
        scheduleDate={currentDate}
        initialAssignments={scheduleDetails?.assignments || []}
      />
      
      {/* Toast Notification */}
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

export default DailyScheduleView;

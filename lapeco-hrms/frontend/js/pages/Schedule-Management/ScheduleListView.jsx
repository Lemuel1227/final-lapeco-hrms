import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { scheduleAPI } from '../../services/api';
import EditScheduleModal from '../../modals/EditScheduleModal';
import ConfirmationModal from '../../modals/ConfirmationModal';
import ScheduleDetailsView from './ScheduleDetailsView';
import SelectDateForScheduleModal from '../../modals/SelectDateForScheduleModal';
import ToastNotification from '../../common/ToastNotification';

const ScheduleListView = () => {
  const navigate = useNavigate();
  const [listSearchTerm, setListSearchTerm] = useState('');
  const [listSortLabel] = useState('Sort by');
  const [listSortConfig, setListSortConfig] = useState({ key: 'date', direction: 'descending' });
  const [basicSchedules, setBasicSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [showDetailsView, setShowDetailsView] = useState(false);
  const [scheduleDetails, setScheduleDetails] = useState(null);
  const [creationSource, setCreationSource] = useState(null);
  const [showSelectDateModal, setShowSelectDateModal] = useState(false);
  const [existingScheduleDatesSet, setExistingScheduleDatesSet] = useState(new Set());
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  useEffect(() => {
    const loadSchedules = async () => {
      setLoading(true);
      try {
        console.log('Loading schedules...');
        const response = await scheduleAPI.getAllBasic();
        console.log('API response:', response);
        
        // Handle different possible API response structures
        const schedulesData = response.data?.data || response.data || [];
        console.log('Schedules data:', schedulesData);
        
        setBasicSchedules(Array.isArray(schedulesData) ? schedulesData : []);
        
        // Update existing schedule dates set
        const datesSet = new Set();
        if (Array.isArray(schedulesData)) {
          schedulesData.forEach(schedule => {
            if (schedule.date) {
              datesSet.add(schedule.date.split('T')[0]); // Get just the date part
            }
          });
        }
        setExistingScheduleDatesSet(datesSet);
      } catch (error) {
        console.error('Failed to load schedules:', error);
        setBasicSchedules([]);
      } finally {
        setLoading(false);
      }
    };
    loadSchedules();
  }, []);

  const sortedAndFilteredSchedules = useMemo(() => {
    // Ensure basicSchedules is always an array
    const schedules = Array.isArray(basicSchedules) ? [...basicSchedules] : [];
    
    // Add employeeCount calculation if not present
    const schedulesWithCounts = schedules.map(schedule => {
      console.log('Processing schedule:', schedule);
      console.log('Schedule employees_count:', schedule.employees_count);
      
      // Use the existing employees_count field if available, otherwise calculate it
      const employeeCount = schedule.employees_count !== undefined 
        ? schedule.employees_count 
        : 0;
      
      console.log('Final employeeCount:', employeeCount);
      
      return {
        ...schedule,
        employeeCount
      };
    });
    
    // Sort function
    const sortArray = (array, key, direction) => {
      return array.sort((a, b) => {
        let valA = a[key];
        let valB = b[key];
        
        if (key === 'date') {
          valA = new Date(valA);
          valB = new Date(valB);
        }
        
        if (valA < valB) return direction === 'ascending' ? -1 : 1;
        if (valA > valB) return direction === 'ascending' ? 1 : -1;
        return 0;
      });
    };
    
    if (listSearchTerm) {
      const filtered = schedulesWithCounts.filter(schedule => 
        schedule.name?.toLowerCase().includes(listSearchTerm.toLowerCase()) ||
        schedule.date?.includes(listSearchTerm)
      );
      return sortArray(filtered, listSortConfig.key, listSortConfig.direction);
    }
    
    return sortArray(schedulesWithCounts, listSortConfig.key, listSortConfig.direction);
  }, [basicSchedules, listSearchTerm, listSortConfig]);

  const handleSortClick = (event, key, direction) => {
    event.preventDefault();
    setListSortConfig({ key, direction });
  };

  const handleEditSchedule = (schedule) => {
    // Ensure we have a valid date string (YYYY-MM-DD format)
    const scheduleWithValidDate = {
      ...schedule,
      date: schedule.date ? schedule.date.split('T')[0] : schedule.date
    };
    setSelectedSchedule(scheduleWithValidDate);
    setShowEditModal(true);
  };

  const handleDeleteSchedule = (schedule) => {
    // Ensure we have a valid date string
    const scheduleWithValidDate = {
      ...schedule,
      date: schedule.date ? schedule.date.split('T')[0] : schedule.date
    };
    setSelectedSchedule(scheduleWithValidDate);
    setShowDeleteModal(true);
  };

  const handleViewScheduleDetails = async (schedule) => {
    try {
      // Load full schedule details using schedule ID instead of date
      const response = await scheduleAPI.getById(schedule.id);
      const fullScheduleData = response.data || null;
      
      console.log('Schedule details API response:', response);
      console.log('Full schedule data:', fullScheduleData);
      console.log('Schedule info:', schedule);
      
      setScheduleDetails({
        info: schedule,
        type: 'schedule',
        fullData: fullScheduleData
      });
      setShowDetailsView(true);
    } catch (error) {
      console.error('Failed to load schedule details:', error);
      // Still show details view with basic info if full data fails
      setScheduleDetails({
        info: schedule,
        type: 'schedule',
        fullData: null
      });
      setShowDetailsView(true);
    }
  };

  const handleEditModalSave = async (scheduleDate, scheduleEntries) => {
    try {
      console.log('Saving schedule:', { scheduleDate, scheduleEntries });
      
      const scheduleName = `Schedule for ${new Date(scheduleDate + 'T00:00:00').toLocaleDateString()}`;
      
      if (selectedSchedule?.id) {
        await scheduleAPI.update(selectedSchedule.id, {
          name: scheduleName,
          date: scheduleDate,
          assignments: scheduleEntries
        });
      } else {
        await scheduleAPI.create({
          name: scheduleName,
          date: scheduleDate,
          assignments: scheduleEntries
        });
      }
      
      // Refresh the schedules list
      const response = await scheduleAPI.getAllBasic();
      const schedulesData = response.data?.data || response.data || [];
      setBasicSchedules(Array.isArray(schedulesData) ? schedulesData : []);
      
      setShowEditModal(false);
      setSelectedSchedule(null);
      setToast({ show: true, message: 'Schedule updated successfully!', type: 'success' });
    } catch (error) {
      console.error('Failed to save schedule:', error);
      const message = error?.response?.data?.message || 'Failed to save schedule. Please try again.';
      setToast({ show: true, message, type: 'error' });
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      if (selectedSchedule?.id) {
        await scheduleAPI.delete(selectedSchedule.id);
        
        // Refresh the schedules list
        const response = await scheduleAPI.getAllBasic();
        const schedulesData = response.data?.data || response.data || [];
        setBasicSchedules(Array.isArray(schedulesData) ? schedulesData : []);
        
        setShowDeleteModal(false);
        setSelectedSchedule(null);
        setToast({ show: true, message: 'Schedule deleted successfully!', type: 'success' });
      }
    } catch (error) {
      console.error('Failed to delete schedule:', error);
      const message = error?.response?.data?.message || 'Failed to delete schedule. Please try again.';
      setToast({ show: true, message, type: 'error' });
    }
  };

  const formatTimeToAMPM = (time) => {
    if (!time) return '---';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const handleStartCreationFlow = (source) => {
    console.log('handleStartCreationFlow called with:', source);
    console.log('Setting creationSource:', source);
    setCreationSource(source);
    console.log('Setting showSelectDateModal to true');
    setShowSelectDateModal(true);
  };

  const handleProceedToBuilder = (selectedDates) => {
    navigate('/dashboard/schedule-management/create', { 
      state: { 
        dates: Array.isArray(selectedDates) ? selectedDates : [selectedDates], 
        method: creationSource.type, 
        sourceData: creationSource.data,
        sourceScheduleInfo: creationSource.sourceScheduleInfo
      } 
    });
    setShowSelectDateModal(false);
  };

  return (
    <div className="schedule-list-container">
      {showDetailsView ? (
        <ScheduleDetailsView
          previewData={scheduleDetails}
          schedulesByDate={scheduleDetails?.fullData ? { [scheduleDetails.info.date]: scheduleDetails.fullData } : {}}
          formatTimeToAMPM={formatTimeToAMPM}
          onBack={() => {
            setShowDetailsView(false);
            setScheduleDetails(null);
          }}
          onStartCreationFlow={handleStartCreationFlow}
        />
      ) : (
        <>
          <div className="schedule-list-controls">
            <div className="input-group">
              <span className="input-group-text"><i className="bi bi-search"></i></span>
              <input
                type="text"
                className="form-control"
                placeholder="Search by schedule name..."
                value={listSearchTerm}
                onChange={(e) => setListSearchTerm(e.target.value)}
              />
            </div>
            <div className="dropdown sort-dropdown">
              <button
                className="btn btn-outline-secondary dropdown-toggle"
                type="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                <i className="bi bi-funnel me-2"></i>
                {listSortLabel}
              </button>
              <ul className="dropdown-menu dropdown-menu-end">
                <li><h6 className="dropdown-header">Sort by Date</h6></li>
                <li>
                  <a
                    className={`dropdown-item ${listSortConfig.key === 'date' && listSortConfig.direction === 'descending' ? 'active' : ''}`}
                    href="#"
                    onClick={(e) => handleSortClick(e, 'date', 'descending')}
                  >
                    Newest First
                  </a>
                </li>
                <li>
                  <a
                    className={`dropdown-item ${listSortConfig.key === 'date' && listSortConfig.direction === 'ascending' ? 'active' : ''}`}
                    href="#"
                    onClick={(e) => handleSortClick(e, 'date', 'ascending')}
                  >
                    Oldest First
                  </a>
                </li>
                <li><hr className="dropdown-divider" /></li>
                <li><h6 className="dropdown-header">Sort by Name</h6></li>
                <li>
                  <a
                    className={`dropdown-item ${listSortConfig.key === 'name' && listSortConfig.direction === 'ascending' ? 'active' : ''}`}
                    href="#"
                    onClick={(e) => handleSortClick(e, 'name', 'ascending')}
                  >
                    A to Z
                  </a>
                </li>
                <li>
                  <a
                    className={`dropdown-item ${listSortConfig.key === 'name' && listSortConfig.direction === 'descending' ? 'active' : ''}`}
                    href="#"
                    onClick={(e) => handleSortClick(e, 'name', 'descending')}
                  >
                    Z to A
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="schedule-card-grid mt-3">
        {loading ? (
          <div className="w-100 text-center py-5">
            <div className="spinner-border text-success" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-3 text-muted">Loading schedules...</p>
          </div>
        ) : sortedAndFilteredSchedules?.length > 0 ? (
          sortedAndFilteredSchedules.map((scheduleInfo) => (
            <div key={scheduleInfo.date} className="schedule-item-card type-schedule">
              <div className="card-header">
                <h5 className="card-title">{scheduleInfo.name}</h5>
              </div>
              <div className="card-body">
                <div className="info-row">
                  <span className="info-label">Date:</span>
                  <span className="info-value">
                    {new Date(scheduleInfo.date).toLocaleDateString('en-US', {
                      weekday: 'short',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-label">Employees Scheduled:</span>
                  <span className="info-value">{scheduleInfo.employeeCount}</span>
                </div>
              </div>
              <div className="card-footer">
                <button
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => handleEditSchedule(scheduleInfo)}
                >
                  Edit
                </button>
                <button
                  className="btn btn-sm btn-outline-danger"
                  onClick={() => handleDeleteSchedule(scheduleInfo)}
                >
                  Delete
                </button>
                <button
                  className="btn btn-sm btn-success"
                  onClick={() => handleViewScheduleDetails(scheduleInfo)}
                >
                  View Details
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="w-100">
            <p className="text-muted text-center mt-4">No schedules match your search.</p>
          </div>
        )}
      </div>
      
      <EditScheduleModal
        show={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedSchedule(null);
        }}
        onSave={handleEditModalSave}
        scheduleId={selectedSchedule?.id}
        scheduleDate={selectedSchedule?.date || new Date().toISOString().split('T')[0]}
        initialAssignments={selectedSchedule?.assignments || []}
      />
      
      <ConfirmationModal
        show={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedSchedule(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Schedule"
        message={`Are you sure you want to delete the schedule for ${selectedSchedule?.date ? new Date(selectedSchedule.date + 'T00:00:00').toLocaleDateString() : 'this date'}? This action cannot be undone.`}
        confirmText="Delete"
        confirmVariant="danger"
      />
        </>
      )}
      
      {showSelectDateModal && (
        <SelectDateForScheduleModal 
          show={showSelectDateModal} 
          onClose={() => setShowSelectDateModal(false)} 
          onProceed={handleProceedToBuilder} 
          existingScheduleDates={existingScheduleDatesSet} 
        />
      )}
      
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

export default ScheduleListView;

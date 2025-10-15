import React, { useState, useMemo, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import './AttendancePage.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import ReportPreviewModal from '../../modals/ReportPreviewModal';
import EditAttendanceModal from '../../modals/EditAttendanceModal';
import useReportGenerator from '../../hooks/useReportGenerator';
import placeholderAvatar from '../../assets/placeholder-profile.jpg';
import attendanceAPI from '../../services/attendanceAPI';
import ToastNotification from '../../common/ToastNotification';

const AttendancePage = () => {
  // State for UI
  const [activeView, setActiveView] = useState('daily');
  const [currentDate, setCurrentDate] = useState(new Date().toISOString().split('T')[0]);
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'ascending' });
  const [positionFilter, setPositionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');

  const [showReportPreview, setShowReportPreview] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAttendanceRecord, setEditingAttendanceRecord] = useState(null);
  
  // Toast notification state
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  
  // State for data
  const [dailyAttendanceData, setDailyAttendanceData] = useState([]);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const { generateReport, pdfDataUri, isLoading, setPdfDataUri } = useReportGenerator();
  const fileInputRef = useRef(null);

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch daily attendance data for the current date
        const dailyResponse = await attendanceAPI.getDaily({ date: currentDate });
        setDailyAttendanceData(dailyResponse.data || []);
        
        // Fetch attendance history - let backend determine the full date range
        const historyResponse = await attendanceAPI.getHistory();
        setAttendanceHistory(historyResponse.data || []);
        
        // Fetch attendance logs (keeping for compatibility with existing code)
        const logsResponse = await attendanceAPI.getLogs();
        
        // Transform grouped data to flat array for compatibility with existing code
        const flattenedLogs = [];
        if (logsResponse.data && Array.isArray(logsResponse.data)) {
          logsResponse.data.forEach(dateGroup => {
            if (dateGroup.attendances && Array.isArray(dateGroup.attendances)) {
              // Add the date from the group to each attendance record
              const attendancesWithDate = dateGroup.attendances.map(attendance => ({
                ...attendance,
                // Extract just the date part from ISO timestamp if needed
                date: dateGroup.date ? 
                  (dateGroup.date.includes('T') ? dateGroup.date.split('T')[0] : dateGroup.date) :
                  (attendance.date && attendance.date.includes('T') ? attendance.date.split('T')[0] : attendance.date)
              }));
              flattenedLogs.push(...attendancesWithDate);
            }
          });
        }
        console.log('Flattened Logs:', flattenedLogs); // Debug log
        setAttendanceLogs(flattenedLogs);
        
      } catch (err) {
        console.error('Error fetching attendance data:', err);
        setError('Failed to load attendance data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [currentDate]);

  const dailyAttendanceList = useMemo(() => {
    if (!dailyAttendanceData) return [];

    // Use daily attendance data directly from the new API
    return dailyAttendanceData.map((record, index) => {
      // Extract time from shift datetime strings and format to HH:MM
      let shiftDisplay = record.shift;
      
      // Working hours calculation (if needed for compatibility)
      let workingHours = '0h 0m';
      if (record.signIn && record.signOut) {
        try {
          const signInTime = new Date(`2000-01-01 ${record.signIn}`);
          const signOutTime = new Date(`2000-01-01 ${record.signOut}`);
          const diffMs = signOutTime - signInTime;
          if (diffMs > 0) {
            const hours = Math.floor(diffMs / (1000 * 60 * 60));
            const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            workingHours = `${hours}h ${minutes}m`;
          }
        } catch (e) {
          console.warn('Error calculating working hours:', e);
        }
      }

      const processedRecord = {
        id: record.empId || index,
        empId: record.empId,
        name: record.employeeName,
        position: record.position || 'N/A',
        date: record.date,
        shift: record.shift,
        shiftDisplay: shiftDisplay,
        signIn: record.signIn,
        signOut: record.signOut,
        breakIn: record.breakIn,
        breakOut: record.breakOut,
        status: record.status,
        workingHours: workingHours,
        otHours: record.otHours || '0.00',
        scheduleId: record.scheduleId,
        scheduleName: record.scheduleName,
        schedule_assignment_id: record.schedule_assignment_id
      };

      return processedRecord;
    });
  }, [dailyAttendanceData]);

  const sortedAndFilteredList = useMemo(() => {
    let list = [...dailyAttendanceList];
    if (positionFilter) list = list.filter(item => item.position === positionFilter);
    if (statusFilter) list = list.filter(item => item.status === statusFilter);
    if (sortConfig.key) {
      list.sort((a, b) => {
        const valA = String(a[sortConfig.key] || 'z').toLowerCase();
        const valB = String(b[sortConfig.key] || 'z').toLowerCase();
        if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }
    return list;
  }, [dailyAttendanceList, positionFilter, statusFilter, sortConfig]);

  const attendanceHistoryDisplay = useMemo(() => {
    // Use the attendance history data directly from the new API
    if (!attendanceHistory) return [];
    
    return attendanceHistory.map(day => ({
      date: day.date.split('T')[0], // Extract date part from ISO string
      present: day.present,
      late: day.late,
      absent: day.absent,
      total: day.total,
    })).sort((a,b) => new Date(b.date) - new Date(a.date));
  }, [attendanceHistory]);

  // Get unique employees from daily attendance data for employee selection
  const availableEmployees = useMemo(() => {
    if (!dailyAttendanceData) return [];
    
    const uniqueEmployees = [];
    const seenIds = new Set();
    
    dailyAttendanceData.forEach(record => {
      if (!seenIds.has(record.empId)) {
        seenIds.add(record.empId);
        uniqueEmployees.push({
          id: record.empId,
          name: record.employeeName,
          position: record.position
        });
      }
    });
    
    return uniqueEmployees.sort((a, b) => a.name.localeCompare(b.name));
  }, [dailyAttendanceData]);

  const filteredEmployeesForSelection = useMemo(() => {
      if (!availableEmployees) return [];
      return availableEmployees.filter(emp => 
          emp.name.toLowerCase().includes(employeeSearchTerm.toLowerCase()) || 
          emp.id.toString().toLowerCase().includes(employeeSearchTerm.toLowerCase())
      );
  }, [availableEmployees, employeeSearchTerm]);
    
  const selectedEmployeeRecords = useMemo(() => {
      if (!selectedEmployee || !attendanceLogs) return { records: [], stats: {} };
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      console.log('=== BY EMPLOYEE DEBUG ===');
      console.log('Selected Employee:', selectedEmployee);
      console.log('All Attendance Logs for Employee:', attendanceLogs.filter(l => l.empId === selectedEmployee.id));
      
      // Get all attendance records for the selected employee from logs
      const employeeRecords = attendanceLogs
          .filter(log => log.empId === selectedEmployee.id)
          .map(log => {
              // Extract date part for comparison - ensure consistent format
              let logDate = log.date;
              if (logDate && logDate.includes('T')) {
                  logDate = logDate.split('T')[0];
              }
              
              const logDateObj = new Date(logDate);
              logDateObj.setHours(0, 0, 0, 0);

              console.log(`Processing log for ${logDate}:`, {
                  logData: log,
                  logDetails: {
                      empId: log.empId,
                      date: log.date,
                      status: log.status,
                      signIn: log.signIn,
                      signOut: log.signOut,
                      breakOut: log.breakOut,
                      breakIn: log.breakIn,
                      shift: log.shift
                  }
              });

              // Create the final record from log data
              const finalRecord = {
                  empId: log.empId,
                  employeeName: log.employeeName || selectedEmployee.name,
                  position: log.position || selectedEmployee.position,
                  date: logDate,
                  shift: log.shift || 'N/A',
                  signIn: log.signIn,
                  signOut: log.signOut,
                  breakOut: log.breakOut,
                  breakIn: log.breakIn,
                  status: log.status, // Use backend calculated status
                  scheduleId: log.scheduleId,
                  scheduleName: log.scheduleName
              };
              
              console.log(`Final record for ${logDate}:`, finalRecord);
              
              return finalRecord;
          })
          .sort((a, b) => new Date(b.date) - new Date(a.date));
      
      const stats = employeeRecords.reduce((acc, rec) => {
          acc.totalScheduled++;
          // Handle capitalized status values from backend
          if (rec.status === 'Late') acc.totalLate++;
          if (rec.status === 'Absent') acc.totalAbsent++;
          return acc;
      }, { totalScheduled: 0, totalLate: 0, totalAbsent: 0 });

      console.log('=== FINAL BY EMPLOYEE RECORDS ===', employeeRecords);
      console.log('=== BY EMPLOYEE STATS ===', stats);
      return { records: employeeRecords, stats };
  }, [selectedEmployee, attendanceLogs]);
  
  const handleStatusFilterClick = (newStatus) => {
    setStatusFilter(prevStatus => prevStatus === newStatus ? '' : newStatus);
  };
  const handleRequestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') { direction = 'descending'; }
    setSortConfig({ key, direction });
  };
  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <i className="bi bi-arrow-down-up sort-icon ms-1"></i>;
    return sortConfig.direction === 'ascending' ? <i className="bi bi-sort-up sort-icon active ms-1"></i> : <i className="bi bi-sort-down sort-icon active ms-1"></i>;
  };
  const handleViewHistoryDetail = (date) => {
    setCurrentDate(date);
    setActiveView('historyDetail');
  };
  
  const handleGenerateReport = () => {
    if (!dailyAttendanceList || dailyAttendanceList.length === 0) {
      alert("No attendance data to generate a report for the selected day.");
      return;
    }
    generateReport(
        'attendance_summary', 
        { startDate: currentDate }, 
        { 
          employees: availableEmployees, 
          schedules: [], // No schedules data available in current scope
          attendanceLogs, 
          positions: [] // No positions data available in current scope
        }
    );
    setShowReportPreview(true);
  };

  const handleCloseReportPreview = () => {
    setShowReportPreview(false);
    if(pdfDataUri) URL.revokeObjectURL(pdfDataUri);
    setPdfDataUri('');
  };

  const handleOpenEditModal = (employeeData) => {
    const record = {
      id: employeeData.id || employeeData.empId,
      name: employeeData.name || employeeData.employeeName,
      schedule: { date: currentDate, shift: employeeData.shift },
      signIn: employeeData.signIn,
      signOut: employeeData.signOut,
      breakIn: employeeData.breakIn,
      breakOut: employeeData.breakOut,
      ot_hours: employeeData.otHours || employeeData.ot_hours || 0,
      schedule_assignment_id: employeeData.schedule_assignment_id,
      empId: employeeData.empId,
    };
    setEditingAttendanceRecord(record);
    setShowEditModal(true);
  };
  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingAttendanceRecord(null);
  };
  const handleSaveEditedTime = async (empId, date, updatedTimes) => {
    try {
      // Find existing attendance record from daily attendance data
      const existingRecord = dailyAttendanceData.find(record => 
        record.empId === empId && record.date === date
      );
      
      if (!existingRecord || !existingRecord.schedule_assignment_id) {
        setToast({ 
          show: true, 
          message: 'Unable to find schedule assignment for this employee and date', 
          type: 'error' 
        });
        return;
      }
      
      const updatedRecord = {
        schedule_assignment_id: existingRecord.schedule_assignment_id,
        sign_in: updatedTimes.signIn || null,
        sign_out: updatedTimes.signOut || null,
        break_in: updatedTimes.breakIn || null,
        break_out: updatedTimes.breakOut || null,
        ot_hours: updatedTimes.ot_hours || null,
      };
      
      if (existingRecord.id) {
        // Update existing attendance record
        await attendanceAPI.update(existingRecord.id, updatedRecord);
        setToast({ 
          show: true, 
          message: 'Attendance record updated successfully', 
          type: 'success' 
        });
      } else {
        // Create new attendance record
        await attendanceAPI.create(updatedRecord);
        setToast({ 
          show: true, 
          message: 'Attendance record created successfully', 
          type: 'success' 
        });
      }
      
      // Refresh attendance data
      const response = await attendanceAPI.getDaily({ date: currentDate });
      setDailyAttendanceData(response.data || []);
      
      handleCloseEditModal();
    } catch (error) {
      console.error('Error saving attendance record:', error);
      
      let errorMessage = 'Failed to save attendance record. Please try again.';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.errors) {
        // Handle validation errors
        const validationErrors = Object.values(error.response.data.errors).flat();
        errorMessage = `Please check your input: ${validationErrors.join(', ')}`;
      } else if (error.response?.status === 404) {
        errorMessage = 'Attendance record not found. It may have been deleted.';
      } else if (error.response?.status === 403) {
        errorMessage = 'You do not have permission to update this attendance record.';
      } else if (error.response?.status >= 500) {
        errorMessage = 'Server error occurred. Please try again later.';
      } else if (error.message && !error.message.includes('ReferenceError') && !error.message.includes('TypeError')) {
        errorMessage = 'Unable to save attendance record. Please check your connection and try again.';
      }
      
      setToast({ 
        show: true, 
        message: errorMessage, 
        type: 'error' 
      });
    }
  };
  const handleExport = () => {
    if (!sortedAndFilteredList || sortedAndFilteredList.length === 0) {
      setToast({ 
        show: true, 
        message: 'No data to export for the selected date.', 
        type: 'warning' 
      });
      return;
    }
    
    try {
      const dataToExport = sortedAndFilteredList.map(emp => ({
        'Employee ID': emp.id, 'Name': emp.name, 'Position': emp.position, 'Shift': emp.shift,
        'Sign In': emp.signIn || '', 'Break Out': emp.breakOut || '', 'Break In': emp.breakIn || '',
        'Sign Out': emp.signOut || '', 'Status': emp.status, 'Working Hours': emp.workingHours,
        'OT Hours': emp.otHours
      }));
      
      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(data, `attendance_${currentDate}.xlsx`);
      
      setToast({ 
        show: true, 
        message: `Attendance data for ${currentDate} exported successfully`, 
        type: 'success' 
      });
    } catch (error) {
      console.error('Export error:', error);
      setToast({ 
        show: true, 
        message: 'Failed to export attendance data. Please try again.', 
        type: 'error' 
      });
    }
  };
  const handleImportClick = () => { fileInputRef.current.click(); };
  const handleImport = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const importedData = XLSX.utils.sheet_to_json(worksheet);
          const newLogs = [...attendanceLogs];
          let updatedCount = 0;
          importedData.forEach(row => {
            const empId = row['Employee ID']?.toString();
            if (!empId) return;
            const isScheduled = dailyAttendanceList.some(emp => emp.id === empId);
            if (!isScheduled) return;
            const existingLogIndex = newLogs.findIndex(log => log.empId === empId && log.date === currentDate);
            const logUpdate = {
              signIn: row['Sign In'] || null, signOut: row['Sign Out'] || null,
              breakIn: row['Break In'] || null, breakOut: row['Break Out'] || null,
            };
            if (existingLogIndex > -1) { newLogs[existingLogIndex] = { ...newLogs[existingLogIndex], ...logUpdate };
            } else { newLogs.push({ empId, date: currentDate, ...logUpdate }); }
            updatedCount++;
          });
          setAttendanceLogs(newLogs);
          
          if (updatedCount > 0) {
            setToast({ 
              show: true, 
              message: `${updatedCount} attendance records were imported successfully for ${currentDate}`, 
              type: 'success' 
            });
          } else {
            setToast({ 
              show: true, 
              message: 'No valid attendance records found in the imported file', 
              type: 'warning' 
            });
          }
        } catch (error) {
          console.error('Import error:', error);
          setToast({ 
            show: true, 
            message: 'Failed to process the Excel file. Please ensure it is a valid format and try again.', 
            type: 'error' 
          });
        }
      };
      reader.readAsArrayBuffer(file);
    }
    event.target.value = null;
  };
  
  const uniquePositions = useMemo(() => ['All Positions', ...new Set(dailyAttendanceList.map(item => item.position))], [dailyAttendanceList]);
  
  const renderEmployeeView = () => {
    // Create position map from available employees data
    const positionMap = new Map();
    
    if (selectedEmployee) {
        return (
            <div>
                <button className="btn btn-light me-3 back-button mb-3" onClick={() => setSelectedEmployee(null)}>
                    <i className="bi bi-arrow-left"></i> Back to Employee List
                </button>
                <div className="employee-detail-header">
                    <img src={selectedEmployee.imageUrl || placeholderAvatar} alt={selectedEmployee.name} className="employee-detail-avatar" />
                    <div>
                        <h2 className="employee-detail-name">{selectedEmployee.name}</h2>
                        <p className="employee-detail-meta">{selectedEmployee.id} • {selectedEmployee.position || 'Unassigned'}</p>
                    </div>
                </div>
                <div className="employee-attendance-stats my-4">
                    <div className="stat-card scheduled"> <span className="stat-value">{selectedEmployeeRecords.stats.totalScheduled}</span> <span className="stat-label">Total Scheduled</span> </div>
                    <div className="stat-card present"> <span className="stat-value">{selectedEmployeeRecords.stats.totalScheduled - selectedEmployeeRecords.stats.totalAbsent}</span> <span className="stat-label">Days Present</span> </div>
                    <div className="stat-card late"> <span className="stat-value">{selectedEmployeeRecords.stats.totalLate}</span> <span className="stat-label">Total Lates</span> </div>
                    <div className="stat-card absent"> <span className="stat-value">{selectedEmployeeRecords.stats.totalAbsent}</span> <span className="stat-label">Total Absences</span> </div>
                </div>
                <div className="card data-table-card shadow-sm">
                    <div className="table-responsive">
                        <table className="table data-table mb-0">
                            <thead><tr><th>Date</th><th>Schedule</th><th>Sign In</th><th>Sign Out</th><th>Status</th></tr></thead>
                            <tbody>
                                {selectedEmployeeRecords.records.map(rec => (
                                    <tr key={rec.scheduleId || rec.date}>
                                        <td>{(() => {
                                          try {
                                            // Handle ISO timestamp format by extracting date part
                                            let dateStr = rec.date;
                                            if (dateStr && dateStr.includes('T')) {
                                              dateStr = dateStr.split('T')[0];
                                            }
                                            const date = new Date(dateStr);
                                            return isNaN(date.getTime()) ? rec.date : date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
                                          } catch (error) {
                                            return rec.date;
                                          }
                                        })()}</td><td>{(() => {
                                           // Extract time from shift datetime strings and format to HH:MM
                                           let shiftDisplay = rec.shift;
                                           if (typeof rec.shift === 'string' && rec.shift.includes(' - ')) {
                                              const [startDateTime, endDateTime] = rec.shift.split(' - ');
                                              
                                              // Extract time from datetime string (handles ISO format, space-separated format, and time-only format)
                                              const extractTime = (dateTimeStr) => {
                                                try {
                                                  // If it's an ISO datetime string, parse it and extract time
                                                  if (dateTimeStr.includes('T')) {
                                                    const date = new Date(dateTimeStr);
                                                    return date.toTimeString().split(' ')[0].split(':').slice(0, 2).join(':');
                                                  }
                                                  // If it's space-separated datetime format (YYYY-MM-DD HH:MM), extract time part
                                                  else if (dateTimeStr.includes(' ') && dateTimeStr.includes('-')) {
                                                    const timePart = dateTimeStr.split(' ')[1];
                                                    return timePart ? timePart.split(':').slice(0, 2).join(':') : dateTimeStr;
                                                  }
                                                  // If it already looks like time, just format it
                                                  else if (dateTimeStr.includes(':')) {
                                                    return dateTimeStr.split(':').slice(0, 2).join(':');
                                                  }
                                                  // Fallback
                                                  return dateTimeStr;
                                                } catch (error) {
                                                  return dateTimeStr;
                                                }
                                              };
                                              
                                              const startTime = extractTime(startDateTime.trim());
                                             const endTime = extractTime(endDateTime.trim());
                                             shiftDisplay = `${startTime} - ${endTime}`;
                                           }
                                           return shiftDisplay;
                                         })()}</td><td>{rec.signIn || '---'}</td><td>{rec.signOut || '---'}</td>
                                        <td><span className={`status-badge status-${rec.status.toLowerCase()}`}>{rec.status}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div>
            <div className="input-group mb-4" style={{maxWidth: '500px'}}>
                <span className="input-group-text"><i className="bi bi-search"></i></span>
                <input type="text" className="form-control" placeholder="Search by employee name or ID..." value={employeeSearchTerm} onChange={e => setEmployeeSearchTerm(e.target.value)} />
            </div>
            <div className="employee-selection-grid">
                {filteredEmployeesForSelection.map(emp => (
                    <div key={emp.id} className="employee-selection-card" onClick={() => setSelectedEmployee(emp)}>
                        <img src={emp.imageUrl || placeholderAvatar} alt={emp.name} className="employee-selection-avatar" />
                        <div className="employee-selection-info">
                            <div className="employee-selection-name">{emp.name}</div>
                            <div className="employee-selection-id text-muted">{emp.id}</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
  }

  return (
    <div className="container-fluid p-0 page-module-container">
      <header className="page-header attendance-page-header d-flex justify-content-between align-items-md-center p-3">
        <h1 className="page-main-title m-0">Attendance Management</h1>
        <div className="d-flex align-items-center gap-2">
            <input type="file" ref={fileInputRef} onChange={handleImport} className="d-none" accept=".xlsx, .xls, .csv" />
            <button className="btn btn-outline-secondary" onClick={handleImportClick}><i className="bi bi-upload me-2"></i>Import</button>
            <button className="btn btn-outline-secondary" onClick={handleExport} disabled={activeView !== 'daily' || !sortedAndFilteredList || sortedAndFilteredList.length === 0}><i className="bi bi-download me-2"></i>Export</button>
            <button className="btn btn-outline-secondary" onClick={handleGenerateReport} disabled={activeView !== 'daily' || !sortedAndFilteredList || sortedAndFilteredList.length === 0}>
                <i className="bi bi-file-earmark-text-fill me-2"></i>Generate Report
            </button>
            <div className="attendance-view-controls">
                <button className={`btn ${activeView === 'daily' ? 'active' : ''}`} onClick={() => { setActiveView('daily'); setCurrentDate(new Date().toISOString().split('T')[0]); }}>
                    <i className="bi bi-calendar-day me-2"></i>Daily
                </button>
                <button className={`btn ${activeView.startsWith('history') ? 'active' : ''}`} onClick={() => setActiveView('historyList')}>
                    <i className="bi bi-clock-history me-2"></i>History
                </button>
                <button className={`btn ${activeView === 'employee' ? 'active' : ''}`} onClick={() => { setActiveView('employee'); setSelectedEmployee(null); }}>
                    <i className="bi bi-person-lines-fill me-2"></i>By Employee
                </button>
            </div>
        </div>
      </header>
      
      <div className="attendance-page-content p-3">
        {loading && (
          <div className="text-center p-5">
            <div className="spinner-border text-success" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-3 text-muted">Loading attendance data...</p>
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
        {!loading && !error && activeView === 'employee' && renderEmployeeView()}
        {!loading && !error && (activeView === 'daily' || activeView === 'historyDetail') && (
          <>
            <div className="daily-view-header-bar">
              <div className="date-picker-group">
                {activeView === 'historyDetail' ? (
                  <button className="btn btn-outline-secondary" onClick={() => setActiveView('historyList')}>
                    <i className="bi bi-arrow-left"></i> Back to History
                  </button>
                ) : (
                  <div>
                    <label htmlFor="daily-date-picker" className="date-label">VIEWING DATE</label>
                    <input id="daily-date-picker" type="date" className="form-control" value={currentDate} onChange={(e) => setCurrentDate(e.target.value)} />
                  </div>
                )}
              </div>
              <div className="stat-cards-group">
                <div className={`stat-card scheduled ${!statusFilter ? 'active' : ''}`} onClick={() => handleStatusFilterClick('')}> <span className="stat-value">{dailyAttendanceList.length}</span> <span className="stat-label">Scheduled</span> </div>
                <div className={`stat-card present ${statusFilter === 'Present' ? 'active' : ''}`} onClick={() => handleStatusFilterClick('Present')}> <span className="stat-value">{dailyAttendanceList.filter(e => e.status === 'Present').length}</span> <span className="stat-label">Present</span> </div>
                <div className={`stat-card late ${statusFilter === 'Late' ? 'active' : ''}`} onClick={() => handleStatusFilterClick('Late')}> <span className="stat-value">{dailyAttendanceList.filter(e => e.status === 'Late').length}</span> <span className="stat-label">Late</span> </div>
                <div className={`stat-card absent ${statusFilter === 'Absent' ? 'active' : ''}`} onClick={() => handleStatusFilterClick('Absent')}> <span className="stat-value">{dailyAttendanceList.filter(e => e.status === 'Absent').length}</span> <span className="stat-label">Absent</span> </div>
              </div>
              <div className="filters-group"> <select className="form-select" value={positionFilter} onChange={(e) => setPositionFilter(e.target.value)}> {uniquePositions.map(pos => <option key={pos} value={pos === 'All Positions' ? '' : pos}>{pos}</option>)} </select> </div>
            </div>
            {sortedAndFilteredList.length > 0 ? (
                <div className="card data-table-card shadow-sm"><div className="table-responsive">
                  <table className="table data-table mb-0">
                      <thead><tr>
                          <th className="sortable" onClick={() => handleRequestSort('id')}>ID {getSortIcon('id')}</th>
                          <th className="sortable" onClick={() => handleRequestSort('name')}>Employee Name {getSortIcon('name')}</th>
                          <th>Position</th><th className="sortable" onClick={() => handleRequestSort('shift')}>Shift {getSortIcon('shift')}</th>
                          <th className="sortable" onClick={() => handleRequestSort('signIn')}>Sign In {getSortIcon('signIn')}</th>
                          <th className="sortable" onClick={() => handleRequestSort('breakOut')}>Break Out {getSortIcon('breakOut')}</th>
                          <th className="sortable" onClick={() => handleRequestSort('breakIn')}>Break In {getSortIcon('breakIn')}</th>
                          <th className="sortable" onClick={() => handleRequestSort('signOut')}>Sign Out {getSortIcon('signOut')}</th>
                          <th className="sortable" onClick={() => handleRequestSort('workingHours')}>Hours {getSortIcon('workingHours')}</th>
                          <th className="sortable" onClick={() => handleRequestSort('otHours')}>OT (hrs) {getSortIcon('otHours')}</th>
                          <th>Status</th><th>Actions</th>
                      </tr></thead>
                      <tbody>{sortedAndFilteredList.map((emp, index) => (
                          <tr key={`${emp.empId}-${emp.scheduleId}-${index}`}>
                              <td>{emp.id}</td><td>{emp.name}</td><td>{emp.position}</td><td>{emp.shift}</td>
                              <td>{emp.signIn || '---'}</td><td>{emp.breakOut || '---'}</td><td>{emp.breakIn || '---'}</td><td>{emp.signOut || '---'}</td><td>{emp.workingHours}</td><td>{emp.otHours || '0'}</td>
                              <td><span className={`status-badge status-${emp.status.toLowerCase()}`}>{emp.status}</span></td>
                              <td>
                              <div className="dropdown">
                                  <button className="btn btn-sm btn-outline-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown">Actions</button>
                                  <ul className="dropdown-menu dropdown-menu-end">
                                      <li>
                                        <a 
                                          className="dropdown-item" 
                                          href="#" 
                                          onClick={(e) => {e.preventDefault(); handleOpenEditModal(emp)}}
                                        >
                                          <i className="bi bi-pencil-fill me-2"></i>Edit / Log Times
                                        </a>
                                      </li>
                                  </ul>
                              </div>
                              </td>
                          </tr>
                      ))}</tbody>
                  </table>
                </div></div>
            ) : (
              <div className="text-center p-5 bg-light rounded d-flex flex-column justify-content-center" style={{minHeight: '300px'}}>
                  <i className="bi bi-calendar-check fs-1 text-muted mb-3 d-block"></i>
                  <h4 className="text-muted">{dailyAttendanceList.length > 0 && (positionFilter || statusFilter) ? 'No employees match filters.' : 'No Employees Scheduled'}</h4>
                  <p className="text-muted">{dailyAttendanceList.length > 0 && (positionFilter || statusFilter) ? 'Try adjusting your filters.' : 'There is no schedule created for this day.'}</p>
              </div>
            )}
          </>
        )}
        {!loading && !error && activeView === 'historyList' && (
          <>
            <h4 className="mb-3">Attendance History</h4>
            {attendanceHistoryDisplay.length > 0 ? (
              <div className="attendance-history-grid">
                {attendanceHistoryDisplay.map(day => (
                  <div key={day.date} className="attendance-history-card" onClick={() => handleViewHistoryDetail(day.date)}>
                   <div className="card-header">
                        <h5 className="card-title">
                          {day.date ? 
                            new Date(day.date).toLocaleDateString('en-US', { 
                              weekday: 'long', 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            }) : 
                            'Invalid Date'
                          }
                        </h5>
                        <button className="btn btn-sm btn-outline-danger delete-history-btn" onClick={(e) => handleOpenDeleteConfirm(e, day.date)} title="Delete this day's records">
                            <i className="bi bi-trash-fill"></i>
                        </button>
                    </div>
                    <div className="card-body"><div className="info-grid">
                        <div className="info-item scheduled"><span className="value">{day.total}</span><span className="label">Scheduled</span></div>
                        <div className="info-item present"><span className="value">{day.present - day.late}</span><span className="label">Present</span></div>
                        <div className="info-item late"><span className="value">{day.late}</span><span className="label">Late</span></div>
                        <div className="info-item absent"><span className="value">{day.absent}</span><span className="label">Absent</span></div>
                    </div></div>
                  </div>
                ))}
              </div>
            ) : <p className="text-muted">No historical attendance data found.</p>}
          </>
        )}
      </div>

      {(isLoading || pdfDataUri) && (
        <ReportPreviewModal 
            show={showReportPreview} 
            onClose={handleCloseReportPreview} 
            pdfDataUri={pdfDataUri} 
            reportTitle={`Daily Attendance - ${currentDate}`} 
        />
      )}

      {showEditModal && ( <EditAttendanceModal show={showEditModal} onClose={handleCloseEditModal} onSave={handleSaveEditedTime} attendanceRecord={editingAttendanceRecord}/> )}
      
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

export default AttendancePage;
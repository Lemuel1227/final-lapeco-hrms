import React, { useState, useMemo, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import './AttendancePage.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import ReportPreviewModal from '../../modals/ReportPreviewModal';
import EditAttendanceModal from '../../modals/EditAttendanceModal';
import ImportPreviewModal from '../../modals/ImportPreviewModal';
import useReportGenerator from '../../hooks/useReportGenerator';
import attendanceAPI from '../../services/attendanceAPI';
import { scheduleAPI } from '../../services/api';
import ToastNotification from '../../common/ToastNotification';

// Import the new view components
import DailyAttendanceView from './DailyAttendanceView';
import HistoryAttendanceView from './HistoryAttendanceView';
import ByEmployeeAttendanceView from './ByEmployeeAttendanceView';

const AttendancePage = () => {
  // State for UI
  const [activeView, setActiveView] = useState('daily');
  const [currentDate, setCurrentDate] = useState(new Date().toISOString().split('T')[0]);
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'ascending' });
  const [positionFilter, setPositionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');
  const [employeeDateFilter, setEmployeeDateFilter] = useState({ start: '', end: '' });
  const [employeeStatusFilter, setEmployeeStatusFilter] = useState('');

  const [showReportPreview, setShowReportPreview] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAttendanceRecord, setEditingAttendanceRecord] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingDate, setDeletingDate] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Excel Import state (NEW)
  const [showImportPreview, setShowImportPreview] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [allEmployees, setAllEmployees] = useState([]);
  const [parsedImportData, setParsedImportData] = useState([]);

  // Toast notification state
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  
  // State for data
  const [dailyAttendanceData, setDailyAttendanceData] = useState([]);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [employeesList, setEmployeesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const { generateReport, pdfDataUri, isLoading, setPdfDataUri } = useReportGenerator();
  const fileInputRef = useRef(null);
  const excelImportRef = useRef(null);

  // Fetch all employees for import matching (NEW)
  useEffect(() => {
    const fetchAllEmployees = async () => {
      try {
        const response = await attendanceAPI.getEmployeeNameID();
        setAllEmployees(response.data?.data || []);
      } catch (error) {
        console.error('Error fetching employees:', error);
      }
    };
    
    fetchAllEmployees();
  }, []);

  // Fetch data based on active view
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        if (activeView === 'daily' || activeView === 'historyDetail') {
          const dailyResponse = await attendanceAPI.getDaily({ date: currentDate });
          setDailyAttendanceData(dailyResponse.data || []);
        } else if (activeView === 'historyList') {
          const historyResponse = await attendanceAPI.getHistory();
          setAttendanceHistory(historyResponse.data || []);
        } else if (activeView === 'employee') {
          const employeesResponse = await attendanceAPI.getEmployeeNameID();
          setEmployeesList(employeesResponse.data?.data || []);
        }
        
      } catch (err) {
        console.error('Error fetching attendance data:', err);
        setError('Failed to load attendance data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [currentDate, activeView]);

  // Fetch specific employee attendance records
  const normalizeAttendanceRecord = (record = {}) => {
    const normalized = { ...record };

    const resolveValue = (...keys) => keys.find(value => value !== undefined && value !== null && value !== '') ?? null;

    normalized.signIn = normalized.signIn ?? resolveValue(normalized.timeIn, normalized.time_in, normalized.clockIn, normalized.clock_in);
    normalized.signOut = normalized.signOut ?? resolveValue(normalized.timeOut, normalized.time_out, normalized.clockOut, normalized.clock_out);
    normalized.breakIn = normalized.breakIn ?? resolveValue(normalized.breakInTime, normalized.break_in_time, normalized.break_in);
    normalized.breakOut = normalized.breakOut ?? resolveValue(normalized.breakOutTime, normalized.break_out_time, normalized.break_out);

    return normalized;
  };

  const fetchEmployeeAttendanceLogs = async (employeeId) => {
    try {
      const employeeAttendanceResponse = await attendanceAPI.getEmployeeAttendance(employeeId);
      const logs = employeeAttendanceResponse.data?.data || [];
      setAttendanceLogs(logs.map(normalizeAttendanceRecord));
    } catch (error) {
      console.error('Error fetching employee attendance logs:', error);
      setAttendanceLogs([]);
    }
  };

  const dailyAttendanceList = useMemo(() => {
    if (!dailyAttendanceData) return [];

    return dailyAttendanceData.map((record, index) => {
      let shiftDisplay = record.shift;
      let workingHours = 0;
      
      if (record.signIn && record.signOut) {
        try {
          const signInTime = new Date(`1970-01-01T${record.signIn}:00`);
          const signOutTime = new Date(`1970-01-01T${record.signOut}:00`);

          if (signOutTime <= signInTime) {
            signOutTime.setDate(signOutTime.getDate() + 1);
          }

          let totalMinutes = (signOutTime - signInTime) / (1000 * 60);

          if (totalMinutes < 0 || Number.isNaN(totalMinutes)) {
            totalMinutes = 0;
          }

          workingHours = Math.max(Math.floor(totalMinutes / 60), 0);
        } catch (error) {
          workingHours = 0;
        }
      }

      const overtimeHours = Math.max(Math.floor(Number(record.otHours ?? record.ot_hours ?? 0) || 0), 0);

      return {
        empId: record.empId,
        scheduleId: record.scheduleId,
        id: record.empId,
        name: record.employeeName,
        position: record.position,
        shift: shiftDisplay,
        signIn: record.signIn,
        breakOut: record.breakOut,
        breakIn: record.breakIn,
        signOut: record.signOut,
        status: record.status,
        workingHours,
        otHours: overtimeHours
      };
    });
  }, [dailyAttendanceData]);

  const sortedAndFilteredList = useMemo(() => {
    let list = [...dailyAttendanceList];
    
    if (positionFilter) {
      list = list.filter(emp => emp.position === positionFilter);
    }
    if (statusFilter) {
      // Treat 'Present' filter as Present OR Late
      if (statusFilter === 'Present') {
        list = list.filter(emp => emp.status === 'Present' || emp.status === 'Late');
      } else {
        list = list.filter(emp => emp.status === statusFilter);
      }
    }
    
    list.sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      
      if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
      return 0;
    });
    
    return list;
  }, [dailyAttendanceList, positionFilter, statusFilter, sortConfig]);

  // History list filters
  const [historySearchTerm, setHistorySearchTerm] = useState('');
  const [historyMonthFilter, setHistoryMonthFilter] = useState(''); // '': All, otherwise 1..12
  const [historyYearFilter, setHistoryYearFilter] = useState('');   // '': All, otherwise year number

  const availableHistoryYears = useMemo(() => {
    if (!attendanceHistory) return [];
    const years = Array.from(new Set(attendanceHistory.map(d => new Date(d.date).getFullYear())));
    return years.sort((a, b) => b - a);
  }, [attendanceHistory]);

  const attendanceHistoryDisplay = useMemo(() => {
    if (!attendanceHistory) return [];
    let list = attendanceHistory.map(day => ({
      date: day.date.split('T')[0],
      present: day.present,
      late: day.late,
      absent: day.absent,
      total: day.total,
    }));

    // Apply Month filter (1..12)
    if (historyMonthFilter) {
      const targetMonth = Number(historyMonthFilter);
      list = list.filter(d => (new Date(d.date).getMonth() + 1) === targetMonth);
    }

    // Apply Year filter
    if (historyYearFilter) {
      const targetYear = Number(historyYearFilter);
      list = list.filter(d => new Date(d.date).getFullYear() === targetYear);
    }

    // Apply search on formatted date or ISO string
    if (historySearchTerm) {
      const term = historySearchTerm.toLowerCase();
      list = list.filter(d => {
        const formatted = new Date(d.date).toLocaleDateString('en-US', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        }).toLowerCase();
        return formatted.includes(term) || d.date.includes(historySearchTerm);
      });
    }

    return list.sort((a,b) => new Date(b.date) - new Date(a.date));
  }, [attendanceHistory, historyMonthFilter, historyYearFilter, historySearchTerm]);

  const availableEmployees = useMemo(() => {
    return Array.isArray(employeesList) ? employeesList : [];
  }, [employeesList]);

  const filteredEmployeesForSelection = useMemo(() => {
    if (!employeeSearchTerm) return availableEmployees;
    
    return availableEmployees.filter(emp => 
      emp.name.toLowerCase().includes(employeeSearchTerm.toLowerCase()) ||
      emp.id.toString().includes(employeeSearchTerm)
    );
  }, [availableEmployees, employeeSearchTerm]);
    
  const selectedEmployeeRecords = useMemo(() => {
      if (!selectedEmployee || !attendanceLogs) return { records: [], stats: {} };
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      let filteredRecords = attendanceLogs.filter(log => log.empId === selectedEmployee.id);
      
      if (employeeDateFilter.start || employeeDateFilter.end) {
        filteredRecords = filteredRecords.filter(record => {
          const recordDate = new Date(record.date);
          recordDate.setHours(0, 0, 0, 0);
          
          let matchesStart = true;
          let matchesEnd = true;
          
          if (employeeDateFilter.start) {
            const startDate = new Date(employeeDateFilter.start);
            startDate.setHours(0, 0, 0, 0);
            matchesStart = recordDate >= startDate;
          }
          
          if (employeeDateFilter.end) {
            const endDate = new Date(employeeDateFilter.end);
            endDate.setHours(0, 0, 0, 0);
            matchesEnd = recordDate <= endDate;
          }
          
          return matchesStart && matchesEnd;
        });
      }
      
      if (employeeStatusFilter) {
        // Treat 'Present' filter as Present OR Late
        if (employeeStatusFilter === 'Present') {
          filteredRecords = filteredRecords.filter(record => record.status === 'Present' || record.status === 'Late');
        } else {
          filteredRecords = filteredRecords.filter(record => record.status === employeeStatusFilter);
        }
      }
      
      const sortedRecords = filteredRecords.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      const allRecords = attendanceLogs.filter(log => log.empId === selectedEmployee.id);
      let statsRecords = allRecords;
      
      if (employeeDateFilter.start || employeeDateFilter.end) {
        statsRecords = allRecords.filter(record => {
          const recordDate = new Date(record.date);
          recordDate.setHours(0, 0, 0, 0);
          
          let matchesStart = true;
          let matchesEnd = true;
          
          if (employeeDateFilter.start) {
            const startDate = new Date(employeeDateFilter.start);
            startDate.setHours(0, 0, 0, 0);
            matchesStart = recordDate >= startDate;
          }
          
          if (employeeDateFilter.end) {
            const endDate = new Date(employeeDateFilter.end);
            endDate.setHours(0, 0, 0, 0);
            matchesEnd = recordDate <= endDate;
          }
          
          return matchesStart && matchesEnd;
        });
      }
      
      const totalScheduled = statsRecords.length;
      // Treat Late as present for totals and percentage
      const totalPresent = statsRecords.filter(r => r.status === 'Present' || r.status === 'Late').length;
      const totalLate = statsRecords.filter(r => r.status === 'Late').length;
      const totalAbsent = statsRecords.filter(r => r.status === 'Absent').length;
      
      const presentPercentage = totalScheduled > 0 ? Math.round((totalPresent / totalScheduled) * 100) : 0;
      const latePercentage = totalScheduled > 0 ? Math.round((totalLate / totalScheduled) * 100) : 0;
      const absentPercentage = totalScheduled > 0 ? Math.round((totalAbsent / totalScheduled) * 100) : 0;
      
      return {
        records: sortedRecords,
        stats: {
          totalScheduled,
          totalPresent,
          totalLate,
          totalAbsent,
          presentPercentage,
          latePercentage,
          absentPercentage
        }
      };
  }, [selectedEmployee, attendanceLogs, employeeDateFilter, employeeStatusFilter]);

  const handleRequestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const handleStatusFilterClick = (status) => {
    setStatusFilter(statusFilter === status ? '' : status);
  };

  const handleEmployeeStatusFilterClick = (status) => {
    setEmployeeStatusFilter(employeeStatusFilter === status ? '' : status);
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <i className="bi bi-arrow-down-up sort-icon ms-1"></i>;
    return sortConfig.direction === 'ascending' ? <i className="bi bi-sort-up sort-icon active ms-1"></i> : <i className="bi bi-sort-down sort-icon active ms-1"></i>;
  };

  const handleViewHistoryDetail = (date) => {
    setCurrentDate(date);
    handleViewChange('historyDetail');
  };

  const handleOpenDeleteConfirm = (e, date) => {
    e.stopPropagation();
    setDeletingDate(date);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingDate || isDeleting) return;
    
    setIsDeleting(true);
    try {
      const dailyResponse = await attendanceAPI.getDaily({ date: deletingDate });
      const records = dailyResponse.data || [];
      
      if (records.length === 0) {
        setToast({
          show: true,
          message: 'No records found for this date',
          type: 'warning'
        });
        setShowDeleteConfirm(false);
        setDeletingDate(null);
        return;
      }
      
      const scheduleId = records[0]?.scheduleId;
      
      if (!scheduleId) {
        setToast({
          show: true,
          message: 'No schedule found for this date',
          type: 'warning'
        });
        setShowDeleteConfirm(false);
        setDeletingDate(null);
        return;
      }
      
      await scheduleAPI.delete(scheduleId);
      
      const historyResponse = await attendanceAPI.getHistory();
      setAttendanceHistory(historyResponse.data || []);
      
      setToast({
        show: true,
        message: `Successfully deleted schedule and all attendance records for ${deletingDate}`,
        type: 'success'
      });
      
    } catch (error) {
      console.error('Error deleting schedule:', error);
      setToast({
        show: true,
        message: 'Failed to delete schedule and attendance records',
        type: 'error'
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
      setDeletingDate(null);
    }
  };

  const handleCancelDelete = () => {
    setIsDeleting(false);
    setShowDeleteConfirm(false);
    setDeletingDate(null);
  };

  const handleEmployeeSelect = async (employee) => {
    setSelectedEmployee(employee);
    await fetchEmployeeAttendanceLogs(employee.id);
  };

  const handleEmployeeDeselect = () => {
    setSelectedEmployee(null);
    setAttendanceLogs([]);
  };

  const handleViewChange = (newView) => {
    setActiveView(newView);
    
    if (newView !== 'daily' && newView !== 'historyDetail') {
      setDailyAttendanceData([]);
    }
    if (newView !== 'historyList') {
      setAttendanceHistory([]);
    }
    if (newView !== 'employee') {
      setEmployeesList([]);
      setSelectedEmployee(null);
      setAttendanceLogs([]);
      setEmployeeStatusFilter('');
    }
    
    if (newView === 'daily') {
      setCurrentDate(new Date().toISOString().split('T')[0]);
    }
  };

  const handleGenerateReport = async () => {
    if (!sortedAndFilteredList || sortedAndFilteredList.length === 0) {
      setToast({ 
        show: true, 
        message: 'No data available to generate report for the selected date.', 
        type: 'warning' 
      });
      return;
    }
    
    try {
      // Prepare data in the format expected by attendance summary report generator
      const parseShiftTimes = (shiftString) => {
        if (!shiftString || typeof shiftString !== 'string') {
          return { startTime: null, endTime: null };
        }
        const parts = shiftString.split('-');
        if (parts.length !== 2) {
          return { startTime: null, endTime: null };
        }
        const [startRaw, endRaw] = parts;
        const startTime = startRaw?.trim() || null;
        const endTime = endRaw?.trim() || null;
        return { startTime, endTime };
      };

      const schedules = (dailyAttendanceData || dailyAttendanceList).map(record => {
        const { startTime, endTime } = parseShiftTimes(record.shift);
        return {
          date: record.date ?? currentDate,
          empId: record.empId,
          start_time: record.start_time ?? startTime ?? null,
          end_time: record.end_time ?? endTime ?? null,
        };
      });

      const attendanceLogs = (dailyAttendanceData || dailyAttendanceList).map(record => ({
        date: record.date ?? currentDate,
        empId: record.empId,
        signIn: record.signIn ?? null,
        breakOut: record.breakOut ?? null,
        breakIn: record.breakIn ?? null,
        signOut: record.signOut ?? null,
        overtime_hours: record.otHours ?? record.ot_hours ?? '0'
      }));

      const employeeSource = dailyAttendanceList?.length ? dailyAttendanceList : dailyAttendanceData || [];
      const employees = Array.from(
        new Map(
          employeeSource.map(record => [record.empId, {
            id: record.empId,
            name: record.name ?? record.employeeName,
            position: record.position ?? null
          }])
        ).values()
      );

      // Call generateReport with correct parameters: (reportId, params, dataSources)
      await generateReport(
        'attendance_summary',
        { startDate: currentDate },
        { schedules, attendanceLogs, employees }
      );
      
      setShowReportPreview(true);
      
    } catch (error) {
      console.error('Error generating report:', error);
      setToast({ 
        show: true, 
        message: 'Failed to generate report. Please try again.', 
        type: 'error' 
      });
    }
  };

  const handleCloseReportPreview = () => {
    setShowReportPreview(false);
    setPdfDataUri(null);
  };

  const handleOpenEditModal = (attendanceRecord) => {
    setEditingAttendanceRecord(attendanceRecord);
    setShowEditModal(true);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingAttendanceRecord(null);
  };

  const handleSaveEditedTime = async (attendanceId, date, updatedTimes) => {
    if (!editingAttendanceRecord) return;
    
    try {
      const existingRecord = dailyAttendanceData.find(record => 
        record.empId === editingAttendanceRecord.empId && 
        record.scheduleId === editingAttendanceRecord.scheduleId
      );
      
      if (!existingRecord) {
        setToast({ 
          show: true, 
          message: 'Unable to find the attendance record to update.', 
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
        ot_hours: Number(updatedTimes.ot_hours ?? 0),
      };
      
      if (existingRecord.id) {
        await attendanceAPI.update(existingRecord.id, updatedRecord);
        setToast({ 
          show: true, 
          message: 'Attendance record updated successfully', 
          type: 'success' 
        });
      } else {
        await attendanceAPI.create(updatedRecord);
        setToast({ 
          show: true, 
          message: 'Attendance record created successfully', 
          type: 'success' 
        });
      }
      
      const response = await attendanceAPI.getDaily({ date: currentDate });
      setDailyAttendanceData(response.data || []);
      
      handleCloseEditModal();
    } catch (error) {
      console.error('Error saving attendance record:', error);
      
      let errorMessage = 'Failed to save attendance record. Please try again.';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.errors) {
        const validationErrors = Object.values(error.response.data.errors).flat();
        errorMessage = `Please check your input: ${validationErrors.join(', ')}`;
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
        'Time-In': emp.signIn || '', 'Break Out': emp.breakOut || '', 'Break In': emp.breakIn || '',
        'Time-Out': emp.signOut || '', 'Status': emp.status, 'Working Hours': emp.workingHours,
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

  // OLD IMPORT - Keep for backward compatibility
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

  // NEW EXCEL IMPORT HANDLER
  const handleExcelImportClick = () => {
    excelImportRef.current.click();
  };

  const handleExcelImportFileSelect = (event) => {
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
          
          // Transform the imported data to match the expected format
          const transformedData = importedData.map((row, index) => {
            const name = row['Name'] || '';
            const idNumber = row['No.'] || row['ID'] || row['No'] || '';
            const dateTimeStr = row['Date/Time'] || row['DateTime'] || '';
            const status = row['Status'] || '';
            
            // Parse date/time
            let dateTime = null;
            if (dateTimeStr) {
              dateTime = new Date(dateTimeStr);
              if (isNaN(dateTime.getTime())) {
                dateTime = null;
              }
            }
            
            // Determine log type from Status
            let logType = 'Unknown';
            if (status) {
              const statusLower = status.toLowerCase();
              if (statusLower.includes('c/in') || statusLower.includes('sign in')) {
                logType = 'Sign In';
              } else if (statusLower.includes('c/out') || statusLower.includes('sign out')) {
                logType = 'Sign Out';
              } else if (statusLower.includes('break in')) {
                logType = 'Break In';
              } else if (statusLower.includes('break out')) {
                logType = 'Break Out';
              }
            }
            
            // Try to match employee by ID (ID is more reliable than name)
            const matchedEmployee = allEmployees.find(emp => 
              emp.id.toString() === idNumber.toString()
            );
            
            return {
              name,
              idNumber: idNumber.toString(),
              dateTime,
              logType,
              matchStatus: matchedEmployee ? 'matched' : 'unmatched',
              employeeId: matchedEmployee?.id || null,
              employeeName: matchedEmployee?.name || null,
              excluded: false
            };
          });
          
          setParsedImportData(transformedData);
          setShowImportPreview(true);
        } catch (error) {
          console.error('Import error:', error);
          setToast({ 
            show: true, 
            message: 'Failed to process the file. Please ensure it is a valid Excel/CSV format.', 
            type: 'error' 
          });
        }
      };
      reader.readAsArrayBuffer(file);
    }
    event.target.value = null;
  };

  // CONFIRM IMPORT - Use backend API
  const formatForBackend = (date) => {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
    const pad = (value) => value.toString().padStart(2, '0');
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    const seconds = pad(date.getSeconds());
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  };

  const handleConfirmImport = async (importedRecords) => {
    setIsImporting(true);
    
    try {
      // Transform data to match backend API expectations
      const records = importedRecords
        .map(record => {
          const formattedDateTime = formatForBackend(record.dateTime);
          return {
            employeeId: record.employeeId,
            dateTime: formattedDateTime,
            logType: record.logType
          };
        })
        .filter(record => Boolean(record.employeeId) && Boolean(record.dateTime));

      if (records.length === 0) {
        setToast({
          show: true,
          message: 'No valid attendance records to import after validation.',
          type: 'warning'
        });
        setIsImporting(false);
        return;
      }
      
      // Call backend import API
      const response = await attendanceAPI.import({ records });
      
      if (response.data.success) {
        const { imported, schedulesCreated, errors } = response.data;
        
        let message = `Successfully imported ${imported} attendance record(s).`;
        if (schedulesCreated > 0) {
          message += ` ${schedulesCreated} schedule(s) created.`;
        }
        if (errors && errors.length > 0) {
          message += ` ${errors.length} error(s) occurred.`;
          console.error('Import errors:', errors);
        }
        
        setToast({
          show: true,
          message,
          type: errors && errors.length > 0 ? 'warning' : 'success'
        });
        
        setShowImportPreview(false);
        setParsedImportData([]);
        
        // Refresh data
        if (activeView === 'daily') {
          const response = await attendanceAPI.getDaily({ date: currentDate });
          setDailyAttendanceData(response.data || []);
        } else if (activeView === 'historyList') {
          const response = await attendanceAPI.getHistory();
          setAttendanceHistory(response.data || []);
        }
      } else {
        throw new Error(response.data.message || 'Import failed');
      }
    } catch (error) {
      console.error('Import error:', error);
      setToast({
        show: true,
        message: error.response?.data?.message || 'Failed to import attendance records. Please try again.',
        type: 'error'
      });
    } finally {
      setIsImporting(false);
    }
  };
  
  const uniquePositions = useMemo(() => ['All Positions', ...new Set(dailyAttendanceList.map(item => item.position))], [dailyAttendanceList]);

  return (
    <div className="container-fluid p-0 page-module-container">
      <header className="page-header attendance-page-header d-flex justify-content-between align-items-md-center p-3">
        <h1 className="page-main-title m-0">Attendance Management</h1>
        <div className="d-flex align-items-center gap-2">
            {/* Old Import - Direct for current date */}
            <input type="file" ref={fileInputRef} onChange={handleImport} className="d-none" accept=".xlsx, .xls" />
            
            {/* New Excel Import - With preview and validation */}
            <input 
              type="file" 
              ref={excelImportRef} 
              onChange={handleExcelImportFileSelect} 
              className="d-none" 
              accept=".xlsx, .xls" 
            />
            
            <button 
              className="btn btn-outline-secondary"
              onClick={handleExcelImportClick}
            >
              <i className="bi bi-file-earmark-arrow-up me-2"></i>Import Excel
            </button>

            <button className="btn btn-outline-secondary" onClick={handleExport} disabled={activeView !== 'daily' || !sortedAndFilteredList || sortedAndFilteredList.length === 0}>
              <i className="bi bi-download me-2"></i>Export
            </button>
            <button className="btn btn-outline-secondary" onClick={handleGenerateReport} disabled={activeView !== 'daily' || !sortedAndFilteredList || sortedAndFilteredList.length === 0}>
                <i className="bi bi-file-earmark-text-fill me-2"></i>Generate Report
            </button>
            <div className="attendance-view-controls">
                <button className={`btn ${activeView === 'daily' ? 'active' : ''}`} onClick={() => handleViewChange('daily')}>
                    <i className="bi bi-calendar-day me-2"></i>Daily
                </button>
                <button className={`btn ${activeView.startsWith('history') ? 'active' : ''}`} onClick={() => handleViewChange('historyList')}>
                    <i className="bi bi-clock-history me-2"></i>History
                </button>
                <button className={`btn ${activeView === 'employee' ? 'active' : ''}`} onClick={() => handleViewChange('employee')}>
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
        
        {!loading && !error && activeView === 'employee' && (
          <ByEmployeeAttendanceView
            selectedEmployee={selectedEmployee}
            setSelectedEmployee={handleEmployeeDeselect}
            employeeDateFilter={employeeDateFilter}
            setEmployeeDateFilter={setEmployeeDateFilter}
            selectedEmployeeRecords={selectedEmployeeRecords}
            employeeSearchTerm={employeeSearchTerm}
            setEmployeeSearchTerm={setEmployeeSearchTerm}
            filteredEmployeesForSelection={filteredEmployeesForSelection}
            onEmployeeSelect={handleEmployeeSelect}
            employeeStatusFilter={employeeStatusFilter}
            handleEmployeeStatusFilterClick={handleEmployeeStatusFilterClick}
          />
        )}
        
        {!loading && !error && activeView === 'daily' && (
          <DailyAttendanceView
            currentDate={currentDate}
            setCurrentDate={setCurrentDate}
            statusFilter={statusFilter}
            handleStatusFilterClick={handleStatusFilterClick}
            positionFilter={positionFilter}
            setPositionFilter={setPositionFilter}
            uniquePositions={uniquePositions}
            dailyAttendanceList={dailyAttendanceList}
            sortedAndFilteredList={sortedAndFilteredList}
            handleRequestSort={handleRequestSort}
            getSortIcon={getSortIcon}
            handleOpenEditModal={handleOpenEditModal}
          />
        )}
        
        {!loading && !error && (activeView === 'historyList' || activeView === 'historyDetail') && (
          <HistoryAttendanceView
            activeView={activeView}
            setActiveView={handleViewChange}
            attendanceHistoryDisplay={attendanceHistoryDisplay}
            handleViewHistoryDetail={handleViewHistoryDetail}
            handleOpenDeleteConfirm={handleOpenDeleteConfirm}
            currentDate={currentDate}
            setCurrentDate={setCurrentDate}
            statusFilter={statusFilter}
            handleStatusFilterClick={handleStatusFilterClick}
            positionFilter={positionFilter}
            setPositionFilter={setPositionFilter}
            uniquePositions={uniquePositions}
            dailyAttendanceList={dailyAttendanceList}
            sortedAndFilteredList={sortedAndFilteredList}
            handleRequestSort={handleRequestSort}
            getSortIcon={getSortIcon}
            handleOpenEditModal={handleOpenEditModal}
            historySearchTerm={historySearchTerm}
            setHistorySearchTerm={setHistorySearchTerm}
            historyMonthFilter={historyMonthFilter}
            setHistoryMonthFilter={setHistoryMonthFilter}
            historyYearFilter={historyYearFilter}
            setHistoryYearFilter={setHistoryYearFilter}
            availableHistoryYears={availableHistoryYears}
          />
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
      
      {showImportPreview && (
        <ImportPreviewModal
          show={showImportPreview}
          onClose={() => setShowImportPreview(false)}
          importData={parsedImportData}
          onConfirm={handleConfirmImport}
          employeesList={allEmployees}
          isLoading={isImporting}
        />
      )}
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirm Delete</h5>
                <button type="button" className="btn-close" onClick={handleCancelDelete} aria-label="Close"></button>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to delete all attendance records for <strong>{deletingDate}</strong>?</p>
                <div className="alert alert-warning" role="alert">
                  <i className="bi bi-exclamation-triangle-fill me-2"></i>
                  <strong>Warning:</strong> This will also delete the corresponding schedule for this date and all associated data.
                </div>
                <p className="text-muted">This action cannot be undone.</p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleCancelDelete} disabled={isDeleting}>Cancel</button>
                <button type="button" className="btn btn-danger" onClick={handleConfirmDelete} disabled={isDeleting}>
                  {isDeleting ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Deleting...
                    </>
                  ) : (
                    'Delete'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
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

export default AttendancePage;
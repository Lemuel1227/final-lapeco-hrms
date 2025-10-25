import React, { useState, useMemo, useEffect } from 'react';
import './EmployeeDataPage.css';
import AddEditEmployeeModal from '../../modals/AddEditEmployeeModal';
import ReportPreviewModal from '../../modals/ReportPreviewModal';
import RequirementsChecklist from './RequirementsChecklist';
import 'bootstrap-icons/font/bootstrap-icons.css';
import ConfirmationModal from '../../modals/ConfirmationModal';
import AccountGeneratedModal from '../../modals/AccountGeneratedModal';
import placeholderImage from '../../assets/placeholder-profile.jpg';
import useReportGenerator from '../../hooks/useReportGenerator';
import TerminateEmployeeModal from '../../modals/TerminateEmployeeModal';
import logo from '../../assets/logo.png';
import { employeeAPI, terminationAPI } from '../../services/api';
import { positionAPI } from '../../services/api';
import ToastNotification from '../../common/ToastNotification';
import api from '../../services/api';

const EmployeeDataPage = () => {
  const [employees, setEmployees] = useState([]);
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [viewMode, setViewMode] = useState('card');
  const [searchTerm, setSearchTerm] = useState('');
  const [positionFilter, setPositionFilter] = useState('');
  const [joiningDateFilter, setJoiningDateFilter] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'ascending' });
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isViewOnlyMode, setIsViewOnlyMode] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingEmployee, setViewingEmployee] = useState(null);
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showReportPreview, setShowReportPreview] = useState(false);
  const { generateReport, pdfDataUri, isLoading, setPdfDataUri } = useReportGenerator();
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [newlyGeneratedAccount, setNewlyGeneratedAccount] = useState(null);
  const [showTerminateModal, setShowTerminateModal] = useState(false);
  const [employeeToTerminate, setEmployeeToTerminate] = useState(null);

  const [reportTitle, setReportTitle] = useState('');
  
  const activeAndInactiveEmployees = useMemo(() => {
    return employees.filter(emp => emp.status === 'Active' || emp.status === 'Inactive');
  }, [employees]);

  // Build a fully qualified URL for files returned as relative paths from the backend
  const buildFileUrl = (path) => {
    if (!path) return null;
    if (/^https?:\/\//i.test(path) || path.startsWith('blob:')) return path;
    const root = (api?.defaults?.baseURL || '').replace(/\/api\/?$/, '');
    return `${root}${path.startsWith('/') ? '' : '/'}${path}`;
  };

  const normalizeEmployee = (e) => {
    const firstName = e.first_name ?? e.firstName ?? null;
    const middleName = e.middle_name ?? e.middleName ?? null;
    const lastName = e.last_name ?? e.lastName ?? null;
    const fullName = [firstName, middleName, lastName].filter(Boolean).join(' ') || e.name || '';
    const attendanceStatus = e.attendance_status ?? 'Pending';
    const accountStatus = e.account_status ?? e.status ?? null;

    return {
      id: e.id,
      first_name: firstName,
      middle_name: middleName,
      last_name: lastName,
      name: fullName,
      email: e.email,
      role: e.role,
      positionId: e.position_id ?? e.positionId ?? null,
      position: e.position ?? null,
      joiningDate: e.joining_date ?? e.joiningDate ?? null,
      birthday: e.birthday ?? null,
      gender: e.gender ?? null,
      address: e.address ?? null,
      contactNumber: e.contact_number ?? e.contactNumber ?? null,
      imageUrl: e.profile_picture_url ?? null,
      sssNo: e.sss_no ?? e.sssNo ?? null,
      tinNo: e.tin_no ?? e.tinNo ?? null,
      pagIbigNo: e.pag_ibig_no ?? e.pagIbigNo ?? null,
      philhealthNo: e.philhealth_no ?? e.philhealthNo ?? null,
      resumeFile: e.resume_file ?? e.resumeFile ?? null,
      // Prefer explicit resumeUrl; otherwise derive from resume_file if provided as a relative storage path
      resumeUrl: e.resumeUrl ?? buildFileUrl(e.resume_file ?? null),
      attendance_status: attendanceStatus,
      account_status: accountStatus,
      status: accountStatus ?? attendanceStatus,
    };
  };

  // Fetch employees and positions
  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);
        const [empRes, posRes] = await Promise.all([
          employeeAPI.getList(), // Use optimized endpoint for list view
          positionAPI.getAll(),
        ]);
        const empData = Array.isArray(empRes.data) ? empRes.data : (empRes.data?.data || []);
        const posData = Array.isArray(posRes.data) ? posRes.data : (posRes.data?.data || []);
        
        // Create position lookup map
        const positionMap = {};
        posData.forEach(p => {
          positionMap[p.id] = p.title ?? p.name;
        });
        
        // For list view, we already have the essential data from the optimized endpoint
        // No need to normalize as much since the backend returns the right format
        const normalizedEmployees = empData.map(e => {
          const normalized = normalizeEmployee(e);
          return {
            ...normalized,
            positionTitle: normalized.position ?? positionMap[normalized.positionId] ?? null,
          };
        });
        
        setEmployees(normalizedEmployees);

        // Normalize positions to { id, title }
        setPositions(posData.map(p => ({ id: p.id, title: p.title ?? p.name })));
        setError(null);
      } catch (err) {
        setError('Failed to load data. Please try again.');
        setEmployees([]);
        setPositions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  const handlers = { 
    saveEmployee: async (employeeData, id) => {
      try {
        const isEdit = Boolean(id);
        
        // Check if we have NEW files to upload
        const hasNewResumeFile = employeeData.resumeFile && employeeData.resumeFile instanceof File;
        const hasNewImageFile = employeeData.imageUrl && employeeData.imageUrl instanceof File;
        
        console.log('File upload check:', {
          hasResumeFile: !!employeeData.resumeFile,
          isResumeFileInstance: employeeData.resumeFile instanceof File,
          hasNewResumeFile: hasNewResumeFile,
          hasImageFile: !!employeeData.imageUrl,
          isImageFileInstance: employeeData.imageUrl instanceof File,
          hasNewImageFile: hasNewImageFile,
          resumeFileType: typeof employeeData.resumeFile,
          imageFileType: typeof employeeData.imageUrl
        });
        
        // Always use FormData to support file uploads (even if no file is selected)
        let payload = new FormData();
        
        // For PUT requests with FormData, we need to add method override
        if (isEdit) {
          payload.append('_method', 'PUT');
        }
        
        payload.append('name', employeeData.name);
        payload.append('email', employeeData.email);
        if (!isEdit) {
          payload.append('role', employeeData.role || 'REGULAR_EMPLOYEE');
        }
        if (employeeData.positionId) payload.append('position_id', Number(employeeData.positionId));
        if (employeeData.joiningDate) payload.append('joining_date', employeeData.joiningDate);
        if (employeeData.birthday) payload.append('birthday', employeeData.birthday);
        if (employeeData.gender) payload.append('gender', employeeData.gender);
        if (employeeData.address) payload.append('address', employeeData.address);
        if (employeeData.contactNumber) payload.append('contact_number', employeeData.contactNumber);
        if (employeeData.sssNo) payload.append('sss_no', employeeData.sssNo);
        if (employeeData.tinNo) payload.append('tin_no', employeeData.tinNo);
        if (employeeData.pagIbigNo) payload.append('pag_ibig_no', employeeData.pagIbigNo);
        if (employeeData.philhealthNo) payload.append('philhealth_no', employeeData.philhealthNo);
        
        // Only append files if new files were selected
        if (hasNewResumeFile) {
          payload.append('resume_file', employeeData.resumeFile);
          console.log('Appending resume file to FormData:', employeeData.resumeFile.name);
        } else {
          console.log('No new resume file to append');
        }
        
        if (hasNewImageFile) {
          payload.append('imageUrl', employeeData.imageUrl);
          console.log('Appending profile picture to FormData:', employeeData.imageUrl.name);
        } else {
          console.log('No new profile picture to append');
        }

        if (isEdit) {
          console.log('Updating employee with payload:', payload);
          console.log('Has new resume file:', hasNewResumeFile);
          console.log('Has new image file:', hasNewImageFile);
          if (hasNewResumeFile && employeeData.resumeFile) {
            console.log('Resume file details:', {
              name: employeeData.resumeFile.name,
              size: employeeData.resumeFile.size,
              type: employeeData.resumeFile.type
            });
          }
          if (hasNewImageFile && employeeData.imageUrl) {
            console.log('Image file details:', {
              name: employeeData.imageUrl.name,
              size: employeeData.imageUrl.size,
              type: employeeData.imageUrl.type
            });
          }
          // Use POST with _method=PUT for FormData file uploads
          await api.post(`/employees/${id}`, payload);
          setToast({ show: true, message: 'Employee updated successfully!', type: 'success' });
        } else {
          const response = await employeeAPI.create(payload);
          setToast({ show: true, message: 'Employee created successfully!', type: 'success' });
          
          // Show account details modal if account_details are returned
          if (response.data.account_details) {
            setNewlyGeneratedAccount(response.data.account_details);
          }
        }
        // Refresh
        const response = await employeeAPI.getList();
        const empData = Array.isArray(response.data) ? response.data : (response.data?.data || []);
        
        // For list view, we already have the essential data from the optimized endpoint
        const normalizedEmployees = empData.map(e => {
          const normalized = normalizeEmployee(e);
          return {
            ...normalized,
            positionTitle: normalized.position,
          };
        });
        
        setEmployees(normalizedEmployees);
        setShowAddEditModal(false);
      } catch (err) {
        // Extract user-friendly error message from backend response
        let message = 'Failed to save employee. Please try again.';
        
        if (err?.response?.data?.message) {
          // Use the user-friendly message from backend
          message = err.response.data.message;
        } else if (err?.response?.data?.errors) {
          // Handle validation errors
          const apiErrors = err.response.data.errors;
          message = Object.values(apiErrors).flat().join('\n');
        } else if (err?.response?.status === 403) {
          message = 'Access denied. You do not have permission to perform this action.';
        } else if (err?.response?.status === 422) {
          // Check for specific error types
          if (err?.response?.data?.error_type === 'duplicate_email_error') {
            message = err.response.data.message || 'This email address is already registered in the system. Please use a different email address.';
          } else {
            message = err.response.data.message || 'Please check your input and try again.';
          }
        } else if (err?.response?.status >= 500) {
          message = 'Server error occurred. Please try again later or contact support.';
        }
        
        setToast({ show: true, message: message, type: 'error' });
      }
    }, 
    deleteEmployee: async (employeeId) => {
      if (isDeleting) return; // Prevent double-click
      
      setIsDeleting(true);
      try {
        await employeeAPI.delete(employeeId);
        setToast({ show: true, message: 'Employee deleted successfully!', type: 'success' });
        const response = await employeeAPI.getList();
        const empData = Array.isArray(response.data) ? response.data : (response.data?.data || []);
        const normalizedEmployees = empData.map(e => {
          const normalized = normalizeEmployee(e);
          return {
            ...normalized,
            positionTitle: normalized.position,
          };
        });
        setEmployees(normalizedEmployees);
      } catch (err) {
        // Extract user-friendly error message from backend response
        let message = 'Failed to delete employee. Please try again.';
        
        if (err?.response?.data?.message) {
          // Use the user-friendly message from backend
          message = err.response.data.message;
        } else if (err.response?.status === 404) {
          message = 'Employee not found. It may have already been deleted.';
        } else if (err?.response?.status === 403) {
          message = 'Access denied. You do not have permission to delete employees.';
        } else if (err?.response?.status >= 500) {
          message = 'Server error occurred. Please try again later or contact support.';
        }
        
        setToast({ show: true, message: message, type: 'error' });
        
        // Refresh data to sync with server state if it's a 404 error
        if (err.response?.status === 404) {
          try {
            const response = await employeeAPI.getList();
            const empData = Array.isArray(response.data) ? response.data : (response.data?.data || []);
            const normalizedEmployees = empData.map(e => ({
              id: e.id,
              name: e.name,
              email: e.email,
              positionId: e.position_id,
              position: e.position,
              positionTitle: e.position,
              joiningDate: e.joining_date,
              imageUrl: e.profile_picture_url || null,
              status: e.status,
              attendance_status: e.attendance_status,
            }));
            setEmployees(normalizedEmployees);
          } catch (refreshError) {
            // Silent fail on refresh error
          }
        }
      } finally {
        setIsDeleting(false);
      }
    },
    terminateEmployee: async (employeeId, terminationDetails) => {
      try {
        const payload = {
          employee_id: employeeId,
          type: 'involuntary', // Default type, can be adjusted based on reason
          reason: terminationDetails.reason,
          termination_date: terminationDetails.date,
          last_working_day: terminationDetails.date, // Same as termination date for now
          notes: terminationDetails.comments || null,
          terminated_by: null // Will be set by backend based on authenticated user
        };

        await terminationAPI.create(payload);
        setToast({ show: true, message: 'Employee terminated successfully!', type: 'success' });
        
        // Refresh employee data
        const response = await employeeAPI.getList();
        const empData = Array.isArray(response.data) ? response.data : (response.data?.data || []);
        
        // For list view, we already have the essential data from the optimized endpoint
        const normalizedEmployees = empData.map(e => ({
          id: e.id,
          name: e.name,
          email: e.email,
          positionId: e.position_id,
          position: e.position,
          positionTitle: e.position,
          joiningDate: e.joining_date,
          imageUrl: e.profile_picture_url || null,
          status: e.status,
          attendance_status: e.attendance_status,
        }));
        
        setEmployees(normalizedEmployees);
        setShowTerminateModal(false);
        setEmployeeToTerminate(null);
      } catch (err) {
        // Extract user-friendly error message from backend response
        let message = 'Unable to terminate employee. Please try again.';
        
        if (err?.response?.data?.message) {
          message = err.response.data.message;
        } else if (err?.response?.data?.errors) {
          const apiErrors = err.response.data.errors;
          const errorMessages = Object.values(apiErrors).flat();
          message = errorMessages.join('. ');
        } else if (err?.response?.status === 403) {
          message = 'You do not have permission to terminate employees.';
        } else if (err?.response?.status === 404) {
          message = 'Employee not found or may have already been terminated.';
        } else if (err?.response?.status === 422) {
          message = 'Invalid termination details. Please check the form and try again.';
        } else if (err?.response?.status >= 500) {
          message = 'Server error occurred. Please try again later.';
        } else if (err?.code === 'NETWORK_ERROR' || !err?.response) {
          message = 'Network connection error. Please check your connection and try again.';
        }
        
        setToast({ show: true, message: message, type: 'error' });
      }
    }
  };

  const handleOpenDeleteConfirm = (e, employee) => { 
    e.stopPropagation(); 
    setEmployeeToDelete(employee);
  };
  
  const handleCloseDeleteConfirm = () => {
    if (!isDeleting) {
      setEmployeeToDelete(null);
    }
  };

  const confirmDeleteEmployee = async () => {
    if (employeeToDelete && !isDeleting) {
      try {
        await handlers.deleteEmployee(employeeToDelete.id);
        setEmployeeToDelete(null);
      } catch (error) {
        // Error handling is done in the deleteEmployee handler
        // Keep the modal open if there was an error
      }
    }
  };

  const uniquePositions = useMemo(() => ['All Positions', ...new Set(employees.map(emp => emp.position).filter(Boolean).sort())], [employees]);
  
  const filteredAndSortedEmployees = useMemo(() => {
    let records = [...employees]; // Use shallow copy instead of deep cloning
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      records = records.filter(emp => 
        (emp.name || '').toLowerCase().includes(lowerSearchTerm) || 
        (emp.email || '').toLowerCase().includes(lowerSearchTerm) || 
        (emp.position || '').toLowerCase().includes(lowerSearchTerm) || 
        String(emp.id || '').toLowerCase().includes(lowerSearchTerm)
      );
    }
    if (positionFilter) { records = records.filter(emp => emp.position === positionFilter); }
    if (joiningDateFilter) { records = records.filter(emp => emp.joiningDate === joiningDateFilter); }
    if (statusFilter) { records = records.filter(emp => (emp.status || 'Pending') === statusFilter); }
    if (sortConfig.key) {
      records = [...records].sort((a, b) => { // Create new array only when sorting
        // Handle numeric fields (like employee ID) as numbers
        if (sortConfig.key === 'id') {
          const numA = parseInt(a[sortConfig.key]) || 0;
          const numB = parseInt(b[sortConfig.key]) || 0;
          return sortConfig.direction === 'ascending' ? numA - numB : numB - numA;
        }
        
        // Handle other fields as strings
        const valA = String(a[sortConfig.key] || '').toLowerCase();
        const valB = String(b[sortConfig.key] || '').toLowerCase();
        if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }
    return records;
  }, [searchTerm, positionFilter, joiningDateFilter, statusFilter, sortConfig, employees]);
  
  const isFiltered = searchTerm || positionFilter || statusFilter;
  const countText = isFiltered 
    ? `Showing ${filteredAndSortedEmployees.length} of ${employees.length} employees` 
    : `${employees.length} total employees`;
  
  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <i className="bi bi-arrow-down-up sort-icon ms-1"></i>;
    return sortConfig.direction === 'ascending' ? <i className="bi bi-sort-up sort-icon active ms-1"></i> : <i className="bi bi-sort-down sort-icon active ms-1"></i>;
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedEmployee(null);
  };

  const handleOpenViewModal = (employee) => {
    // Just pass the employee ID, modal will fetch the data
    setSelectedEmployee({ id: employee.id });
    setIsViewOnlyMode(true);
    setShowModal(true);
  };
  
  const handleOpenAddModal = () => {
    setSelectedEmployee(null);
    setIsViewOnlyMode(false);
    setShowModal(true);
  };

  const handleOpenEditModal = (e, employee) => {
    e.stopPropagation();
    // Just pass the employee ID, modal will fetch the data
    setSelectedEmployee({ id: employee.id });
    setIsViewOnlyMode(false);
    setShowModal(true);
  };

 const handleDeleteEmployee = (e, employeeId) => { 
    e.stopPropagation(); 
    const employee = employees.find(emp => emp.id === employeeId);
    if (employee) {
      setEmployeeToDelete(employee);
    }
  };
  
  const handleCloseReportPreview = () => { 
    setShowReportPreview(false); 
    setPdfDataUri(''); 
  };

  const handleSwitchToEditMode = () => {
    setIsViewOnlyMode(false);
  };

  const handleSwitchToViewMode = () => {
    setIsViewOnlyMode(true);
  };

  const handleOpenTerminateModal = (e, employee) => {
    e.stopPropagation();
    setEmployeeToTerminate(employee);
    setShowTerminateModal(true);
  };

  const handleConfirmTermination = (terminationDetails) => {
    handlers.terminateEmployee(employeeToTerminate.id, terminationDetails);
  };

  const handleGenerateReport = () => {
    if (!filteredAndSortedEmployees || filteredAndSortedEmployees.length === 0) {
        alert("No employee data to generate a report for the current filter.");
        return;
    }
    generateReport(
        'employee_masterlist', 
        {}, 
        { employees: filteredAndSortedEmployees, positions }
    );
    setShowReportPreview(true);
  };
  
  const renderCardView = () => (
    <div className="employee-grid-container">
      {filteredAndSortedEmployees.map(emp => (
        <div 
          key={emp.id} 
          className={`employee-card-v2 ${(emp.status || '') === 'Inactive' ? 'inactive' : ''}`} 
          onClick={() => handleOpenViewModal(emp)}
        > 
          <div className="employee-card-header-v2">
            <span className="employee-id">{emp.id}</span>
            <div className="dropdown">
              <button className="btn btn-sm btn-light" type="button" data-bs-toggle="dropdown" onClick={e => e.stopPropagation()} aria-label="Employee Actions">
                  <i className="bi bi-three-dots-vertical"></i>
              </button>
              <ul className="dropdown-menu dropdown-menu-end">
                <li><a className="dropdown-item" href="#" onClick={(e) => handleOpenEditModal(e, emp)}>Edit</a></li>
                <li><a className="dropdown-item text-danger" href="#" onClick={(e) => handleOpenTerminateModal(e, emp)}>Terminate</a></li>
              </ul>
            </div>
          </div>
          <div className="employee-card-body-v2">
            <img 
              src={emp.imageUrl || placeholderImage} 
              alt={emp.name} 
              className="employee-avatar-v2" 
              onError={(e) => { e.target.src = placeholderImage; }}
              loading="lazy"
              key={emp.id} // Force re-render only when employee ID changes
            />
            <h5 className="employee-name-v2">{emp.name}</h5>
            <p className="employee-position-v2">{emp.position || 'Unassigned'}</p>
            <div className="d-flex gap-2 mb-2">
              <span className={`status-badge-employee status-badge-${(emp.attendance_status || 'pending').toLowerCase()}`}>{emp.attendance_status || 'Pending'}</span>
            </div>
          </div>
          <div className="employee-details-v2">
              <div className="detail-item">
                  <i className="bi bi-envelope-fill"></i>
                  <a href={`mailto:${emp.email}`} onClick={e => e.stopPropagation()}>{emp.email}</a>
              </div>
              <div className="detail-item">
                  <i className="bi bi-calendar-event-fill"></i>
                  <span>Joined on {emp.joiningDate}</span>
              </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderTableView = () => (
    <div className="card data-table-card shadow-sm">
      <div className="table-responsive">
        <table className="table data-table mb-0 align-middle">
          <thead>
            <tr>
              <th className="sortable" onClick={() => requestSort('id')}>Employee ID {getSortIcon('id')}</th>
              <th className="sortable" onClick={() => requestSort('name')}>Name {getSortIcon('name')}</th>
              <th>Position</th>
              <th className="sortable" onClick={() => requestSort('joiningDate')}>Joining Date {getSortIcon('joiningDate')}</th>
              <th>Attendance Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>{filteredAndSortedEmployees.map((emp) => (
            <tr key={emp.id}>
                <td><strong>{emp.id}</strong></td>
              <td>
                <div className="d-flex align-items-center">
                    <img 
                      src={emp.imageUrl || placeholderImage} 
                      alt={emp.name} 
                      className="employee-avatar-table me-2" 
                      onError={(e) => { e.target.src = placeholderImage; }}
                      loading="lazy"
                      key={emp.id} // Force re-render only when employee ID changes
                    />
                    {emp.name}
                </div>
              </td>
              <td>{emp.positionTitle || 'Unassigned'}</td>
              <td>{emp.joiningDate}</td>
              <td><span className={`status-badge-employee status-badge-${(emp.attendance_status || 'pending').toLowerCase()}`}>{emp.attendance_status || 'Pending'}</span></td>
              <td>
                <div className="dropdown">
                  <button className="btn btn-outline-secondary btn-sm dropdown-toggle" type="button" data-bs-toggle="dropdown">
                    Actions
                  </button>
                  <ul className="dropdown-menu dropdown-menu-end">
                    <li><a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); handleOpenViewModal(emp);}}><i className="bi bi-eye-fill me-2"></i>View Details</a></li>
                    <li><a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); handleOpenEditModal(e, emp);}}><i className="bi bi-pencil-fill me-2"></i>Edit</a></li>
                    <li><hr className="dropdown-divider" /></li>
                    <li><a className="dropdown-item text-danger" href="#" onClick={(e) => { e.preventDefault(); handleOpenTerminateModal(e, emp);}}><i className="bi bi-person-x-fill me-2"></i>Terminate</a></li>
                  </ul>
                </div>
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );

  const positionMap = useMemo(() => {
    if (!positions || !Array.isArray(positions)) return new Map();
    return new Map(positions.map(p => [p.id, p.title]));
  }, [positions]);

  return (
    <div className="container-fluid p-0 page-module-container">
      <header className="page-header d-flex justify-content-between align-items-center mb-4">
          <div className="d-flex align-items-center"><h1 className="page-main-title me-3">Employee Data</h1><span className="badge bg-secondary-subtle text-secondary-emphasis rounded-pill">{filteredAndSortedEmployees.length === employees.length ? `${employees.length} employees` : `Showing ${filteredAndSortedEmployees.length} of ${employees.length}`}</span></div>
        <div className="header-actions d-flex align-items-center gap-2">
            <button className="btn btn-outline-secondary" onClick={handleGenerateReport} disabled={!employees || employees.length === 0}><i className="bi bi-file-earmark-text-fill"></i> Generate Report</button>
            <button className="btn btn-success" onClick={handleOpenAddModal}><i className="bi bi-person-plus-fill"></i> Add New Employee</button>
        </div>
      </header>

      <ul className="nav nav-tabs employee-data-tabs mb-4">
        <li className="nav-item">
            <button className={`nav-link ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>All Employees</button>            
        </li>
        <li className="nav-item">
            <button className={`nav-link ${activeTab === 'requirements' ? 'active' : ''}`} onClick={() => setActiveTab('requirements')}>Government Requirements</button>
        </li>
      </ul>

      {activeTab === 'all' && (
        <>
          <div className="page-controls-bar mb-4">
            <div className="filters-group">
                <div className="input-group">
                    <span className="input-group-text"><i className="bi bi-search"></i></span>
                    <input type="text" className="form-control" placeholder="Search by name, ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                <select className="form-select" value={positionFilter} onChange={e => setPositionFilter(e.target.value)}>{uniquePositions.map(pos => <option key={pos} value={pos === 'All Positions' ? '' : pos}>{pos}</option>)}</select>
                <select className="form-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                    <option value="">All Statuses</option>
                    <option value="Active">Active</option>                   
                    <option value="Inactive">Inactive</option>                    
                </select>
            </div>
            <div className="actions-group">
                <div className="view-toggle-buttons btn-group">
                    <button className={`btn btn-sm ${viewMode === 'card' ? 'active' : 'btn-outline-secondary'}`} onClick={() => setViewMode('card')} title="Card View"><i className="bi bi-grid-3x3-gap-fill"></i></button>              
                    <button className={`btn btn-sm ${viewMode === 'table' ? 'active' : 'btn-outline-secondary'}`} onClick={() => setViewMode('table')} title="List View"><i className="bi bi-list-task"></i></button>                    
                </div>
            </div>
          </div>
          {loading ? (
            <div className="w-100 text-center p-5 bg-light  rounded">
              <div className="spinner-border  text-success" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-3">Loading employee data...</p>
            </div>
          ) : error ? (
            <div className="text-center p-5 bg-light rounded">
              <p className="text-danger">{error}</p>
              <button className="btn btn-primary" onClick={() => window.location.reload()}>Retry</button>
            </div>
          ) : filteredAndSortedEmployees.length > 0 ? (viewMode === 'card' ? renderCardView() : renderTableView()) : (<div className="text-center p-5 bg-light rounded">
            <i className="bi bi-people-fill fs-1 text-muted mb-3 d-block"></i>
            <h4 className="text-muted">{employees.length === 0 ? "No employees in the system." : "No employees match criteria."}
              </h4>{employees.length === 0 && <p>Click "Add New Employee" to get started.</p>}</div>)}
          {showModal && viewingEmployee && ( <ViewEmployeeDetailsModal employee={viewingEmployee} show={showViewModal} onClose={handleCloseViewModal} positionMap={positionMap} /> )}
          </>
            )}
              {activeTab === 'requirements' && (
             <RequirementsChecklist />
           )}

          {(isLoading || pdfDataUri) && (
            <ReportPreviewModal
              show={showReportPreview}
              onClose={handleCloseReportPreview}
              pdfDataUri={pdfDataUri}
              reportTitle="Employee Masterlist"
            />
          )}
          <ConfirmationModal
            show={!!employeeToDelete}
            onClose={handleCloseDeleteConfirm}
            onConfirm={confirmDeleteEmployee}
            title="Confirm Employee Deletion"
            confirmText={isDeleting ? 'Deleting...' : 'Yes, Delete'}
            confirmVariant="danger"
            disabled={isDeleting}
          >
            <p>Are you sure you want to permanently delete <strong>{employeeToDelete?.name} ({employeeToDelete?.id})</strong>?</p>
            <p className="text-danger">This action cannot be undone.</p>
          </ConfirmationModal>
          {showModal && ( 
            <AddEditEmployeeModal 
              show={showModal} 
              onClose={handleCloseModal} 
              onSave={handlers.saveEmployee} 
              employeeId={selectedEmployee?.id || null}
              employeeData={selectedEmployee?.id ? null : selectedEmployee}
              positions={positions}
              viewOnly={isViewOnlyMode}
              onSwitchToEdit={handleSwitchToEditMode}
            /> 
          )}
          
          {showTerminateModal && employeeToTerminate && (
            <TerminateEmployeeModal
              show={showTerminateModal}
              onClose={() => {
                setShowTerminateModal(false);
                setEmployeeToTerminate(null);
              }}
              onConfirm={handleConfirmTermination}
              employee={employeeToTerminate}
            />
          )}
          
          {toast.show && (
            <ToastNotification
              message={toast.message}
              type={toast.type}
              onClose={() => setToast({ show: false, message: '', type: 'success' })}
            />
          )}
          
          <AccountGeneratedModal 
            show={!!newlyGeneratedAccount}
            onClose={() => setNewlyGeneratedAccount(null)}
            accountDetails={newlyGeneratedAccount}
          />
    </div>
  );
};

export default EmployeeDataPage;
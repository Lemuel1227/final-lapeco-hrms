import React, { useState, useMemo, useEffect } from 'react';
import './PositionsPage.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import AddEditPositionModal from '../../modals/AddEditPositionModal';
import AddEmployeeToPositionModal from '../../modals/AddEmployeeToPositionModal';
import ReportPreviewModal from '../../modals/ReportPreviewModal';
import ConfirmationModal from '../../modals/ConfirmationModal';
import ToastNotification from '../../common/ToastNotification';
import useReportGenerator from '../../hooks/useReportGenerator';
import Layout from '@/layout/Layout';
import { positionAPI } from '@/services/api';
import { employeeAPI } from '@/services/api';

const PositionsPage = (props) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [positionEmployeeSearchTerm, setPositionEmployeeSearchTerm] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'ascending' });
  const [positionEmployees, setPositionEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [positions, setPositions] = useState([]);
  const [loadingPositions, setLoadingPositions] = useState(true);
  const [allEmployees, setAllEmployees] = useState([]);
  const [loadingAllEmployees, setLoadingAllEmployees] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [showReportPreview, setShowReportPreview] = useState(false);
  const { generateReport, pdfDataUri, isLoading, setPdfDataUri } = useReportGenerator();

  const handleCloseAddEmployeeModal = () => setShowAddEmployeeModal(false);

  // Handle reassignment confirmation
  const handleConfirmReassignment = (employee, currentPosTitle, newPosition, onConfirm) => {
    setReassignmentData({
      employee,
      currentPosTitle,
      newPosition,
      onConfirm
    });
    setShowReassignConfirmModal(true);
  };

  const confirmReassignment = async () => {
    if (reassignmentData?.employee && reassignmentData?.newPosition) {
      try {
        await employeeAPI.update(reassignmentData.employee.id, { position_id: reassignmentData.newPosition.id });
        if (selectedPosition) {
          await refreshPositionEmployees(selectedPosition.id);
        }
        await refreshPositions();
        setToast({ show: true, message: 'Employee reassigned successfully!', type: 'success' });
        setShowAddEmployeeModal(false);
      } catch (e) {
        setToast({ show: true, message: 'Failed to reassign employee.', type: 'error' });
      }
    }
    setShowReassignConfirmModal(false);
    setReassignmentData(null);
  };

  const cancelReassignment = () => {
    setShowReassignConfirmModal(false);
    setReassignmentData(null);
  };
  const [showAddEditPositionModal, setShowAddEditPositionModal] = useState(false);
  const [editingPosition, setEditingPosition] = useState(null);
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  
  // Toast notification state
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  
  // Confirmation modal states
  const [showDeletePositionModal, setShowDeletePositionModal] = useState(false);
  const [positionToDelete, setPositionToDelete] = useState(null);
  const [isDeletingPosition, setIsDeletingPosition] = useState(false);
  const [showRemoveEmployeeModal, setShowRemoveEmployeeModal] = useState(false);
  const [employeeToRemove, setEmployeeToRemove] = useState(null);
  const [isRemovingEmployee, setIsRemovingEmployee] = useState(false);
  const [showAddEmployeeConfirmModal, setShowAddEmployeeConfirmModal] = useState(false);
  const [employeeToAdd, setEmployeeToAdd] = useState(null);
  const [showReassignConfirmModal, setShowReassignConfirmModal] = useState(false);
  const [reassignmentData, setReassignmentData] = useState(null);
  const [showRoleChangeModal, setShowRoleChangeModal] = useState(false);
  const [roleChangeData, setRoleChangeData] = useState({ employee: null, newRole: '', roleName: '' });

  // Load positions from API
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        setLoadingPositions(true);
        const res = await positionAPI.getAll();
        const data = Array.isArray(res.data) ? res.data : (res.data?.data || []);
        if (isMounted) setPositions(data);
      } catch (e) {
        if (isMounted) setPositions([]);
      } finally {
        if (isMounted) setLoadingPositions(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const handlers = props?.handlers || {};

  const employeeCounts = useMemo(() => {
    return (positions || []).reduce((acc, pos) => {
      acc[pos.id] = pos.employeeCount || 0;
      return acc;
    }, {});
  }, [positions]);

  const filteredPositions = useMemo(() => {
    if (!searchTerm) return positions || [];
    return (positions || []).filter(pos =>
      (pos.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (pos.description || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, positions]);

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

  const displayedEmployeesInPosition = useMemo(() => {
    let filtered = positionEmployees.filter(emp => {
      const matchesSearch = (emp.name || '').toLowerCase().includes(positionEmployeeSearchTerm.toLowerCase()) ||
        String(emp.employee_id || '').includes(positionEmployeeSearchTerm);
      const matchesRole = selectedRoleFilter ? emp.role === selectedRoleFilter : true;
      return matchesSearch && matchesRole;
    });

    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        // Handle specific keys
        if (sortConfig.key === 'joining_date') {
            aValue = new Date(aValue || 0);
            bValue = new Date(bValue || 0);
        } else if (sortConfig.key === 'employee_id') {
            const aNum = parseFloat(aValue);
            const bNum = parseFloat(bValue);
            if (!isNaN(aNum) && !isNaN(bNum)) {
                aValue = aNum;
                bValue = bNum;
            }
        }
        
        if (typeof aValue === 'string') aValue = aValue.toLowerCase();
        if (typeof bValue === 'string') bValue = bValue.toLowerCase();

        if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }
    return filtered;
  }, [positionEmployees, positionEmployeeSearchTerm, selectedRoleFilter, sortConfig]);

  const refreshPositions = async () => {
    try {
      const res = await positionAPI.getAll();
      const data = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      setPositions(data);
    } catch {}
  };

  const refreshPositionEmployees = async (positionId) => {
    try {
      const res = await positionAPI.getEmployees(positionId);
      const employees = res.data?.employees || [];
      setPositionEmployees(employees.filter(emp => emp.role !== 'SUPER_ADMIN'));
    } catch {
      setPositionEmployees([]);
    }
  };

  // --- Handlers ---
  const handleSavePosition = async (formData, positionId) => {
    try {
      setSubmitting(true);
      const payload = {
        name: formData.title,
        description: formData.description,
        max_team_leaders: Number(formData.max_team_leaders ?? 1),
        base_rate_per_hour: Number(formData.base_rate_per_hour ?? 0),
        regular_day_ot_rate: Number(formData.regular_day_ot_rate ?? 0),
        special_ot_rate: Number(formData.special_ot_rate ?? 0),
        regular_holiday_ot_rate: Number(formData.regular_holiday_ot_rate ?? 0),
        night_diff_rate_per_hour: Number(formData.night_diff_rate_per_hour ?? 0),
        late_deduction_per_minute: Number(formData.late_deduction_per_minute ?? 0),
        monthly_salary: Number(formData.monthly_salary ?? 0),
        allowed_modules: Array.isArray(formData.allowed_modules) ? formData.allowed_modules : [],
      };
      if (positionId) {
        await positionAPI.update(positionId, payload);
        setToast({ show: true, message: 'Position updated successfully!', type: 'success' });
        
        // Update selectedPosition if it's the one being edited
        if (selectedPosition && selectedPosition.id === positionId) {
          setSelectedPosition(prev => ({
            ...prev,
            ...formData,
            name: formData.title,
            max_team_leaders: Number(formData.max_team_leaders ?? 1),
            base_rate_per_hour: Number(formData.base_rate_per_hour ?? 0),
            regular_day_ot_rate: Number(formData.regular_day_ot_rate ?? 0),
            special_ot_rate: Number(formData.special_ot_rate ?? 0),
            regular_holiday_ot_rate: Number(formData.regular_holiday_ot_rate ?? 0),
            night_diff_rate_per_hour: Number(formData.night_diff_rate_per_hour ?? 0),
            late_deduction_per_minute: Number(formData.late_deduction_per_minute ?? 0),
            monthly_salary: Number(formData.monthly_salary ?? 0),
            allowed_modules: Array.isArray(formData.allowed_modules) ? formData.allowed_modules : [],
          }));
        }
      } else {
        await positionAPI.create(payload);
        setToast({ show: true, message: 'Position created successfully!', type: 'success' });
      }
      await refreshPositions();
      setShowAddEditPositionModal(false);
      setEditingPosition(null);
    } catch (e) {
      const message = e?.response?.data?.message || 'Failed to save position. Please try again.';
      setToast({ show: true, message, type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };
  
  const handleDeletePosition = (e, position) => {
    e.stopPropagation();
    setPositionToDelete(position);
    setShowDeletePositionModal(true);
  };

  const confirmDeletePosition = async () => {
    if (positionToDelete && !isDeletingPosition) {
      try {
        setIsDeletingPosition(true);
        await positionAPI.delete(positionToDelete.id);
        await refreshPositions();
        if (selectedPosition?.id === positionToDelete.id) {
          setSelectedPosition(null);
          setPositionEmployees([]);
        }
        setToast({ show: true, message: 'Position deleted successfully!', type: 'success' });
      } catch (e) {
        setToast({ show: true, message: 'Failed to delete position.', type: 'error' });
      } finally {
        setIsDeletingPosition(false);
        setShowDeletePositionModal(false);
        setPositionToDelete(null);
      }
    }
  };

  const cancelDeletePosition = () => {
    if (!isDeletingPosition) {
      setShowDeletePositionModal(false);
      setPositionToDelete(null);
    }
  };

  const handleSaveEmployeeToPosition = async (employeeId, positionId) => {
    setEmployeeToAdd({ employeeId, positionId });
    setShowAddEmployeeConfirmModal(true);
  };

  const confirmAddEmployee = async () => {
    if (employeeToAdd) {
      try {
        await employeeAPI.update(employeeToAdd.employeeId, { position_id: employeeToAdd.positionId });
        if (selectedPosition) {
          await refreshPositionEmployees(selectedPosition.id);
        }
        await refreshPositions();
        setToast({ show: true, message: 'Employee added to position successfully!', type: 'success' });
        setShowAddEmployeeModal(false);
      } catch (e) {
        setToast({ show: true, message: 'Failed to assign employee to position.', type: 'error' });
      } finally {
        setShowAddEmployeeConfirmModal(false);
        setEmployeeToAdd(null);
      }
    }
  };

  const cancelAddEmployee = () => {
    setShowAddEmployeeConfirmModal(false);
    setEmployeeToAdd(null);
  };

  const handleRemoveFromPosition = (employee) => {
    setEmployeeToRemove(employee);
    setShowRemoveEmployeeModal(true);
  };

  const confirmRemoveEmployee = async () => {
    if (employeeToRemove && selectedPosition && !isRemovingEmployee) {
      try {
        setIsRemovingEmployee(true);
        const response = await positionAPI.removeEmployee(selectedPosition.id, employeeToRemove.id);
        await refreshPositionEmployees(selectedPosition.id);
        await refreshPositions();
        setToast({
          show: true,
          message: response.data?.message || 'Employee removed from position successfully!',
          type: 'success',
        });
      } catch (e) {
        const errorMessage = e.response?.data?.message || 'Failed to remove employee from position.';
        setToast({ show: true, message: errorMessage, type: 'error' });
      } finally {
        setIsRemovingEmployee(false);
        setShowRemoveEmployeeModal(false);
        setEmployeeToRemove(null);
      }
    }
  };

  const cancelRemoveEmployee = () => {
    if (!isRemovingEmployee) {
      setShowRemoveEmployeeModal(false);
      setEmployeeToRemove(null);
    }
  };

  const handleRoleChange = (employee, newRole, roleName) => {
    setRoleChangeData({
      employee,
      newRole,
      roleName,
      currentRole: employee.role
    });
    setShowRoleChangeModal(true);
  };

  const confirmRoleChange = async () => {
    if (!roleChangeData.employee || !roleChangeData.newRole) return;

    try {
      let response;
      
      if (roleChangeData.newRole === 'TEAM_LEADER' || roleChangeData.newRole === 'REGULAR_EMPLOYEE') {
        // Toggle between TEAM_LEADER and REGULAR_EMPLOYEE
        response = await employeeAPI.toggleTeamLeader(roleChangeData.employee.id);
      } else if (roleChangeData.newRole === 'SUPER_ADMIN') {
        // Set as SUPER_ADMIN
        response = await employeeAPI.update(roleChangeData.employee.id, { 
          role: 'SUPER_ADMIN' 
        });
      }
      
      if (response?.data?.message) {
        setToast({ show: true, message: response.data.message, type: 'success' });
      } else {
        setToast({ show: true, message: 'Role updated successfully', type: 'success' });
      }
      
      // Refresh the position employees to reflect the role change
      if (selectedPosition) {
        await refreshPositionEmployees(selectedPosition.id);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to update role. Please try again.';
      setToast({ show: true, message: errorMessage, type: 'error' });
    }
    
    setShowRoleChangeModal(false);
    setRoleChangeData({ employee: null, newRole: '', roleName: '' });
  };

  const cancelRoleChange = () => {
    setShowRoleChangeModal(false);
    setRoleChangeData({ employee: null, newRole: '', roleName: '' });
  };

  const handleViewPositionDetails = async (position) => {
    setSelectedPosition(position);
    setLoadingEmployees(true);
    try {
      // Fetch latest position details to ensure we have max_team_leaders
      const posRes = await positionAPI.getById(position.id);
      if (posRes.data) {
        setSelectedPosition(prev => ({ ...prev, ...posRes.data }));
      }

      const res = await positionAPI.getEmployees(position.id);
      setPositionEmployees(res.data?.employees || []);
    } catch (e) {
      console.error("Error fetching position details:", e);
      setPositionEmployees([]);
    }
    setLoadingEmployees(false);
  };
  const handleBackToPositionsList = () => { setSelectedPosition(null); setPositionEmployeeSearchTerm(''); };
  const handleOpenAddPositionModal = () => { setEditingPosition(null); setShowAddEditPositionModal(true); };
  const handleOpenEditPositionModal = (e, position) => { e.stopPropagation(); setEditingPosition(position); setShowAddEditPositionModal(true); };
  const handleCloseAddEditPositionModal = () => setShowAddEditPositionModal(false);
  const handleOpenAddEmployeeModal = async () => {
    setLoadingAllEmployees(true);
    try {
      const res = await employeeAPI.getAll();
      const data = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      // Normalize to { id, name, positionId }
      const normalized = data
        .filter(e => e.role !== 'SUPER_ADMIN')
        .map(e => ({ id: e.id, name: e.name, positionId: e.position_id ?? e.positionId ?? null }));
      setAllEmployees(normalized);
      setShowAddEmployeeModal(true);
    } catch {
      setAllEmployees([]);
      setShowAddEmployeeModal(true);
    } finally {
      setLoadingAllEmployees(false);
    }
  };

  const safeMonthlySalary = (pos) => {
    const value = pos.monthlySalary ?? pos.monthly_salary ?? 0;
    return Number(value) || 0;
  };

  const handleGenerateReport = async () => {
    if (!positions || positions.length === 0) {
      alert("No positions available to generate a report.");
      return;
    }
    
    try {
      // Fetch all employees first to ensure we have the data
      const res = await employeeAPI.getAll();
      const data = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      // Normalize to { id, name, positionId }
      const employees = data.map(e => ({ 
        id: e.id, 
        name: e.name, 
        positionId: e.position_id ?? e.positionId ?? null 
      }));
      
      // Normalize positions data to camelCase for the report generator
      const normalizedPositions = positions.map(pos => ({
        id: pos.id,
        title: pos.name || pos.title,
        description: pos.description || '',
        monthlySalary: safeMonthlySalary(pos)
      }));
      
      // Generate the report with fetched employee data
      await generateReport('positions_report', {}, { employees, positions: normalizedPositions });
      setShowReportPreview(true);
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate report. Please try again.');
    }
  };

  const handleCloseReportPreview = () => {
    setShowReportPreview(false);
    if(pdfDataUri) URL.revokeObjectURL(pdfDataUri);
    setPdfDataUri('');
  };

  // --- RENDER ---
  if (selectedPosition) {
    return (
      <div className="container-fluid p-0 page-module-container">
        <div className="detail-header-wrapper">
          <div className="d-flex align-items-center">
            <button className="btn btn-light me-3 shadow-sm border" onClick={handleBackToPositionsList}>
              <i className="bi bi-arrow-left me-2"></i> Back
            </button>
            <div className="detail-title">
              <h1>{selectedPosition.title}</h1>
              <div className="d-flex align-items-center gap-3">
                <p className="mb-0">{positionEmployees.length} Employee(s)</p>
                <div className="vr"></div>
                <div className="d-flex align-items-center">
                  <span className="text-muted me-2">Max Leaders:</span>
                  <span className="fw-bold">{selectedPosition.max_team_leaders}</span>
                  <button 
                    className="btn btn-link p-0 ms-2 text-decoration-none" 
                    onClick={(e) => handleOpenEditPositionModal(e, selectedPosition)}
                    title="Edit Position Limit"
                  >
                    <i className="bi bi-pencil-square"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
          <button className="btn btn-success shadow-sm" onClick={handleOpenAddEmployeeModal} disabled={loadingAllEmployees}>
            {loadingAllEmployees ? (<><span className="spinner-border spinner-border-sm me-2" role="status" />Loading...</>) : (<><i className="bi bi-person-plus-fill me-2"></i> Add Employee</>)}
          </button>
        </div>

        {/* Role Change Confirmation Modal - Only shown in position details view */}
        <ConfirmationModal
          show={showRoleChangeModal}
          title={`Change Role to ${roleChangeData.roleName}`}
          onClose={cancelRoleChange}
          onConfirm={confirmRoleChange}
          confirmText="Confirm Change"
          confirmVariant="primary"
        >
          Are you sure you want to change {roleChangeData.employee?.name}'s role from 
          {roleChangeData.currentRole === 'TEAM_LEADER' ? ' Team Leader ' : 
           roleChangeData.currentRole === 'SUPER_ADMIN' ? ' HR Manager ' : ' Regular Employee '}
          to {roleChangeData.roleName}?
        </ConfirmationModal>

        <div className="positions-controls d-flex flex-wrap gap-3 justify-content-between align-items-center mb-4">
            <div className="search-wrapper flex-grow-1" style={{maxWidth: '400px'}}>
                <div className="input-group">
                    <span className="input-group-text bg-light border-end-0"><i className="bi bi-search text-muted"></i></span>
                    <input 
                      type="text" 
                      className="form-control border-start-0 bg-light ps-0" 
                      placeholder="Search employees by name or ID..." 
                      value={positionEmployeeSearchTerm} 
                      onChange={(e) => setPositionEmployeeSearchTerm(e.target.value)} 
                    />
                </div>
            </div>
            <div className="filter-wrapper">
              <select 
                className="form-select bg-light border-0" 
                value={selectedRoleFilter} 
                onChange={(e) => setSelectedRoleFilter(e.target.value)}
                style={{width: 'auto', minWidth: '150px'}}
              >
                <option value="">All Roles</option>
                <option value="TEAM_LEADER">Team Leaders</option>
                <option value="REGULAR_EMPLOYEE">Members</option>
              </select>
            </div>
        </div>

        {loadingEmployees ? (
          <div className="text-center p-5">
            <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-2 text-muted">Loading employees...</p>
          </div>
        ) : (
          <div className="card data-table-card shadow-sm border-0">
            <div className="table-responsive">
              <table className="table data-table mb-0 table-hover">
                <thead className="bg-light">
                  <tr>
                    <th className="sortable ps-4" style={{width: '120px'}} onClick={() => requestSort('employee_id')}>
                      ID {getSortIcon('employee_id')}
                    </th>
                    <th className="sortable" onClick={() => requestSort('name')}>
                      Employee {getSortIcon('name')}
                    </th>
                    <th className="sortable" onClick={() => requestSort('role')}>
                       Role {getSortIcon('role')}
                     </th>
                     <th className="sortable" onClick={() => requestSort('joining_date')}>
                        Date Joined {getSortIcon('joining_date')}
                      </th>
                     <th className="text-end pe-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedEmployeesInPosition.length > 0 ? displayedEmployeesInPosition.map(emp => {
                    const isTeamLeader = emp.role === 'TEAM_LEADER';
                    
                    return (
                      <tr key={emp.id}>
                        <td className="ps-4"><span className="font-monospace">{emp.employee_id || emp.id}</span></td>
                        <td>
                            <div className="d-flex align-items-center">
                                <div className="rounded-circle bg-light d-flex align-items-center justify-content-center me-2" style={{width: '32px', height: '32px', fontSize: '0.8rem'}}>
                                    {emp.name.charAt(0)}
                                </div>
                                {emp.name}
                            </div>
                        </td>
                        <td>
                          {isTeamLeader ? (
                            <span className="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-3">Team Leader</span>
                          ) : (
                            <span className="badge bg-secondary-subtle text-secondary border border-secondary-subtle rounded-pill px-3">Member</span>
                          )}
                        </td>
                        <td className="text-secondary">
                           {emp.joining_date ? new Date(emp.joining_date).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="text-end pe-4">
                          <div className="dropdown">
                            <button className="btn btn-outline-secondary btn-sm dropdown-toggle" type="button" data-bs-toggle="dropdown">
                              Actions
                            </button>
                            <ul className="dropdown-menu dropdown-menu-end">
                              <li>
                                 <a 
                                   className="dropdown-item" 
                                   href="#" 
                                   onClick={(e) => {
                                     e.preventDefault();
                                     e.stopPropagation();
                                     handleRoleChange(emp, 
                                       isTeamLeader ? 'REGULAR_EMPLOYEE' : 'TEAM_LEADER',
                                       isTeamLeader ? 'Regular Employee' : 'Team Leader'
                                     );
                                   }}
                                 >
                                   <i className={`bi ${isTeamLeader ? 'bi-person-down' : 'bi-person-up'} me-2`}></i>
                                   {isTeamLeader ? "Demote to Member" : "Promote to Team Leader"}
                                 </a>
                              </li>
                              <li><hr className="dropdown-divider" /></li>
                              <li>
                                <a 
                                  className="dropdown-item text-danger" 
                                  href="#" 
                                  onClick={(e) => { 
                                    e.preventDefault(); 
                                    e.stopPropagation(); 
                                    handleRemoveFromPosition(emp); 
                                  }}
                                >
                                  <i className="bi bi-trash me-2"></i>Remove from Position
                                </a>
                              </li>
                            </ul>
                          </div>
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr>
                        <td colSpan="4" className="text-center p-5">
                            <div className="text-muted opacity-50 mb-2"><i className="bi bi-people display-4"></i></div>
                            <p className="mb-0 text-muted">No employees found in this position.</p>
                        </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modals for detail view */}
        {showAddEmployeeModal && (
          <AddEmployeeToPositionModal
            show={showAddEmployeeModal}
            onClose={handleCloseAddEmployeeModal}
            onSave={handleSaveEmployeeToPosition}
            onConfirmReassignment={handleConfirmReassignment}
            currentPosition={selectedPosition}
            allEmployees={allEmployees}
            allPositions={positions}
          />
        )}

        <ConfirmationModal
          show={showRemoveEmployeeModal}
          title="Remove Employee from Position"
          onClose={cancelRemoveEmployee}
          onConfirm={confirmRemoveEmployee}
          confirmText="Remove"
          confirmVariant="danger"
        >
          Are you sure you want to remove <strong>{employeeToRemove?.name}</strong> from <strong>{selectedPosition.title}</strong>?
          <br />
          <small className="text-muted">This action will set their position to Unassigned.</small>
        </ConfirmationModal>

        <ConfirmationModal
          show={showAddEmployeeConfirmModal}
          title="Confirm Assignment"
          onClose={cancelAddEmployee}
          onConfirm={confirmAddEmployee}
          confirmText="Assign"
          confirmVariant="success"
        >
           Are you sure you want to assign this employee to <strong>{selectedPosition.title}</strong>?
        </ConfirmationModal>
        
        <ConfirmationModal
          show={showReassignConfirmModal}
          title="Re-assign Employee"
          onClose={cancelReassignment}
          onConfirm={confirmReassignment}
          confirmText="Re-assign"
          confirmVariant="warning"
        >
          {reassignmentData && (
            <>
              Employee <strong>{reassignmentData.employee.name}</strong> is already assigned to "<strong>{reassignmentData.currentPosTitle}</strong>".
              <br /><br />
              Are you sure you want to re-assign them to "<strong>{reassignmentData.newPosition.title}</strong>"?
            </>
          )}
        </ConfirmationModal>

        <AddEditPositionModal
          show={showAddEditPositionModal}
          onClose={handleCloseAddEditPositionModal}
          onSave={handleSavePosition}
          positionData={editingPosition}
          submitting={submitting}
        />

        <ToastNotification
            show={toast.show}
            message={toast.message}
            type={toast.type}
            onClose={() => setToast({ ...toast, show: false })}
        />

      </div>
    );
  }

  // Default View (List of Positions)
  return (
    <Layout>
      <div className="positions-container">
        <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
                <h1 className="page-title mb-1">Positions Management</h1>
                <p className="text-muted mb-0">Manage job titles, descriptions, and salary grades.</p>
            </div>
            <div className="positions-header-actions">
                {positions.length > 0 && (
                    <button className="btn btn-outline-primary" onClick={handleGenerateReport} disabled={isLoading}>
                        {isLoading ? <span className="spinner-border spinner-border-sm me-2"/> : <i className="bi bi-file-earmark-pdf me-2"></i>}
                        Export Report
                    </button>
                )}
                <button className="btn btn-success shadow-sm" onClick={handleOpenAddPositionModal}>
                    <i className="bi bi-plus-lg me-2"></i> Add Position
                </button>
            </div>
        </div>

        <div className="positions-controls">
            <div className="search-wrapper">
                <div className="input-group">
                    <span className="input-group-text bg-transparent border-end-0"><i className="bi bi-search"></i></span>
                    <input 
                        type="text" 
                        className="form-control border-start-0 ps-0" 
                        placeholder="Search positions..." 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                    />
                </div>
            </div>
        </div>

        {loadingPositions ? (
          <div className="positions-grid">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="pos-card skeleton-card">
                <div className="card-body p-4">
                  <div className="skeleton skeleton-title mb-3"></div>
                  <div className="skeleton skeleton-text w-75 mb-2"></div>
                  <div className="skeleton skeleton-text w-50 mb-4"></div>
                  <div className="skeleton skeleton-text w-100 mt-auto"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {filteredPositions.length > 0 ? (
              <div className="positions-grid">
                {filteredPositions.map(pos => (
                  <div key={pos.id} className="pos-card">
                    <div className="pos-card-header">
                      <div className="pos-icon-wrapper">
                        <i className="bi bi-briefcase"></i>
                      </div>
                      <div className="pos-title-section">
                        <h5 className="pos-title" title={pos.title || pos.name}>{pos.title || pos.name}</h5>

                      </div>
                      <div className="pos-actions dropdown">
                        <button className="btn btn-icon" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                          <i className="bi bi-three-dots-vertical"></i>
                        </button>
                        <ul className="dropdown-menu dropdown-menu-end shadow-sm border-0">
                          <li><a className="dropdown-item" href="#" onClick={(e) => handleOpenEditPositionModal(e, pos)}><i className="bi bi-pencil me-2"></i>Edit Details</a></li>
                          <li><a className="dropdown-item" href="#" onClick={() => handleViewPositionDetails(pos)}><i className="bi bi-people me-2"></i>Manage Employees</a></li>
                          <li><hr className="dropdown-divider" /></li>
                          <li><a className="dropdown-item text-danger" href="#" onClick={(e) => handleDeletePosition(e, pos)}><i className="bi bi-trash me-2"></i>Delete</a></li>
                        </ul>
                      </div>
                    </div>
                    
                    <div className="pos-card-body">
                      <p className="pos-description">{pos.description || 'No description provided.'}</p>
                      
                      <div className="pos-stats">
                        <div className="stat-item">
                          <i className="bi bi-people"></i>
                          <div className="stat-content">
                            <span className="stat-label">Employees</span>
                            <span className="stat-value">{employeeCounts[pos.id] || 0}</span>
                          </div>
                        </div>
                        <div className="stat-item">
                          <i className="bi bi-cash-stack"></i>
                          <div className="stat-content">
                            <span className="stat-label">Salary</span>
                            <span className="stat-value">₱{safeMonthlySalary(pos).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="pos-card-footer">
                      <button className="btn btn-outline-success btn-sm w-100" onClick={() => handleViewPositionDetails(pos)}>
                        View Details <i className="bi bi-arrow-right ms-1"></i>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state-container">
                <div className="empty-state-icon">
                    <i className="bi bi-briefcase"></i>
                </div>
                <h3>No positions found</h3>
                <p className="text-muted mb-4">Get started by adding a new job position to your organization.</p>
                <button className="btn btn-success" onClick={handleOpenAddPositionModal}>
                    <i className="bi bi-plus-lg me-2"></i> Create Position
                </button>
              </div>
            )}
          </>
        )}

        {/* Modals */}
        <AddEditPositionModal
          show={showAddEditPositionModal}
          onClose={handleCloseAddEditPositionModal}
          onSave={handleSavePosition}
          positionData={editingPosition}
          submitting={submitting}
        />

        <ConfirmationModal
          show={showDeletePositionModal}
          title="Delete Position"
          onClose={cancelDeletePosition}
          onConfirm={confirmDeletePosition}
          confirmText="Delete"
          confirmVariant="danger"
        >
          Are you sure you want to delete the position <strong>{positionToDelete?.title || positionToDelete?.name}</strong>?
          <br />
          <small className="text-danger"><i className="bi bi-exclamation-triangle me-1"></i> This action cannot be undone.</small>
        </ConfirmationModal>

        <ReportPreviewModal
            show={showReportPreview}
            onClose={handleCloseReportPreview}
            pdfDataUri={pdfDataUri}
            reportTitle="Positions Report"
        />
        
        <ToastNotification
            show={toast.show}
            message={toast.message}
            type={toast.type}
            onClose={() => setToast({ ...toast, show: false })}
        />
      </div>
    </Layout>
  );
};

export default PositionsPage;

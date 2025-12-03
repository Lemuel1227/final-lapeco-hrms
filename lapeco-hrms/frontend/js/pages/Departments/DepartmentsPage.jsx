import React, { useEffect, useMemo, useState } from 'react';
import './DepartmentsPage.css'; // Import dedicated CSS
import { departmentAPI, positionAPI, employeeAPI } from '@/services/api';
import AddEditDepartmentModal from '@/modals/AddEditDepartmentModal';
import AddEditPositionModal from '@/modals/AddEditPositionModal';
import AddEmployeeToPositionModal from '@/modals/AddEmployeeToPositionModal';
import ConfirmationModal from '@/modals/ConfirmationModal';
import ToastNotification from '@/common/ToastNotification';

const DepartmentsPage = () => {
  const [departments, setDepartments] = useState([]);
  const [loadingDepartments, setLoadingDepartments] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [positions, setPositions] = useState([]);
  const [loadingPositions, setLoadingPositions] = useState(false);

  const [showDeptModal, setShowDeptModal] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState(null);

  const [showPositionModal, setShowPositionModal] = useState(false);
  const [editingPosition, setEditingPosition] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [showDeleteDeptModal, setShowDeleteDeptModal] = useState(false);
  const [deptToDelete, setDeptToDelete] = useState(null);
  const [isDeletingDept, setIsDeletingDept] = useState(false);

  const [showDeletePositionModal, setShowDeletePositionModal] = useState(false);
  const [positionToDelete, setPositionToDelete] = useState(null);
  const [isDeletingPosition, setIsDeletingPosition] = useState(false);

  // Position employees view state
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [positionEmployees, setPositionEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [positionEmployeeSearchTerm, setPositionEmployeeSearchTerm] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'ascending' });

  // Add employee to position modal states
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  const [currentPositionForEmployee, setCurrentPositionForEmployee] = useState(null);
  const [allEmployees, setAllEmployees] = useState([]);
  const [loadingAllEmployees, setLoadingAllEmployees] = useState(false);
  const [showReassignConfirmModal, setShowReassignConfirmModal] = useState(false);
  const [reassignmentData, setReassignmentData] = useState(null);

  const [showRemoveEmployeeModal, setShowRemoveEmployeeModal] = useState(false);
  const [employeeToRemove, setEmployeeToRemove] = useState(null);
  const [isRemovingEmployee, setIsRemovingEmployee] = useState(false);
  const [showRoleChangeModal, setShowRoleChangeModal] = useState(false);
  const [roleChangeData, setRoleChangeData] = useState({ employee: null, newRole: '', roleName: '' });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoadingDepartments(true);
        const res = await departmentAPI.getAll();
        const data = Array.isArray(res.data) ? res.data : (res.data?.data || []);
        if (mounted) setDepartments(data);
      } catch {
        if (mounted) setDepartments([]);
      } finally {
        if (mounted) setLoadingDepartments(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const confirmRemoveEmployee = async () => {
    if (!employeeToRemove || !selectedPosition) return;
    
    // Optimistic Update: Remove employee from UI immediately
    const previousEmployees = [...positionEmployees];
    const previousPositions = [...positions];

    setPositionEmployees(prev => prev.filter(e => e.id !== employeeToRemove.id));
    
    // Update the count in the positions list immediately
    setPositions(prev => prev.map(p => 
        p.id === selectedPosition.id 
        ? { ...p, employeeCount: Math.max(0, (p.employeeCount || 0) - 1) }
        : p
    ));

    try {
      setIsRemovingEmployee(true);
      await positionAPI.removeEmployee(selectedPosition.id, employeeToRemove.id);
      
      // Success - no need to re-fetch as we already updated UI
      setToast({ show: true, message: 'Employee removed from position successfully', type: 'success' });
    } catch (error) {
      // Revert on failure
      setPositionEmployees(previousEmployees);
      setPositions(previousPositions);
      setToast({ show: true, message: 'Failed to remove employee', type: 'error' });
    } finally {
      setIsRemovingEmployee(false);
      setShowRemoveEmployeeModal(false);
      setEmployeeToRemove(null);
    }
  };

  const filteredDepartments = useMemo(() => {
    if (!searchTerm) return departments || [];
    return (departments || []).filter(d => (d.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || (d.description || '').toLowerCase().includes(searchTerm.toLowerCase()));
  }, [departments, searchTerm]);

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

  const openCreateDepartment = () => { setEditingDepartment(null); setShowDeptModal(true); };
  const openEditDepartment = (dept) => { setEditingDepartment(dept); setShowDeptModal(true); };
  const closeDeptModal = () => setShowDeptModal(false);

  const saveDepartment = async (payload, id) => {
    try {
      setSubmitting(true);
      if (id) {
        await departmentAPI.update(id, payload);
        setToast({ show: true, message: 'Department updated successfully!', type: 'success' });
      } else {
        await departmentAPI.create(payload);
        setToast({ show: true, message: 'Department created successfully!', type: 'success' });
      }
      const res = await departmentAPI.getAll();
      const data = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      setDepartments(data);
      setShowDeptModal(false);
      setEditingDepartment(null);
    } catch (e) {
      const message = e?.response?.data?.message || 'Failed to save department. Please try again.';
      setToast({ show: true, message, type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const viewDepartment = async (dept) => {
    setSelectedDepartment(dept);
    try {
      setLoadingPositions(true);
      const res = await departmentAPI.getPositions(dept.id);
      const data = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      setPositions(data);
    } catch {
      setPositions([]);
    } finally {
      setLoadingPositions(false);
    }
  };

  const backToDepartments = () => {
    setSelectedDepartment(null);
    setPositions([]);
  };

  const openCreatePosition = () => { setEditingPosition(null); setShowPositionModal(true); };
  const openEditPosition = (pos) => { setEditingPosition(pos); setShowPositionModal(true); };
  const closePositionModal = () => setShowPositionModal(false);

  const refreshPositions = async () => {
    if (!selectedDepartment) return;
    const res = await departmentAPI.getPositions(selectedDepartment.id);
    const data = Array.isArray(res.data) ? res.data : (res.data?.data || []);
    setPositions(data);
  };

  const refreshPositionEmployees = async (positionId) => {
    try {
      setLoadingEmployees(true);
      const res = await positionAPI.getEmployees(positionId);
      const data = Array.isArray(res.data?.employees) ? res.data.employees : (res.data?.data || []);
      setPositionEmployees(data
        .filter(e => e.role !== 'SUPER_ADMIN')
        .map(e => ({
        id: e.id,
        name: e.name || `${e.first_name || ''} ${e.last_name || ''}`.trim(),
        role: e.role,
        employee_id: e.employee_id || e.id,
        joining_date: e.joining_date,
        image_url: e.image_url,
      })));
    } catch {
      setPositionEmployees([]);
    } finally {
      setLoadingEmployees(false);
    }
  };

  const savePosition = async (formData, positionId) => {
    try {
      setSubmitting(true);
      const payload = {
        name: formData.title,
        max_team_leaders: Number(formData.max_team_leaders ?? 1),
        description: formData.description,
        base_rate_per_hour: Number(formData.base_rate_per_hour ?? 0),
        regular_day_ot_rate: Number(formData.regular_day_ot_rate ?? 0),
        special_ot_rate: Number(formData.special_ot_rate ?? 0),
        regular_holiday_ot_rate: Number(formData.regular_holiday_ot_rate ?? 0),
        night_diff_rate_per_hour: Number(formData.night_diff_rate_per_hour ?? 0),
        late_deduction_per_minute: Number(formData.late_deduction_per_minute ?? 0),
        monthly_salary: Number(formData.monthly_salary ?? 0),
        department_id: selectedDepartment.id,
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
      setShowPositionModal(false);
      setEditingPosition(null);
    } catch (e) {
      const message = e?.response?.data?.message || 'Failed to save position. Please try again.';
      setToast({ show: true, message, type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  // Open Add Employee modal for a specific position
  const openAddEmployeeForPosition = async (pos) => {
    setCurrentPositionForEmployee(pos);
    try {
      setLoadingAllEmployees(true);
      const res = await employeeAPI.getAll();
      const data = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      setAllEmployees(data
        .filter(e => e.role !== 'SUPER_ADMIN')
        .map(e => ({
        id: e.id,
        name: e.name || `${e.first_name || ''} ${e.last_name || ''}`.trim(),
        positionId: e.position_id || null,
      })));
    } catch {
      setAllEmployees([]);
    } finally {
      setLoadingAllEmployees(false);
      setShowAddEmployeeModal(true);
    }
  };

  const closeAddEmployeeModal = () => {
    setShowAddEmployeeModal(false);
    setCurrentPositionForEmployee(null);
  };

  const handleSaveEmployeeToPosition = async (employeeId, positionId) => {
    try {
      await employeeAPI.update(employeeId, { position_id: positionId });
      
      // If we are currently viewing the position we added to, refresh its employee list
      if (selectedPosition && selectedPosition.id === positionId) {
        await refreshPositionEmployees(positionId);
      } 
      
      // Always refresh the positions list to update counts
      await refreshPositions();
      
      setToast({ show: true, message: 'Employee assigned successfully!', type: 'success' });
    } catch (e) {
      const message = e?.response?.data?.message || 'Failed to assign employee.';
      setToast({ show: true, message, type: 'error' });
    }
  };

  const handleConfirmReassignment = (employee, currentPosTitle, newPosition, onConfirm) => {
    setReassignmentData({ employee, currentPosTitle, newPosition, onConfirm });
    setShowReassignConfirmModal(true);
  };

  const confirmReassignment = async () => {
    if (reassignmentData?.onConfirm) {
      await reassignmentData.onConfirm();
      setShowReassignConfirmModal(false);
      setReassignmentData(null);
      await refreshPositions();
    }
  };

  const cancelReassignment = () => {
    setShowReassignConfirmModal(false);
    setReassignmentData(null);
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

    // Optimistic Update
    const previousEmployees = [...positionEmployees];
    setPositionEmployees(prev => prev.map(e => 
        e.id === roleChangeData.employee.id 
        ? { ...e, role: roleChangeData.newRole } 
        : e
    ));

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
      
      // No need to refresh full list if optimistic update succeeded
    } catch (error) {
      // Revert on failure
      setPositionEmployees(previousEmployees);
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

  const confirmDeleteDepartment = async () => {
    if (!deptToDelete) return;
    try {
      setIsDeletingDept(true);
      await departmentAPI.delete(deptToDelete.id);
      const res = await departmentAPI.getAll();
      const data = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      setDepartments(data);
      setToast({ show: true, message: 'Department deleted successfully!', type: 'success' });
    } catch (e) {
      const message = e?.response?.data?.message || 'Failed to delete department.';
      setToast({ show: true, message, type: 'error' });
    } finally {
      setIsDeletingDept(false);
      setShowDeleteDeptModal(false);
      setDeptToDelete(null);
    }
  };

  const confirmDeletePosition = async () => {
    if (!positionToDelete) return;
    try {
      setIsDeletingPosition(true);
      await positionAPI.delete(positionToDelete.id);
      await refreshPositions();
      setToast({ show: true, message: 'Position deleted successfully!', type: 'success' });
    } catch (e) {
      setToast({ show: true, message: 'Failed to delete position.', type: 'error' });
    } finally {
      setIsDeletingPosition(false);
      setShowDeletePositionModal(false);
      setPositionToDelete(null);
    }
  };

  const handleViewPositionDetails = async (pos) => {
    setSelectedPosition(pos);
    try {
      // Fetch latest position details to ensure we have max_team_leaders
      const posRes = await positionAPI.getById(pos.id);
      if (posRes.data) {
        setSelectedPosition(prev => ({ ...prev, ...posRes.data }));
      }
      await refreshPositionEmployees(pos.id);
    } catch (e) {
      console.error("Error fetching position details:", e);
    }
  };

  const backToDepartmentPositions = () => {
    setSelectedPosition(null);
    setPositionEmployees([]);
    setPositionEmployeeSearchTerm('');
    setSelectedRoleFilter('');
    setSortConfig({ key: 'name', direction: 'asc' });
  };

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

  if (selectedDepartment) {
    if (selectedPosition) {


      const currentLeadersCount = positionEmployees.filter(e => e.role === 'TEAM_LEADER').length;
      const maxLeaders = selectedPosition.max_team_leaders ?? 1;

      return (
        <div className="container-fluid p-0 page-module-container">
          <header className="page-header detail-view-header mb-4">
            <div className="d-flex justify-content-between align-items-start">
              <div className="d-flex align-items-center">
                <button className="btn btn-icon-back me-3" onClick={backToDepartmentPositions} title={`Back to ${selectedDepartment.name}`}>
                  <i className="bi bi-arrow-left"></i>
                </button>
                <div>
                  <div className="d-flex align-items-center gap-2 mb-1">
                     <h1 className="page-main-title mb-0">{selectedPosition.title || selectedPosition.name}</h1>
                     <span className="badge bg-success-subtle text-success rounded-pill px-3">
                        {positionEmployees.length} Employee{positionEmployees.length !== 1 ? 's' : ''}
                     </span>
                     <div className="vr mx-1"></div>
                     <div className="d-flex align-items-center">
                        <span className="text-muted small me-2">Leaders:</span>
                        <span className={`fw-bold small ${currentLeadersCount > maxLeaders ? 'text-danger' : ''}`}>
                           {currentLeadersCount} / {maxLeaders}
                        </span>
                        <button 
                          className="btn btn-link p-0 ms-2 text-decoration-none" 
                          onClick={() => openEditPosition(selectedPosition)}
                          title="Edit Position Limit"
                        >
                          <i className="bi bi-pencil-square"></i>
                        </button>
                     </div>
                  </div>
                  <p className="page-subtitle text-muted mb-0">Manage employees assigned to this position</p>
                </div>
              </div>
              <button className="btn btn-success shadow-sm d-flex align-items-center" onClick={() => openAddEmployeeForPosition(selectedPosition)} disabled={loadingAllEmployees}>
                {loadingAllEmployees ? (
                  <><span className="spinner-border spinner-border-sm me-2" role="status" />Loading...</>
                ) : (
                  <>
                    <i className="bi bi-person-plus-fill me-2"></i> 
                    <span>Add Employee</span>
                  </>
                )}
              </button>
            </div>
          </header>

          <div className="departments-controls d-flex flex-wrap gap-3 justify-content-between align-items-center">
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
              <div className="employee-table-wrapper">
                <table className="table table-hover align-middle mb-0">
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
                    {displayedEmployeesInPosition.map(emp => {
                      const isTeamLeader = emp.role === 'TEAM_LEADER';
                      const initials = (emp.name || '?').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                      
                      return (
                        <tr key={emp.id}>
                          <td className="ps-4">
                            <span className="font-monospace text-secondary small">{emp.employee_id || `#${emp.id}`}</span>
                          </td>
                          <td>
                            <div className="fw-bold text-dark">{emp.name}</div>
                          </td>
                          <td>
                            {isTeamLeader ? (
                              <span className="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-3">Team Leader</span>
                            ) : (
                              <span className="badge bg-secondary-subtle text-secondary border border-secondary-subtle rounded-pill px-3">Member</span>
                            )}
                          </td>
                          <td>
                            <span className="text-secondary">{emp.joining_date ? new Date(emp.joining_date).toLocaleDateString() : 'N/A'}</span>
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
                                      setEmployeeToRemove(emp); 
                                      setShowRemoveEmployeeModal(true); 
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
                    })}
                    {displayedEmployeesInPosition.length === 0 && (
                      <tr>
                        <td colSpan="5" className="text-center py-5">
                          <div className="text-muted mb-2"><i className="bi bi-people display-4 opacity-25"></i></div>
                          <p className="text-muted m-0">No employees found in this position.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {showAddEmployeeModal && currentPositionForEmployee && (
            <AddEmployeeToPositionModal
              show={showAddEmployeeModal}
              onClose={closeAddEmployeeModal}
              onSave={handleSaveEmployeeToPosition}
              onConfirmReassignment={handleConfirmReassignment}
              currentPosition={{ id: currentPositionForEmployee.id, title: currentPositionForEmployee.title || currentPositionForEmployee.name }}
              allEmployees={allEmployees}
              allPositions={positions}
            />
          )}

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

          {/* Add/Edit Position Modal for inline editing */}
          <AddEditPositionModal 
            show={showPositionModal} 
            onClose={closePositionModal} 
            onSave={savePosition} 
            positionData={editingPosition} 
            submitting={submitting} 
          />

          {toast.show && (
            <ToastNotification show={toast.show} message={toast.message} type={toast.type} onClose={() => setToast({ show: false, message: '', type: 'success' })} />
          )}
        </div>
      );
    }

    return (
      <div className="container-fluid p-0 departments-container">
        <header className="page-header detail-view-header mb-4">
          <div className="d-flex justify-content-between align-items-start">
            <div className="d-flex align-items-center">
              <button className="btn btn-icon-back me-3" onClick={backToDepartments} title="Back to Departments">
                <i className="bi bi-arrow-left"></i>
              </button>
              <div>
                <div className="d-flex align-items-center gap-2 mb-1">
                   <h1 className="page-main-title mb-0">{selectedDepartment.name}</h1>
                   <span className="badge bg-primary-subtle text-primary rounded-pill px-3">
                      {positions.length} Position{positions.length !== 1 ? 's' : ''}
                   </span>
                </div>
                <p className="page-subtitle text-muted mb-0">Manage positions and view department details</p>
              </div>
            </div>
            <button className="btn btn-success shadow-sm d-flex align-items-center" onClick={openCreatePosition}>
              <i className="bi bi-plus-lg me-2"></i> 
              <span>Add Position</span>
            </button>
          </div>
        </header>

        {loadingPositions ? (
          <div className="departments-grid">
            {[1, 2, 3].map(i => (
              <div key={i} className="pos-card skeleton-card">
                <div className="card-body p-4">
                  <div className="skeleton skeleton-title mb-3"></div>
                  <div className="skeleton skeleton-text w-75 mb-2"></div>
                  <div className="skeleton skeleton-text w-50"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="departments-grid">
            {positions.length > 0 ? (
              positions.map(pos => (
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
                        <li><a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); openEditPosition(pos); }}><i className="bi bi-pencil me-2"></i>Edit Details</a></li>
                        <li><a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); handleViewPositionDetails(pos); }}><i className="bi bi-people me-2"></i>Manage Employees</a></li>
                        <li><hr className="dropdown-divider" /></li>
                        <li><a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); openAddEmployeeForPosition(pos); }}><i className="bi bi-person-plus me-2"></i>Add Employee</a></li>
                        <li><hr className="dropdown-divider" /></li>
                        <li><a className="dropdown-item text-danger" href="#" onClick={(e) => { e.preventDefault(); setPositionToDelete(pos); setShowDeletePositionModal(true); }}><i className="bi bi-trash me-2"></i>Delete</a></li>
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
                          <span className="stat-value">{pos.employeeCount || 0}</span>
                        </div>
                      </div>
                      <div className="stat-item">
                        <i className="bi bi-cash-stack"></i>
                        <div className="stat-content">
                          <span className="stat-label">Salary</span>
                          <span className="stat-value">₱{(Number(pos.monthly_salary) || 0).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="pos-card-footer">
                    <button className="btn btn-outline-success btn-sm w-100" onClick={() => handleViewPositionDetails(pos)}>
                      View Employees <i className="bi bi-arrow-right ms-1"></i>
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state-container">
                <div className="empty-state-icon">
                  <i className="bi bi-briefcase"></i>
                </div>
                <h5 className="text-muted">No positions found</h5>
                <p className="text-muted small mb-4">This department doesn't have any positions yet.</p>
                <button className="btn btn-primary" onClick={openCreatePosition}>
                  <i className="bi bi-plus-lg me-2"></i>Create First Position
                </button>
              </div>
            )}
          </div>
        )}

        {showPositionModal && (
          <AddEditPositionModal show={showPositionModal} onClose={closePositionModal} onSave={savePosition} positionData={editingPosition} submitting={submitting} />
        )}

        {showAddEmployeeModal && currentPositionForEmployee && (
          <AddEmployeeToPositionModal
            show={showAddEmployeeModal}
            onClose={closeAddEmployeeModal}
            onSave={handleSaveEmployeeToPosition}
            onConfirmReassignment={handleConfirmReassignment}
            currentPosition={{ id: currentPositionForEmployee.id, title: currentPositionForEmployee.title || currentPositionForEmployee.name }}
            allEmployees={allEmployees}
            allPositions={positions}
          />
        )}

        {toast.show && (
          <ToastNotification show={toast.show} message={toast.message} type={toast.type} onClose={() => setToast({ show: false, message: '', type: 'success' })} />
        )}

        <ConfirmationModal show={showDeletePositionModal} title="Delete Position" onClose={() => { setShowDeletePositionModal(false); setPositionToDelete(null); }} onConfirm={confirmDeletePosition} confirmText={isDeletingPosition ? 'Deleting...' : 'Delete'} confirmVariant="danger" disabled={isDeletingPosition}>
          <div className="text-center">
             <i className="bi bi-exclamation-triangle text-danger display-1 mb-3"></i>
             <p>Are you sure you want to delete the position <strong>{positionToDelete?.title || positionToDelete?.name}</strong>?</p>
             <p className="text-muted small">This action cannot be undone. Ensure no employees are assigned to this position before deleting.</p>
          </div>
        </ConfirmationModal>

        <ConfirmationModal
          show={showRemoveEmployeeModal}
          title="Remove Employee"
          onClose={() => { setShowRemoveEmployeeModal(false); setEmployeeToRemove(null); }}
          onConfirm={confirmRemoveEmployee}
          confirmText={isRemovingEmployee ? 'Removing...' : 'Remove'}
          confirmVariant="danger"
          disabled={isRemovingEmployee}
        >
          {employeeToRemove && (
            <div className="text-center">
              <i className="bi bi-person-dash text-danger display-1 mb-3"></i>
              <p>Are you sure you want to remove <strong>{employeeToRemove.name}</strong> from the position <strong>{selectedPosition?.title || selectedPosition?.name}</strong>?</p>
              <p className="text-muted small">The employee will be unassigned but their record will remain in the system.</p>
            </div>
          )}
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
            <div className="text-center">
              <i className="bi bi-arrow-left-right text-warning display-4 mb-3"></i>
              <p>Employee <strong>{reassignmentData.employee.name}</strong> is already assigned to <strong>{reassignmentData.currentPosTitle}</strong>.</p>
              <p>Do you want to move them to <strong>{reassignmentData.newPosition.title}</strong>?</p>
            </div>
          )}
        </ConfirmationModal>
      </div>
    );
  }

  return (
    <div className="container-fluid p-0 departments-container">
      <header className="page-header d-flex justify-content-between align-items-center mb-4">
        <div className="d-flex align-items-center">
          <h1 className="page-main-title me-3">Department Management</h1>
          <span className="badge bg-secondary-subtle text-secondary-emphasis rounded-pill px-3 py-2">
            {departments.length} Total
          </span>
        </div>
        <div className="departments-header-actions">
          <button className="btn btn-success d-flex align-items-center gap-2 shadow-sm" onClick={openCreateDepartment}>
            <i className="bi bi-plus-lg"></i> 
            <span>Add Department</span>
          </button>
        </div>
      </header>

      <div className="departments-controls">
        <div className="input-group search-wrapper">
          <span className="input-group-text bg-transparent border-end-0"><i className="bi bi-search text-muted"></i></span>
          <input 
            type="text" 
            className="form-control border-start-0 ps-0" 
            placeholder="Search departments..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
          />
        </div>
      </div>

      {loadingDepartments ? (
        <div className="departments-grid">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="dept-card skeleton-card">
              <div className="card-body p-4">
                <div className="skeleton skeleton-title mb-3"></div>
                <div className="skeleton skeleton-text mb-2"></div>
                <div className="skeleton skeleton-text mb-4"></div>
                <div className="skeleton skeleton-text w-50"></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="departments-grid">
          {filteredDepartments.length > 0 ? (
            filteredDepartments.map(dept => (
              <div key={dept.id} className="dept-card">
                <div className="dept-card-header">
                  <div className="dept-icon-wrapper">
                    <i className="bi bi-building"></i>
                  </div>
                  <div className="dept-title-section">
                    <h5 className="dept-title" title={dept.name}>{dept.name}</h5>

                  </div>
                  <div className="dept-actions dropdown">
                    <button className="btn btn-icon" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                      <i className="bi bi-three-dots-vertical"></i>
                    </button>
                    <ul className="dropdown-menu dropdown-menu-end shadow-sm border-0">
                      <li><a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); openEditDepartment(dept); }}><i className="bi bi-pencil me-2"></i>Edit</a></li>
                      {dept.name !== 'Admin Department' && (
                        <>
                          <li><hr className="dropdown-divider" /></li>
                          <li><a className="dropdown-item text-danger" href="#" onClick={(e) => { e.preventDefault(); setDeptToDelete(dept); setShowDeleteDeptModal(true); }}><i className="bi bi-trash me-2"></i>Delete</a></li>
                        </>
                      )}
                    </ul>
                  </div>
                </div>
                <div className="dept-card-body">
                  <p className="dept-description">{dept.description || 'No description provided.'}</p>
                  <div className="dept-stats">
                    <div className="stat-item" title="Positions">
                      <i className="bi bi-briefcase"></i>
                      <span className="stat-value">{dept.positionCount || 0}</span>
                    </div>
                    <div className="stat-item" title="Employees">
                      <i className="bi bi-people"></i>
                      <span className="stat-value">{dept.employeeCount || 0}</span>
                    </div>
                  </div>
                </div>
                <div className="dept-card-footer">
                  <button className="btn btn-outline-success btn-sm w-100" onClick={() => viewDepartment(dept)}>
                    Manage Positions <i className="bi bi-arrow-right ms-1"></i>
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state-container">
              <div className="empty-state-icon">
                <i className="bi bi-building-exclamation"></i>
              </div>
              <h5 className="text-muted">No departments found</h5>
              <p className="text-muted small mb-4">Try adjusting your search or create a new one.</p>
              <button className="btn btn-success" onClick={openCreateDepartment}>
                <i className="bi bi-plus-lg me-2"></i>Create Department
              </button>
            </div>
          )}
        </div>
      )}

      {showDeptModal && (
        <AddEditDepartmentModal show={showDeptModal} onClose={closeDeptModal} onSave={saveDepartment} departmentData={editingDepartment} />
      )}

      {toast.show && (
        <ToastNotification show={toast.show} message={toast.message} type={toast.type} onClose={() => setToast({ show: false, message: '', type: 'success' })} />
      )}

      <ConfirmationModal show={showDeleteDeptModal} title="Delete Department" onClose={() => { setShowDeleteDeptModal(false); setDeptToDelete(null); }} onConfirm={confirmDeleteDepartment} confirmText={isDeletingDept ? 'Deleting...' : 'Delete'} confirmVariant="danger" disabled={isDeletingDept}>
        <div className="text-center">
          <i className="bi bi-exclamation-triangle text-warning display-1 mb-3"></i>
          <p>Are you sure you want to delete the department <strong>{deptToDelete?.name}</strong>?</p>
          <p className="text-muted small">This action cannot be undone. Ensure no employees are assigned to this department before deleting.</p>
        </div>
      </ConfirmationModal>
    </div>
  );
};

export default DepartmentsPage;

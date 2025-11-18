import React, { useEffect, useMemo, useState } from 'react';
import '../Positions/PositionsPage.css';
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

  // Add employee to position modal states
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  const [currentPositionForEmployee, setCurrentPositionForEmployee] = useState(null);
  const [allEmployees, setAllEmployees] = useState([]);
  const [loadingAllEmployees, setLoadingAllEmployees] = useState(false);
  const [showReassignConfirmModal, setShowReassignConfirmModal] = useState(false);
  const [reassignmentData, setReassignmentData] = useState(null);

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

  const filteredDepartments = useMemo(() => {
    if (!searchTerm) return departments || [];
    return (departments || []).filter(d => (d.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || (d.description || '').toLowerCase().includes(searchTerm.toLowerCase()));
  }, [departments, searchTerm]);

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
      setPositionEmployees(data.map(e => ({
        id: e.id,
        name: e.name || `${e.first_name || ''} ${e.last_name || ''}`.trim(),
        role: e.role,
        employee_id: e.employee_id || e.id,
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
      setAllEmployees(data.map(e => ({
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
    await refreshPositionEmployees(pos.id);
  };

  const backToDepartmentPositions = () => {
    setSelectedPosition(null);
    setPositionEmployees([]);
    setPositionEmployeeSearchTerm('');
  };

  if (selectedDepartment) {
    if (selectedPosition) {
      const displayedEmployeesInPosition = positionEmployees.filter(emp =>
        (emp.name || '').toLowerCase().includes(positionEmployeeSearchTerm.toLowerCase()) ||
        String(emp.employee_id || '').includes(positionEmployeeSearchTerm)
      );

      return (
        <div className="container-fluid p-0 page-module-container">
          <header className="page-header detail-view-header">
            <button className="btn btn-light me-3 back-button" onClick={backToDepartmentPositions}>
              <i className="bi bi-arrow-left"></i> Back to {selectedDepartment.name}
            </button>
          </header>

          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h1 className="page-main-title mb-0">{selectedPosition.title || selectedPosition.name}</h1>
              <p className="page-subtitle text-muted mb-0">{positionEmployees.length} Employee(s)</p>
            </div>
            <button className="btn btn-success" onClick={() => openAddEmployeeForPosition(selectedPosition)} disabled={loadingAllEmployees}>
              {loadingAllEmployees ? (<><span className="spinner-border spinner-border-sm me-2" role="status" />Loading...</>) : (<><i className="bi bi-person-plus-fill me-2"></i> Add Employee</>)}
            </button>
          </div>

          <div className="controls-bar d-flex justify-content-start mb-4">
            <div className="input-group detail-view-search">
              <span className="input-group-text"><i className="bi bi-search"></i></span>
              <input type="text" className="form-control" placeholder="Search employees in this position..." value={positionEmployeeSearchTerm} onChange={(e) => setPositionEmployeeSearchTerm(e.target.value)} />
            </div>
          </div>

          {loadingEmployees ? (
            <div className="text-center p-5">Loading employees...</div>
          ) : (
            <div className="card data-table-card shadow-sm">
              <div className="table-responsive">
                <table className="table data-table mb-0">
                  <thead><tr><th>Employee ID</th><th>Name</th><th>Role</th></tr></thead>
                  <tbody>
                    {displayedEmployeesInPosition.map(emp => {
                      const isTeamLeader = emp.role === 'TEAM_LEADER';
                      const isHR = emp.role === 'HR_MANAGER';
                      return (
                        <tr key={emp.id}>
                          <td>{emp.employee_id || emp.id}</td>
                          <td>{emp.name}</td>
                          <td>
                            {isHR ? (
                              <span className="badge bg-primary">HR Manager</span>
                            ) : isTeamLeader ? (
                              <span className="badge bg-success">Team Leader</span>
                            ) : (
                              <span className="text-muted">Member</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {displayedEmployeesInPosition.length === 0 && (
                      <tr><td colSpan="3" className="text-center p-5">No employees match your search in this position.</td></tr>
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
        </div>
      );
    }

    return (
      <div className="container-fluid p-0 page-module-container">
        <header className="page-header detail-view-header">
          <button className="btn btn-light me-3 back-button" onClick={backToDepartments}>
            <i className="bi bi-arrow-left"></i> Back to Departments List
          </button>
        </header>

        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h1 className="page-main-title mb-0">{selectedDepartment.name}</h1>
            <p className="page-subtitle text-muted mb-0">{positions.length} Position(s)</p>
          </div>
          <button className="btn btn-success" onClick={openCreatePosition}>
            <i className="bi bi-plus-circle-fill me-2"></i> Add Position
          </button>
        </div>

        {loadingPositions ? (
          <div className="text-center p-5">Loading positions...</div>
        ) : (
          <div className="positions-grid-container">
            {positions.length > 0 ? (
              positions.map(pos => (
                <div key={pos.id} className="position-card">
                  <div className="position-card-header">
                    <h5 className="position-title">{pos.title}</h5>
                    <div className="dropdown">
                      <button className="btn btn-sm btn-light" type="button" data-bs-toggle="dropdown" aria-expanded="false"><i className="bi bi-three-dots-vertical"></i></button>
                      <ul className="dropdown-menu dropdown-menu-end">
                        <li><a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); openEditPosition(pos); }}>Edit</a></li>
                        <li><a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); handleViewPositionDetails(pos); }}>View Employees</a></li>
                        <li><a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); openAddEmployeeForPosition(pos); }}>Add Employee</a></li>
                        <li><a className="dropdown-item text-danger" href="#" onClick={(e) => { e.preventDefault(); setPositionToDelete(pos); setShowDeletePositionModal(true); }}>Delete</a></li>
                      </ul>
                    </div>
                  </div>
                <div className="card-body">
                  <p className="position-description">{pos.description}</p>
                  <div className="info-row">
                    <span className="label">Employee Count:</span>
                    <span className="value">{pos.employeeCount || 0}</span>
                  </div>
                </div>
                </div>
              ))
            ) : (
              <div className="w-100 text-center p-5 bg-light rounded">
                <i className="bi bi-diagram-3-fill fs-1 text-muted mb-3 d-block"></i>
                <h4 className="text-muted">No positions in this department yet.</h4>
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
          Are you sure you want to delete the position "{positionToDelete?.title}"?
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
      </div>
    );
  }

  return (
    <div className="container-fluid p-0 page-module-container">
      <header className="page-header d-flex justify-content-between align-items-center mb-4">
        <div className="d-flex align-items-center">
          <h1 className="page-main-title me-3">Department Management</h1>
          <span className="badge bg-secondary-subtle text-secondary-emphasis rounded-pill">{departments.length} total departments</span>
        </div>
        <div className="header-actions d-flex align-items-center gap-2">
          <button className="btn btn-success" onClick={openCreateDepartment}><i className="bi bi-plus-circle-fill me-2"></i> Add New Department</button>
        </div>
      </header>

      <div className="controls-bar d-flex justify-content-start mb-4">
        <div className="input-group">
          <span className="input-group-text"><i className="bi bi-search"></i></span>
          <input type="text" className="form-control" placeholder="Search departments by name or description..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
      </div>

      {loadingDepartments ? (
        <div className="w-100 text-center p-5 bg-light rounded">
          <div className="spinner-border text-success" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3 mb-0">Loading departments...</p>
        </div>
      ) : (
        <div className="positions-grid-container">
          {filteredDepartments.length > 0 ? (
            filteredDepartments.map(dept => (
              <div key={dept.id} className="position-card">
                <div className="position-card-header">
                  <h5 className="position-title">{dept.name}</h5>
                  <div className="dropdown">
                    <button className="btn btn-sm btn-light" type="button" data-bs-toggle="dropdown" aria-expanded="false"><i className="bi bi-three-dots-vertical"></i></button>
                    <ul className="dropdown-menu dropdown-menu-end">
                      <li><a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); openEditDepartment(dept); }}>Edit</a></li>
                      <li><a className="dropdown-item text-danger" href="#" onClick={(e) => { e.preventDefault(); setDeptToDelete(dept); setShowDeleteDeptModal(true); }}>Delete</a></li>
                    </ul>
                  </div>
                </div>
                <div className="card-body">
                  <p className="position-description">{dept.description}</p>
                  <div className="info-row"><span className="label">Positions:</span><span className="value">{dept.positionCount || 0}</span></div>
                  <div className="info-row"><span className="label">Employees:</span><span className="value">{dept.employeeCount || 0}</span></div>
                </div>
                <div className="position-card-footer">
                  <button className="btn btn-sm btn-outline-secondary" onClick={() => viewDepartment(dept)}>View Positions</button>
                </div>
              </div>
            ))
          ) : (
            <div className="w-100 text-center p-5 bg-light rounded">
              <i className="bi bi-diagram-3-fill fs-1 text-muted mb-3 d-block"></i>
              <h4 className="text-muted">No departments have been created yet.</h4>
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
        Are you sure you want to delete the department "{deptToDelete?.name}"?
      </ConfirmationModal>
    </div>
  );
};

export default DepartmentsPage;
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

  const displayedEmployeesInPosition = useMemo(() => {
    if (!positionEmployeeSearchTerm) return positionEmployees;
    return positionEmployees.filter(emp => (emp.name || '').toLowerCase().includes(positionEmployeeSearchTerm.toLowerCase()));
  }, [positionEmployeeSearchTerm, positionEmployees]);

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
      setPositionEmployees(res.data?.employees || []);
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
        base_rate_per_hour: Number(formData.base_rate_per_hour ?? 0),
        overtime_rate_per_hour: Number(formData.overtime_rate_per_hour ?? 0),
        night_diff_rate_per_hour: Number(formData.night_diff_rate_per_hour ?? 0),
        late_deduction_per_minute: Number(formData.late_deduction_per_minute ?? 0),
        monthly_salary: Number(formData.monthly_salary ?? 0),
      };
      if (positionId) {
        await positionAPI.update(positionId, payload);
        setToast({ show: true, message: 'Position updated successfully!', type: 'success' });
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

  const handleToggleLeader = async (employeeId) => {
    try {
      const response = await employeeAPI.toggleTeamLeader(employeeId);
      
      // Show success message
      if (response.data?.message) {
        setToast({ show: true, message: response.data.message, type: 'success' });
      }
      
      // Refresh the position employees to reflect the role change
      if (selectedPosition) {
        await refreshPositionEmployees(selectedPosition.id);
      }
    } catch (error) {
      // Handle error
      const errorMessage = error.response?.data?.message || 'Failed to update team leader status. Please try again.';
      setToast({ show: true, message: errorMessage, type: 'error' });
    }
  };

  const handleViewPositionDetails = async (position) => {
    setSelectedPosition(position);
    setLoadingEmployees(true);
    try {
      const res = await positionAPI.getEmployees(position.id);
      setPositionEmployees(res.data?.employees || []);
    } catch (e) {
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
      const normalized = data.map(e => ({ id: e.id, name: e.name, positionId: e.position_id ?? e.positionId ?? null }));
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

  const handleGenerateReport = () => {
    if (!positions || positions.length === 0) {
      alert("No positions available to generate a report.");
      return;
    }
    generateReport('positions_report', {}, { employees: allEmployees, positions });
    setShowReportPreview(true);
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
        <header className="page-header detail-view-header">
          <button className="btn btn-light me-3 back-button" onClick={handleBackToPositionsList}>
            <i className="bi bi-arrow-left"></i> Back to Positions List
          </button>
        </header>

        <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
                <h1 className="page-main-title mb-0">{selectedPosition.title}</h1>
                <p className="page-subtitle text-muted mb-0">{positionEmployees.length} Employee(s)</p>
            </div>
            <button className="btn btn-success" onClick={handleOpenAddEmployeeModal} disabled={loadingAllEmployees}>
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
                <thead><tr><th>Employee ID</th><th>Name</th><th>Role</th><th>Action</th></tr></thead>
                <tbody>
                  {displayedEmployeesInPosition.map(emp => (
                    <tr key={emp.id}>
                      <td>{emp.id}</td><td>{emp.name}</td>
                      <td>{emp.isTeamLeader ? <span className="badge bg-success">Team Leader</span> : 'Member'}</td>
                      <td>
                        <div className="dropdown"><button className="btn btn-outline-secondary btn-sm" type="button" data-bs-toggle="dropdown">Manage <i className="bi bi-caret-down-fill"></i></button>
                          <ul className="dropdown-menu dropdown-menu-end">
                            <li><a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); handleToggleLeader(emp.id); }}>{emp.isTeamLeader ? 'Unset as Leader' : 'Set as Leader'}</a></li>
                            <li><hr className="dropdown-divider" /></li>
                            <li><a className="dropdown-item text-danger" href="#" onClick={(e) => { e.preventDefault(); handleRemoveFromPosition(emp); }}>Remove from Position</a></li>
                          </ul>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {displayedEmployeesInPosition.length === 0 && (
                    <tr><td colSpan="4" className="text-center p-5">No employees match your search in this position.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {showAddEmployeeModal && (
          <AddEmployeeToPositionModal
            show={showAddEmployeeModal} onClose={handleCloseAddEmployeeModal}
            onSave={handleSaveEmployeeToPosition} onConfirmReassignment={handleConfirmReassignment}
            currentPosition={selectedPosition}
            allEmployees={allEmployees} allPositions={positions}
          />
        )}

        {/* Reassignment Confirmation Modal */}
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

        {/* Add Employee Confirmation Modal */}
        <ConfirmationModal
          show={showAddEmployeeConfirmModal}
          title="Add Employee to Position"
          onClose={cancelAddEmployee}
          onConfirm={confirmAddEmployee}
          confirmText="Add Employee"
          confirmVariant="success"
        >
          Are you sure you want to add this employee to the selected position?
        </ConfirmationModal>

        {/* Remove Employee Confirmation Modal */}
        <ConfirmationModal
          show={showRemoveEmployeeModal}
          title="Remove Employee from Position"
          onClose={cancelRemoveEmployee}
          onConfirm={confirmRemoveEmployee}
          confirmText={isRemovingEmployee ? 'Removing...' : 'Remove'}
          confirmVariant="danger"
          disabled={isRemovingEmployee}
        >
          Are you sure you want to remove "{employeeToRemove?.name}" from their current position?
        </ConfirmationModal>

        {/* Toast Notification */}
        {toast.show && (
          <ToastNotification
            show={toast.show}
            message={toast.message}
            type={toast.type}
            onClose={() => setToast({ show: false, message: '', type: 'success' })}
          />
        )}
      </div>
    );
  }

  return (
    <div className="container-fluid p-0 page-module-container">
      <header className="page-header d-flex justify-content-between align-items-center mb-4">
        <div className="d-flex align-items-center">
            <h1 className="page-main-title me-3">Positions</h1>
            <span className="badge bg-secondary-subtle text-secondary-emphasis rounded-pill">
                {positions.length} total positions
            </span>
        </div>
        <div className="header-actions d-flex align-items-center gap-2">
            <button className="btn btn-outline-secondary" onClick={handleGenerateReport} disabled={!positions || positions.length === 0}>
                <i className="bi bi-file-earmark-text-fill"></i> Generate Report
            </button>
            <button className="btn btn-success" onClick={handleOpenAddPositionModal}>
                <i className="bi bi-plus-circle-fill me-2"></i> Add New Position
            </button>
        </div>
      </header>
      
      <div className="controls-bar d-flex justify-content-start mb-4">
        <div className="input-group">
            <span className="input-group-text"><i className="bi bi-search"></i></span>
            <input type="text" className="form-control" placeholder="Search positions by title or description..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
      </div>

      {loadingPositions ? (
        <div className="w-100 text-center p-5 bg-light rounded">
          <div className="spinner-border text-success" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3 mb-0">Loading positions...</p>
        </div>
      ) : (
        <div className="positions-grid-container">
          {filteredPositions.length > 0 ? (
              filteredPositions.map(pos => (
              <div key={pos.id} className="position-card">
                  <div className="position-card-header">
                      <h5 className="position-title">{pos.title}</h5>
                      <div className="dropdown">
                      <button className="btn btn-sm btn-light" type="button" data-bs-toggle="dropdown" aria-expanded="false"><i className="bi bi-three-dots-vertical"></i></button>
                      <ul className="dropdown-menu dropdown-menu-end">
                          <li><a className="dropdown-item" href="#" onClick={(e) => handleOpenEditPositionModal(e, pos)}>Edit</a></li>
                          <li><a className="dropdown-item text-danger" href="#" onClick={(e) => handleDeletePosition(e, pos)}>Delete</a></li>
                      </ul>
                      </div>
                  </div>
                  <div className="card-body">
                      <p className="position-description">{pos.description}</p>
                      <div className="info-row">
                          <span className="label">Employee Count:</span>
                          <span className="value">{employeeCounts[pos.id] || 0}</span>
                      </div>
                      <div className="info-row">
                          <span className="label">Monthly Salary:</span>
                          <span className="value salary">₱ {safeMonthlySalary(pos).toLocaleString()}</span>
                      </div>
                  </div>
                  <div className="position-card-footer">
                      <button className="btn btn-sm btn-outline-secondary" onClick={() => handleViewPositionDetails(pos)}>View Details</button>
                  </div>
              </div>
              ))
          ) : (
              <div className="w-100 text-center p-5 bg-light rounded">
                  <i className="bi bi-diagram-3-fill fs-1 text-muted mb-3 d-block"></i>
                  <h4 className="text-muted">{positions.length > 0 ? "No positions match your search." : "No positions have been created yet."}</h4>
              </div>
          )}
        </div>
      )}

      {showAddEditPositionModal && (
        <AddEditPositionModal show={showAddEditPositionModal} onClose={handleCloseAddEditPositionModal} onSave={handleSavePosition} positionData={editingPosition} submitting={submitting} />
      )}

     {(isLoading || pdfDataUri) && (
        <ReportPreviewModal 
            show={showReportPreview}
            onClose={handleCloseReportPreview}
            pdfDataUri={pdfDataUri}
            reportTitle="Company Positions Report"
        />
      )}

      {/* Delete Position Confirmation Modal */}
      <ConfirmationModal
        show={showDeletePositionModal}
        title="Delete Position"
        onClose={cancelDeletePosition}
        onConfirm={confirmDeletePosition}
        confirmText={isDeletingPosition ? 'Deleting...' : 'Delete'}
        confirmVariant="danger"
        disabled={isDeletingPosition}
      >
        Are you sure you want to delete the position "{positionToDelete?.title}"? This will unassign all employees from this position.
      </ConfirmationModal>

      {/* Remove Employee Confirmation Modal */}
      <ConfirmationModal
        show={showRemoveEmployeeModal}
        title="Remove Employee from Position"
        onClose={cancelRemoveEmployee}
        onConfirm={confirmRemoveEmployee}
        confirmText={isRemovingEmployee ? 'Removing...' : 'Remove'}
        confirmVariant="danger"
        disabled={isRemovingEmployee}
      >
        Are you sure you want to remove "{employeeToRemove?.name}" from their current position?
      </ConfirmationModal>

      {/* Toast Notification */}
      {toast.show && (
        <ToastNotification
          show={toast.show}
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ show: false, message: '', type: 'success' })}
        />
      )}

    </div>
  );
};

export default PositionsPage;
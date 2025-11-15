const toKey = (value) => {
    if (value === undefined || value === null) return null;
    return String(value);
  };

  const normalizeTrainingStatus = (status = '') => {
    const cleaned = status.toString().trim().toLowerCase();
    switch (cleaned) {
      case 'completed':
        return 'Completed';
      case 'in progress':
      case 'in_progress':
        return 'In Progress';
      case 'not started':
      case 'not_started':
        return 'Not Started';
      case 'dropped':
        // No dropped status; map to a safe alternative
        return 'Not Started';
      default:
        return status || 'Not Started';
    }
  };

  const buildEmployeeName = (user = {}) => {
    if (user.name) return user.name;
    const parts = [user.first_name, user.middle_name, user.last_name].filter(Boolean);
    return parts.join(' ').trim() || null;
  };
import React, { useState, useMemo, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import './ProgramDetailPage.css';
import ProgramDetailHeader from './ProgramDetailHeader';
import EnrollEmployeeModal from '../../modals/EnrollEmployeeModal';
import UpdateEnrollmentStatusModal from '../../modals/UpdateEnrollmentStatusModal';
import ReportPreviewModal from '../../modals/ReportPreviewModal';
import ConfirmationModal from '../../modals/ConfirmationModal';
import ToastNotification from '../../common/ToastNotification';
import { trainingAPI, employeeAPI, positionAPI } from '../../services/api';
import useReportGenerator from '../../hooks/useReportGenerator';

const ProgramDetailPage = () => {
  const { programId } = useParams();
  
  // Data state
  const [trainingPrograms, setTrainingPrograms] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState(null);
  
  // Modal state
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingEnrollment, setEditingEnrollment] = useState(null);
  const [enrollmentToDelete, setEnrollmentToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'info' });
  const { generateReport, pdfDataUri, isLoading, setPdfDataUri } = useReportGenerator();
  
  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortConfig, setSortConfig] = useState({ key: 'employeeName', direction: 'ascending' });

  const showToast = (message, type = 'info') => {
    setToast({ show: true, message, type });
  };

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setPageError(null);
        const [programsResponse, enrollmentsResponse, employeesResponse, positionsResponse] = await Promise.all([
          trainingAPI.getAll(),
          trainingAPI.getEnrollments(),
          employeeAPI.getList(),
          positionAPI.getAll()
        ]);
        
        setTrainingPrograms(programsResponse.data || []);
        setEnrollments(enrollmentsResponse.data || []);
        setEmployees(employeesResponse.data || []);
        setPositions(Array.isArray(positionsResponse.data) ? positionsResponse.data : (positionsResponse.data?.data || []));
      } catch (err) {
        console.error('Error fetching training data:', err);
        setPageError('Failed to load training data. Please try again.');
        showToast('Failed to load training data. Please try again.', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const selectedProgram = useMemo(() => {
    if (!trainingPrograms.length) return null;
    return trainingPrograms.find(p => p.id.toString() === programId);
  }, [trainingPrograms, programId]);

  const allowedPositionTitles = useMemo(() => {
    if (!selectedProgram) return [];
    const raw = Array.isArray(selectedProgram.positions_allowed)
      ? selectedProgram.positions_allowed
      : (typeof selectedProgram.positions_allowed === 'string' ? JSON.parse(selectedProgram.positions_allowed || '[]') : []);
    if (!raw || raw.length === 0) return [];
    const map = new Map(positions.map(p => [String(p.id), p.title || p.name || p.position]));
    return raw.map(id => map.get(String(id)) || `Position #${id}`);
  }, [selectedProgram, positions]);

  const enrolledInProgram = useMemo(() => {
    if (!selectedProgram || !enrollments.length) return [];
    const employeeMap = new Map(
      employees.map(e => [toKey(e.id), e.name || buildEmployeeName(e)])
    );
    return enrollments
      .filter(enr => {
        const enrProgramId = toKey(enr.program_id ?? enr.programId ?? enr.program?.id);
        return enr && enrProgramId && enrProgramId === toKey(programId);
      })
      .map(enr => {
        const employeeId = toKey(enr.user_id ?? enr.employee_id ?? enr.employeeId ?? enr.user?.id);
        const employeeName = employeeMap.get(employeeId) || enr.employee_name || enr.employeeName || buildEmployeeName(enr.user) || 'Unknown';
        const progressValue = typeof enr.progress === 'number' ? enr.progress : Number(enr.progress ?? 0) || 0;
        return {
          ...enr,
          employeeName,
          employeeId: employeeId || '',
          enrollmentId: enr.id,
          status: normalizeTrainingStatus(enr.status),
          progress: progressValue,
        };
      });
  }, [selectedProgram, enrollments, employees, programId]);

  const displayedEnrollments = useMemo(() => {
    let filtered = [...enrolledInProgram];
    if (statusFilter !== 'All') { filtered = filtered.filter(enr => enr.status === statusFilter); }
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(enr => 
        enr.employeeName.toLowerCase().includes(lowerSearch) ||
        String(enr.employeeId).toLowerCase().includes(lowerSearch)
      );
    }
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        const valA = a[sortConfig.key] || '';
        const valB = b[sortConfig.key] || '';
        if (sortConfig.key === 'progress') {
            if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
            return 0;
        }
        if (String(valA).toLowerCase() < String(valB).toLowerCase()) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (String(valA).toLowerCase() > String(valB).toLowerCase()) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }
    return filtered;
  }, [enrolledInProgram, searchTerm, statusFilter, sortConfig]);

  // --- UI Enhancements: Summary Stats ---
  const summaryStats = useMemo(() => {
    const total = enrolledInProgram.length;
    const counts = enrolledInProgram.reduce((acc, enr) => {
      const key = (enr.status || 'Not Started');
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    const avgProgress = total > 0
      ? Math.round(enrolledInProgram.reduce((acc, enr) => acc + (enr.progress || 0), 0) / total)
      : 0;
    return {
      total,
      completed: counts['Completed'] || 0,
      inProgress: counts['In Progress'] || 0,
      notStarted: counts['Not Started'] || 0,
      avgProgress,
    };
  }, [enrolledInProgram]);

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') { direction = 'descending'; }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <i className="bi bi-arrow-down-up sort-icon ms-1"></i>;
    return sortConfig.direction === 'ascending' ? <i className="bi bi-sort-up sort-icon active ms-1"></i> : <i className="bi bi-sort-down sort-icon active ms-1"></i>;
  };
  
  // Handler functions
  const handleEnrollEmployee = async (programId, employeeIds) => {
    try {
      // Enroll multiple employees
      const enrollmentPromises = employeeIds.map(userId => 
        trainingAPI.enroll({ 
          program_id: programId, 
          user_id: userId 
        })
      );
      
      const results = await Promise.allSettled(enrollmentPromises);

      const successfulEnrollments = results.filter(result => result.status === 'fulfilled').length;
      const conflictMessages = results
        .filter(result => result.status === 'rejected' && result.reason?.response?.status === 422)
        .map(result => result.reason.response?.data?.message)
        .filter(Boolean);
      const otherErrors = results.filter(result => result.status === 'rejected' && result.reason?.response?.status !== 422);

      if (successfulEnrollments > 0) {
        const successMessage = successfulEnrollments === 1
          ? 'Employee enrolled successfully.'
          : `${successfulEnrollments} employees enrolled successfully.`;
        // Refresh enrollments after enrollment
        const enrollmentsResponse = await trainingAPI.getEnrollments();
        setEnrollments(enrollmentsResponse.data || []);
        setShowEnrollModal(false);
        showToast(successMessage, 'success');
      }

      if (conflictMessages.length > 0) {
        showToast([...new Set(conflictMessages)].join('\n'), 'warning');
      }

      if (otherErrors.length > 0 && successfulEnrollments === 0) {
        showToast('Failed to enroll employee. Please try again.', 'error');
      }
    } catch (err) {
      console.error('Error enrolling employee:', err);
      showToast('Failed to enroll employee. Please try again.', 'error');
    }
  };

  const handleOpenStatusModal = (enrollment) => { 
    setEditingEnrollment(enrollment); 
    setShowStatusModal(true); 
  };
  
  const handleCloseStatusModal = () => { 
    setEditingEnrollment(null); 
    setShowStatusModal(false); 
  };
  
  const handleUpdateStatus = async (enrollmentId, updatedData) => { 
    try {
      // Ensure we have a valid enrollment ID
      if (!enrollmentId) {
        console.error('No enrollment ID provided');
        showToast('Invalid enrollment data. Please try again.', 'error');
        return;
      }
      
      await trainingAPI.updateEnrollment(enrollmentId, updatedData);
      // Refresh enrollments after update
      const enrollmentsResponse = await trainingAPI.getEnrollments();
      setEnrollments(enrollmentsResponse.data || []);
      handleCloseStatusModal();
      showToast('Enrollment status updated successfully.', 'success');
    } catch (err) {
      console.error('Error updating enrollment status:', err);
      showToast('Failed to update enrollment status. Please try again.', 'error');
    }
  };

  const handleDeleteProgram = async () => {
    try {
      const response = await trainingAPI.deleteProgram(programId);
      
      // Check if it's a warning response
      if (response.data.warning) {
        const confirmDelete = window.confirm(
          `This program has ${response.data.enrollment_count} existing enrollment(s). ` +
          'Deleting this program will also permanently remove all associated enrollment records. ' +
          'Are you sure you want to proceed?'
        );
        
        if (confirmDelete) {
          await trainingAPI.forceDeleteProgram(programId);
          // Navigate back to training page after successful deletion
          window.location.href = '/dashboard/training';
        }
      } else {
        // Normal deletion - navigate back
        window.location.href = '/dashboard/training';
      }
    } catch (err) {
      console.error('Error deleting program:', err);
      showToast('Failed to delete program. Please try again.', 'error');
    }
  };

  const handleDeleteEnrollment = async (enrollmentId, employeeName) => {
    setEnrollmentToDelete({ id: enrollmentId, name: employeeName });
    setShowDeleteModal(true);
  };

  const confirmDeleteEnrollment = async () => {
    if (enrollmentToDelete && !isDeleting) {
      try {
        setIsDeleting(true);
        await trainingAPI.unenroll(enrollmentToDelete.id);
        // Refresh enrollments after deletion
        const enrollmentsResponse = await trainingAPI.getEnrollments();
        setEnrollments(enrollmentsResponse.data || []);
        setShowDeleteModal(false);
        setEnrollmentToDelete(null);
        showToast('Employee unenrolled successfully.', 'success');
      } catch (err) {
        console.error('Error deleting enrollment:', err);
        showToast('Failed to unenroll employee. Please try again.', 'error');
        setShowDeleteModal(false);
        setEnrollmentToDelete(null);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const cancelDeleteEnrollment = () => {
    if (!isDeleting) {
      setShowDeleteModal(false);
      setEnrollmentToDelete(null);
    }
  };
  const handleGenerateReport = async () => {
    if (!selectedProgram) {
      showToast('Training program not found.', 'error');
      return;
    }

    if (!displayedEnrollments.length) {
      showToast('No enrollments available to include in this report.', 'warning');
      return;
    }

    const normalizedPrograms = trainingPrograms.map(program => ({
      id: toKey(program.id),
      title: program.title,
      description: program.description ?? '',
      provider: program.provider ?? '',
      status: program.status ?? 'Draft',
      startDate: program.start_date ?? program.startDate ?? null,
      endDate: program.end_date ?? program.endDate ?? null,
      duration: program.duration ?? '',
      location: program.location ?? '',
      type: program.type ?? '',
      maxParticipants: program.max_participants ?? program.maxParticipants ?? null,
    }));

    const normalizedEnrollments = enrollments
      .map(enrollment => {
        const programKey = toKey(enrollment.program_id ?? enrollment.programId ?? enrollment.program?.id);
        const employeeKey = toKey(enrollment.user_id ?? enrollment.employee_id ?? enrollment.employeeId ?? enrollment.user?.id);
        if (!programKey || !employeeKey) {
          return null;
        }
        return {
          id: toKey(enrollment.id),
          programId: programKey,
          employeeId: employeeKey,
          status: normalizeTrainingStatus(enrollment.status),
          progress: typeof enrollment.progress === 'number' ? enrollment.progress : Number(enrollment.progress ?? 0) || 0,
          employeeName: enrollment.employee_name ?? enrollment.employeeName ?? buildEmployeeName(enrollment.user) ?? null,
        };
      })
      .filter(Boolean);

    const employeesMap = new Map(
      (employees || []).map(emp => {
        const idKey = toKey(emp.id);
        const name = emp.name || buildEmployeeName(emp) || 'Employee';
        return [idKey, {
          id: idKey,
          name,
          position: emp.position ?? emp.job_title ?? emp.designation ?? null,
        }];
      })
    );

    normalizedEnrollments.forEach(enrollment => {
      if (!enrollment.employeeId) return;
      if (!employeesMap.has(enrollment.employeeId)) {
        employeesMap.set(enrollment.employeeId, {
          id: enrollment.employeeId,
          name: enrollment.employeeName || 'Employee',
          position: null,
        });
      } else if (enrollment.employeeName && !employeesMap.get(enrollment.employeeId).name) {
        const existing = employeesMap.get(enrollment.employeeId);
        existing.name = enrollment.employeeName;
      }
    });

    try {
      await generateReport(
        'training_program_summary',
        { programId: toKey(programId) },
        {
          trainingPrograms: normalizedPrograms,
          enrollments: normalizedEnrollments,
          employees: Array.from(employeesMap.values()),
        }
      );
      setShowReportModal(true);
    } catch (error) {
      console.error('Error generating training program report:', error);
      showToast('Failed to generate report. Please try again.', 'error');
    }
  };

  const handleCloseReportModal = () => {
    setShowReportModal(false);
    setPdfDataUri('');
  };

  // Loading state
  if (loading) {
    return (
      <div className="container-fluid p-0 page-module-container">
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
          <div className="spinner-border text-success" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (pageError) {
    return (
      <div className="container-fluid p-0 page-module-container">
        <div className="alert alert-danger" role="alert">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          {pageError}
        </div>
        <Link to="/dashboard/training" className="btn btn-primary">
          <i className="bi bi-arrow-left me-2"></i>Back to Training Programs
        </Link>
      </div>
    );
  }

  // Program not found state
  if (!selectedProgram) { 
    return (
      <div className="container-fluid p-0 page-module-container">
        <div className="alert alert-warning" role="alert">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          Training program not found.
        </div>
        <Link to="/dashboard/training" className="btn btn-primary">
          <i className="bi bi-arrow-left me-2"></i>Back to Training Programs
        </Link>
      </div>
    );
  }

  return (
    <div className="container-fluid p-0 page-module-container">
      <ProgramDetailHeader 
        program={selectedProgram}
        enrolledCount={enrolledInProgram.length}
        onGenerateReport={handleGenerateReport}
        onEnrollClick={() => setShowEnrollModal(true)}
        onDeleteClick={handleDeleteProgram}
        isGenerateReportDisabled={displayedEnrollments.length === 0}
      />
      {allowedPositionTitles.length > 0 && (
        <div className="alert alert-info mt-2">
          <i className="bi bi-shield-check me-2"></i>
          Allowed Positions:
          {allowedPositionTitles.map((t, idx) => (
            <span key={idx} className="badge bg-secondary ms-2">{t}</span>
          ))}
        </div>
      )}
      {/* Summary cards moved outside of the data table card */}
      <div className="card shadow-sm mb-3">
        <div className="program-summary-cards">
          <div className="summary-stat-card">
            <div className="stat-icon icon-enrolled"><i className="bi bi-people-fill"></i></div>
            <div className="stat-info">
              <div className="stat-value">{summaryStats.total}</div>
              <div className="stat-label">Enrolled</div>
            </div>
          </div>
          <div className="summary-stat-card">
            <div className="stat-icon icon-progress"><i className="bi bi-speedometer2"></i></div>
            <div className="stat-info">
              <div className="stat-value">{summaryStats.avgProgress}%</div>
              <div className="stat-label">Avg Progress</div>
            </div>
          </div>
          <div className="summary-stat-card">
            <div className="stat-icon icon-completed"><i className="bi bi-check2-circle"></i></div>
            <div className="stat-info">
              <div className="stat-value">{summaryStats.completed}</div>
              <div className="stat-label">Completed</div>
            </div>
          </div>
          <div className="summary-stat-card">
            <div className="stat-icon icon-in-progress"><i className="bi bi-play-circle"></i></div>
            <div className="stat-info">
              <div className="stat-value">{summaryStats.inProgress}</div>
              <div className="stat-label">In Progress</div>
            </div>
          </div>
          <div className="summary-stat-card">
            <div className="stat-icon icon-not-started"><i className="bi bi-hourglass-split"></i></div>
            <div className="stat-info">
              <div className="stat-value">{summaryStats.notStarted}</div>
              <div className="stat-label">Not Started</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card data-table-card shadow-sm">
        <div className="enrollment-table-controls">
            <div className="input-group">
              <span className="input-group-text"><i className="bi bi-search"></i></span>
              <input type="text" className="form-control" placeholder="Search by name or ID..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              {searchTerm && (
                <button className="btn btn-outline-secondary" type="button" onClick={() => setSearchTerm('')}>
                  Clear
                </button>
              )}
            </div>
            <div className="status-pills" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {['All','Completed','In Progress','Not Started'].map(s => (
                <button
                  key={`pill-${s}`}
                  className={`btn btn-sm ${statusFilter === s ? 'btn-success' : 'btn-outline-success'}`}
                  onClick={() => setStatusFilter(s)}
                >
                  {s}
                </button>
              ))}
            </div>
        </div>
        <div className="table-responsive">
          <table className="table data-table mb-0">
            <thead>
                <tr>
                    <th className="sortable" style={{width: '15%'}} onClick={() => requestSort('employeeId')}>Emp ID {getSortIcon('employeeId')}</th>
                    <th className="sortable" onClick={() => requestSort('employeeName')}>Employee Name {getSortIcon('employeeName')}</th>
                    <th className="sortable" style={{width: '20%'}} onClick={() => requestSort('progress')}>Progress {getSortIcon('progress')}</th>
                    <th style={{width: '15%'}}>Status</th>
                    <th className="text-center" style={{width: '20%'}}>Actions</th>
                </tr>
            </thead>
            <tbody>
              {displayedEnrollments.map(enr => (
                <tr key={`enrollment-${enr.id}`}>
                  <td>{enr.employeeId}</td>
                  <td>{enr.employeeName}</td>
                  <td>
                    <div className="progress-bar-cell">
                      <div className="progress flex-grow-1" style={{ height: '12px' }}>
                        <div
                          className={`progress-bar ${
                            (enr.progress || 0) > 50
                              ? 'bg-success'
                              : (enr.progress || 0) > 20
                              ? 'bg-warning'
                              : 'bg-danger'
                          }`}
                          style={{ width: `${enr.progress || 0}%` }}
                        ></div>
                      </div>
                      <span className="progress-text">{enr.progress || 0}%</span>
                    </div>
                  </td>
                  <td>
                    {(() => {
                      const statusClass =
                        enr.status === 'Completed' ? 'status-completed' :
                        enr.status === 'In Progress' ? 'status-in-progress' :
                        'status-not-started';
                      return (
                        <span className={`enrollment-status-badge ${statusClass}`}>{enr.status}</span>
                      );
                    })()}
                  </td>
                  <td className="text-center">
                    <button className="btn btn-sm btn-outline-danger" onClick={() => handleDeleteEnrollment(enr.id, enr.employeeName)}>Remove</button>
                  </td>
                </tr>
              ))}
              {displayedEnrollments.length === 0 && (<tr><td colSpan="5" className="text-center p-5">No enrollments match your criteria.</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>

      {isLoading && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-body text-center p-4">
                <div className="spinner-border text-success mb-3" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <h4>Generating Report...</h4>
              </div>
            </div>
          </div>
        </div>
      )}

      <EnrollEmployeeModal 
        show={showEnrollModal} 
        onClose={() => setShowEnrollModal(false)} 
        onEnroll={handleEnrollEmployee} 
        program={selectedProgram} 
        allEmployees={employees} 
        existingEnrollments={enrolledInProgram} 
      />
      {editingEnrollment && <UpdateEnrollmentStatusModal show={showStatusModal} onClose={handleCloseStatusModal} onSave={handleUpdateStatus} enrollmentData={editingEnrollment} />}
      
      <ReportPreviewModal
        show={showReportModal && !!pdfDataUri}
        onClose={handleCloseReportModal}
        pdfDataUri={pdfDataUri}
        reportTitle={`Training Report - ${selectedProgram.title}`}
      />

      <ConfirmationModal
        show={showDeleteModal}
        onClose={cancelDeleteEnrollment}
        onConfirm={confirmDeleteEnrollment}
        title="Unenroll Employee"
        confirmText={isDeleting ? 'Unenrolling...' : 'Unenroll'}
        confirmVariant="danger"
        disabled={isDeleting}
      >
        {enrollmentToDelete && (
          <>
            <p>Are you sure you want to unenroll <strong>{enrollmentToDelete.name}</strong> from this program?</p>
            <p className="text-danger">This action cannot be undone.</p>
          </>
        )}
      </ConfirmationModal>

      {toast.show && (
        <ToastNotification
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(prev => ({ ...prev, show: false }))}
        />
      )}
    </div>
  );
};

export default ProgramDetailPage;

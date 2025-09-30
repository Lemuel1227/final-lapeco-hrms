import React, { useState, useMemo, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import './ProgramDetailPage.css';
import ProgramDetailHeader from './ProgramDetailHeader';
import EnrollEmployeeModal from '../../modals/EnrollEmployeeModal';
import UpdateEnrollmentStatusModal from '../../modals/UpdateEnrollmentStatusModal';
import ReportPreviewModal from '../../modals/ReportPreviewModal';
import ConfirmationModal from '../../modals/ConfirmationModal';
import { trainingAPI } from '../../services/api';
import logo from '../../assets/logo.png';

const ProgramDetailPage = () => {
  const { programId } = useParams();
  
  // Data state
  const [trainingPrograms, setTrainingPrograms] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Modal state
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [pdfDataUri, setPdfDataUri] = useState('');
  const [editingEnrollment, setEditingEnrollment] = useState(null);
  const [enrollmentToDelete, setEnrollmentToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortConfig, setSortConfig] = useState({ key: 'employeeName', direction: 'ascending' });

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [programsResponse, enrollmentsResponse] = await Promise.all([
          trainingAPI.getAll(),
          trainingAPI.getEnrollments()
        ]);
        
        setTrainingPrograms(programsResponse.data || []);
        setEnrollments(enrollmentsResponse.data || []);
        
        // For now, we'll create a mock employees array from enrollments
        // In a real app, you'd fetch this from a users/employees API
        const uniqueEmployees = enrollmentsResponse.data?.reduce((acc, enrollment) => {
          if (!acc.find(emp => emp.id === enrollment.user_id)) {
            acc.push({
              id: enrollment.user_id,
              name: enrollment.user?.name || `User ${enrollment.user_id}`
            });
          }
          return acc;
        }, []) || [];
        
        setEmployees(uniqueEmployees);
      } catch (err) {
        console.error('Error fetching training data:', err);
        setError('Failed to load training data. Please try again.');
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

  const enrolledInProgram = useMemo(() => {
    if (!selectedProgram || !enrollments.length) return [];
    const employeeMap = new Map(employees.map(e => [e.id, e.name]));
    return enrollments
      .filter(enr => enr && enr.program_id && enr.program_id.toString() === programId)
      .map(enr => ({ 
        ...enr, 
        employeeName: employeeMap.get(enr.user_id) || enr.user?.name || 'Unknown',
        employeeId: enr.user_id,
        enrollmentId: enr.id // Add enrollmentId for the modal
      }));
  }, [selectedProgram, enrollments, employees, programId]);

  const displayedEnrollments = useMemo(() => {
    let filtered = [...enrolledInProgram];
    if (statusFilter !== 'All') { filtered = filtered.filter(enr => enr.status === statusFilter); }
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(enr => 
        enr.employeeName.toLowerCase().includes(lowerSearch) ||
        enr.employeeId.toLowerCase().includes(lowerSearch)
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
  const handleEnrollEmployee = async (employeeId) => {
    try {
      await trainingAPI.enrollEmployee(programId, { user_id: employeeId });
      // Refresh enrollments after enrollment
      const enrollmentsResponse = await trainingAPI.getEnrollments();
      setEnrollments(enrollmentsResponse.data || []);
      setShowEnrollModal(false);
    } catch (err) {
      console.error('Error enrolling employee:', err);
      setError('Failed to enroll employee. Please try again.');
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
        setError('Invalid enrollment data. Please try again.');
        return;
      }
      
      await trainingAPI.updateEnrollment(enrollmentId, updatedData);
      // Refresh enrollments after update
      const enrollmentsResponse = await trainingAPI.getEnrollments();
      setEnrollments(enrollmentsResponse.data || []);
      handleCloseStatusModal();
    } catch (err) {
      console.error('Error updating enrollment status:', err);
      setError('Failed to update enrollment status. Please try again.');
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
      setError('Failed to delete program. Please try again.');
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
      } catch (err) {
        console.error('Error deleting enrollment:', err);
        setError('Failed to unenroll employee. Please try again.');
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
  const handleGenerateReport = () => {
    const doc = new jsPDF();

    // Header
    doc.addImage(logo, 'PNG', 15, 12, 40, 13);
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text('Training Program Report', pageW - 15, 25, { align: 'right' });
    doc.setLineWidth(0.5);
    doc.line(15, 32, pageW - 15, 32);

    // Program Details
    doc.setFontSize(14);
    doc.text(selectedProgram.title, 15, 45);
    doc.setFontSize(10);
    doc.setTextColor(108, 117, 125);
    doc.text(`Provider: ${selectedProgram.provider}`, 15, 52);
    doc.text(`Duration: ${selectedProgram.duration}`, 15, 58);
    
    // Participant Table
    const tableBody = displayedEnrollments.map(enr => [
        enr.employeeId,
        enr.employeeName,
        `${enr.progress || 0}%`,
        enr.status,
    ]);

    autoTable(doc, {
        head: [['Employee ID', 'Employee Name', 'Progress', 'Status']],
        body: tableBody,
        startY: 70,
        theme: 'striped',
        headStyles: { fillColor: '#343a40' },
    });

    const pdfBlob = doc.output('blob');
    const url = URL.createObjectURL(pdfBlob);
    setPdfDataUri(url);
    setShowReportModal(true);
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
  if (error) {
    return (
      <div className="container-fluid p-0 page-module-container">
        <div className="alert alert-danger" role="alert">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          {error}
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
        onEnrollEmployees={() => setShowEnrollModal(true)}
        onDeleteClick={handleDeleteProgram}
        isGenerateReportDisabled={displayedEnrollments.length === 0}
      />

      <div className="card data-table-card shadow-sm">
        <div className="enrollment-table-controls">
            <div className="input-group"><span className="input-group-text"><i className="bi bi-search"></i></span><input type="text" className="form-control" placeholder="Search by name or ID..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
            <div className="d-flex align-items-center">
                <label className="form-label me-2 mb-0">Status:</label>
                <select className="form-select form-select-sm" style={{width: '180px'}} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                    <option value="All">All</option><option value="Completed">Completed</option><option value="In Progress">In Progress</option><option value="Not Started">Not Started</option>
                </select>
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
                  <td><div className="progress-bar-cell"><div className="progress-bar-container"><div className="progress-bar-fill" style={{ width: `${enr.progress || 0}%` }}></div></div><span className="progress-text">{enr.progress || 0}%</span></div></td>
                  <td><span className={`enrollment-status-badge status-${enr.status.replace(/\s+/g, '-').toLowerCase()}`}>{enr.status}</span></td>
                  <td className="text-center">
                    <button className="btn btn-sm btn-outline-secondary me-2" onClick={() => handleOpenStatusModal(enr)}>Update</button>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => handleDeleteEnrollment(enr.id, enr.employeeName)}>Remove</button>
                  </td>
                </tr>
              ))}
              {displayedEnrollments.length === 0 && (<tr><td colSpan="5" className="text-center p-5">No enrollments match your criteria.</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>

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
        show={showReportModal}
        onClose={() => setShowReportModal(false)}
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
    </div>
  );
};

export default ProgramDetailPage;
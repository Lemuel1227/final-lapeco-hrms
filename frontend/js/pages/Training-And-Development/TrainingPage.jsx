import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './TrainingPage.css';
import AddEditProgramModal from '../../modals/AddEditProgramModal';
import ConfirmationModal from '../../modals/ConfirmationModal';
import { trainingAPI } from '../../services/api';

const TrainingPage = () => {
  const [trainingPrograms, setTrainingPrograms] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showProgramModal, setShowProgramModal] = useState(false);
  const [editingProgram, setEditingProgram] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [programToDelete, setProgramToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch data from API on component mount
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
      } catch (err) {
        console.error('Error fetching training data:', err);
        setError('Failed to load training data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const programStats = useMemo(() => {
    const activeProgramIds = new Set(enrollments.filter(e => e.status === 'enrolled' || e.status === 'in_progress').map(e => e.program_id));
    return {
      totalPrograms: trainingPrograms.length,
      activePrograms: trainingPrograms.filter(p => p.status === 'Active').length,
      totalEnrolled: new Set(enrollments.map(e => e.user_id)).size,
    };
  }, [trainingPrograms, enrollments]);

  const programsWithStats = useMemo(() => {
    return trainingPrograms.map(prog => {
      const relevantEnrollments = enrollments.filter(e => e.program_id === prog.id);
      const enrolledCount = relevantEnrollments.length;
      const completedCount = relevantEnrollments.filter(e => e.status === 'completed').length;
      const completionRate = enrolledCount > 0 ? (completedCount / enrolledCount) * 100 : 0;
      return { ...prog, enrolledCount, completionRate };
    });
  }, [trainingPrograms, enrollments]);

  const filteredPrograms = useMemo(() => {
    if (!searchTerm) return programsWithStats;
    const lowerSearch = searchTerm.toLowerCase();
    return programsWithStats.filter(p => p.title.toLowerCase().includes(lowerSearch) || p.provider.toLowerCase().includes(lowerSearch));
  }, [programsWithStats, searchTerm]);

  const handleOpenProgramModal = (program = null) => { setEditingProgram(program); setShowProgramModal(true); };
  const handleCloseProgramModal = () => { setEditingProgram(null); setShowProgramModal(false); };
  
  const handleSaveProgram = async (formData, programId) => {
    try {
      if (programId) {
        // Update existing program
        await trainingAPI.updateProgram(programId, formData);
      } else {
        // Create new program
        await trainingAPI.createProgram(formData);
      }
      
      // Refresh data after save
      const [programsResponse, enrollmentsResponse] = await Promise.all([
        trainingAPI.getAll(),
        trainingAPI.getEnrollments()
      ]);
      
      setTrainingPrograms(programsResponse.data || []);
      setEnrollments(enrollmentsResponse.data || []);
      handleCloseProgramModal();
    } catch (err) {
      console.error('Error saving program:', err);
      setError('Failed to save program. Please try again.');
    }
  };

  const handleDeleteProgram = (program) => {
    setProgramToDelete(program);
    setShowDeleteModal(true);
  };

  const confirmDeleteProgram = async () => {
    if (programToDelete && !isDeleting) {
      try {
        setIsDeleting(true);
        await trainingAPI.deleteProgram(programToDelete.id);
        
        // Refresh data after deletion
        const [programsResponse, enrollmentsResponse] = await Promise.all([
          trainingAPI.getAll(),
          trainingAPI.getEnrollments()
        ]);
        
        setTrainingPrograms(programsResponse.data || []);
        setEnrollments(enrollmentsResponse.data || []);
        setShowDeleteModal(false);
        setProgramToDelete(null);
      } catch (err) {
        console.error('Error deleting program:', err);
        if (err.response?.status === 422) {
          setError('Cannot delete program with existing enrollments.');
        } else {
          setError('Failed to delete program. Please try again.');
        }
        setShowDeleteModal(false);
        setProgramToDelete(null);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const cancelDeleteProgram = () => {
    if (!isDeleting) {
      setShowDeleteModal(false);
      setProgramToDelete(null);
    }
  };

  return (
    <div className="container-fluid p-0 page-module-container">
      <header className="page-header d-flex justify-content-between align-items-center mb-4">
        <h1 className="page-main-title">Training & Development</h1>
        <button className="btn btn-success" onClick={() => handleOpenProgramModal()}><i className="bi bi-plus-circle-fill me-2"></i>New Program</button>
      </header>

      {loading && (
        <div className="text-center p-5">
          <div className="spinner-border text-success" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3 text-muted">Loading training data...</p>
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

      {!loading && !error && (
        <>
      
      <div className="training-stats-bar">
        <div className="training-stat-card"><div className="stat-icon total-programs"><i className="bi bi-journal-album"></i></div><div><span className="stat-value">{programStats.totalPrograms}</span><span className="stat-label">Total Programs</span></div></div>
        <div className="training-stat-card"><div className="stat-icon active-programs"><i className="bi bi-activity"></i></div><div><span className="stat-value">{programStats.activePrograms}</span><span className="stat-label">Active Programs</span></div></div>
        <div className="training-stat-card"><div className="stat-icon total-enrolled"><i className="bi bi-people-fill"></i></div><div><span className="stat-value">{programStats.totalEnrolled}</span><span className="stat-label">Total Enrolled</span></div></div>
      </div>
      
      <div className="card data-table-card shadow-sm">
        <div className="card-header d-flex justify-content-between align-items-center">
            <span>All Programs</span>
            <div className="input-group" style={{maxWidth: '350px'}}>
                <span className="input-group-text"><i className="bi bi-search"></i></span>
                <input type="text" className="form-control" placeholder="Search programs..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
        </div>
        <div className="table-responsive">
          <table className="table data-table mb-0">
            <thead>
              <tr>
                <th>Program Title</th>
                <th>Provider</th>
                <th>Status</th>
                <th>Enrolled</th>
                <th style={{ width: '20%' }}>Completion</th>
                <th className="text-center" style={{ width: '200px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPrograms.map(prog => (
                <tr key={prog.id}>
                  <td>{prog.title}</td>
                  <td>{prog.provider}</td>
                  <td>
                    <span className={`badge ${prog.status === 'Active' ? 'bg-success' : 'bg-secondary'}`}>
                      {prog.status || 'N/A'}
                    </span>
                  </td>
                  <td>{prog.enrolledCount}</td>
                  <td>
                    <div className="d-flex align-items-center">
                      <div className="progress-bar-container"><div className="progress-bar-fill" style={{ width: `${prog.completionRate}%` }}></div></div>
                      <span className="progress-text">{prog.completionRate.toFixed(0)}%</span>
                    </div>
                  </td>
                  <td className="text-center">
                    <div className="btn-group" role="group">
                      <Link to={`/dashboard/training/${prog.id}`} className="btn btn-sm btn-outline-primary">
                        <i className="bi bi-eye me-1"></i>
                      </Link>
                      <button 
                        className="btn btn-sm btn-outline-secondary" 
                        onClick={() => handleOpenProgramModal(prog)}
                        title="Edit Program"
                      >
                        <i className="bi bi-pencil me-1"></i>
                      </button>
                      <button 
                        className="btn btn-sm btn-outline-danger" 
                        onClick={() => handleDeleteProgram(prog)}
                        title="Delete Program"
                      >
                        <i className="bi bi-trash me-1"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredPrograms.length === 0 && (<tr><td colSpan="7" className="text-center p-5">No training programs found.</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>
      <AddEditProgramModal show={showProgramModal} onClose={handleCloseProgramModal} onSave={handleSaveProgram} programData={editingProgram} />
      
      <ConfirmationModal
        show={showDeleteModal}
        title="Delete Training Program"
        onClose={cancelDeleteProgram}
        onConfirm={confirmDeleteProgram}
        confirmText={isDeleting ? 'Deleting...' : 'Delete'}
        confirmVariant="danger"
        disabled={isDeleting}
      >
        Are you sure you want to delete the training program <strong>"{programToDelete?.title}"</strong>? This action cannot be undone.
      </ConfirmationModal>
        </>
      )}
    </div>
  );
};

export default TrainingPage;
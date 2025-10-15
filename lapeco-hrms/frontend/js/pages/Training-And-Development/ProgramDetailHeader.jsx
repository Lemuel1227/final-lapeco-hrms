import React from 'react';
import { Link } from 'react-router-dom';

const ProgramDetailHeader = ({ program, enrolledCount, onGenerateReport, onEnrollClick, onDeleteClick }) => {
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <header className="program-detail-header">
      <Link to="/dashboard/training" className="btn btn-light me-3 back-button mb-3">
        <i className="bi bi-arrow-left"></i> Back to Programs
      </Link>
      <div className="row align-items-start">
        <div className="col-md-6">
          <div className="program-title-section">
            <h1 className="page-main-title mb-0">{program.title}</h1>
            <p className="page-subtitle">{program.provider}</p>
          </div>
        </div>
        <div className="col-md-6">
          <div className="d-flex gap-2 justify-content-md-end">
            <button className="btn btn-outline-secondary" onClick={onGenerateReport} disabled={enrolledCount === 0}>
              <i className="bi bi-file-earmark-text-fill me-2"></i>Generate Report
            </button>
            <button className="btn btn-success" onClick={onEnrollClick}>
              <i className="bi bi-person-plus-fill me-2"></i>Enroll Employees
            </button>
          </div>
        </div>
      </div>
      <div className="program-details-section mt-3">
        <div className="program-meta">
          <span className="meta-item"><i className="bi bi-clock-fill"></i>{program.duration || 'N/A'}</span>
          <span className="meta-item"><i className="bi bi-people-fill"></i>{enrolledCount} Enrolled</span>
          <span className="meta-item"><i className="bi bi-calendar-event"></i>{formatDate(program.start_date)} - {formatDate(program.end_date)}</span>
          <span className="meta-item">
            <i className="bi bi-circle-fill me-1" style={{color: program.status === 'Active' ? '#28a745' : '#6c757d'}}></i>
            {program.status || 'N/A'}
          </span>
          {program.cost && <span className="meta-item"><i className="bi bi-currency-dollar"></i>{program.cost}</span>}
          {program.location && <span className="meta-item"><i className="bi bi-geo-alt-fill"></i>{program.location}</span>}
          {program.type && <span className="meta-item"><i className="bi bi-tag-fill"></i>{program.type}</span>}
          {program.max_participants && <span className="meta-item"><i className="bi bi-person-lines-fill"></i>Max: {program.max_participants}</span>}
        </div>
        {(program.description || program.requirements) && (
          <div className="row mt-3">
            {program.description && (
              <div className="col-md-6">
                <div className="program-description">
                  <h6 className="fw-bold mb-2">Description</h6>
                  <p className="text-muted mb-2">{program.description}</p>
                </div>
              </div>
            )}
            {program.requirements && (
              <div className="col-md-6">
                <div className="program-requirements">
                  <h6 className="fw-bold mb-2">Requirements</h6>
                  <p className="text-muted mb-0">{program.requirements}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

export default ProgramDetailHeader;
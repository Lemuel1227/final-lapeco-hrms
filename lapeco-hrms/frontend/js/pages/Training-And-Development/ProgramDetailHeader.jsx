import React from 'react';
import { Link } from 'react-router-dom';

const ProgramDetailHeader = ({ program, enrolledCount, onGenerateReport, onEnrollClick, onDeleteClick }) => {
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  // Extract "Required Days" from multiple supported duration formats.
  // Supported examples:
  // - "5 hours per day; Required Days: 12"
  // - "Daily: 3 hours; Period: 12 days"
  // - Legacy: "12 days, 3 hours per day" or "2 months, 4 hours"
  const getRequiredDays = () => {
    const duration = (program.duration || '').trim();
    if (!duration) return null;

    // Preferred explicit pattern
    const explicit = duration.match(/Required\s*Days:\s*(\d+)/i);
    if (explicit && explicit[1]) {
      const v = parseInt(explicit[1], 10);
      return Number.isFinite(v) && v > 0 ? v : null;
    }

    // Period pattern (days or months)
    const period = duration.match(/Period:\s*(\d+)\s*(day|days|month|months)/i)
                || duration.match(/(\d+)\s*(day|days|month|months)/i);
    if (period && period[1] && period[2]) {
      const value = parseInt(period[1], 10);
      const unit = String(period[2]).toLowerCase();
      if (!Number.isFinite(value) || value <= 0) return null;
      return unit.startsWith('month') ? value * 30 : value;
    }

    return null;
  };

  // Extract daily time string from duration.
  // Supports: "Daily: 3 hours 30 minutes", or "5 hours per day".
  const getDailyTime = () => {
    const duration = (program.duration || '').trim();
    if (!duration) return null;

    // Try to find explicit "Daily:" label first
    const dailyLabel = duration.match(/Daily:\s*([^;]+)/i);
    if (dailyLabel && dailyLabel[1]) {
      const text = dailyLabel[1].trim();
      if (text) return text.endsWith('per day') ? text : `${text} per day`;
    }

    // Generic extraction of hours/minutes before "per day" or anywhere
    const hours = duration.match(/(\d+)\s*(?:hour|hours)/i);
    const minutes = duration.match(/(\d+)\s*(?:minute|minutes)/i);
    const parts = [];
    if (hours && hours[1]) parts.push(`${parseInt(hours[1], 10)} ${parseInt(hours[1], 10) === 1 ? 'hour' : 'hours'}`);
    if (minutes && minutes[1]) parts.push(`${parseInt(minutes[1], 10)} ${parseInt(minutes[1], 10) === 1 ? 'minute' : 'minutes'}`);
    if (!parts.length) return null;
    return `${parts.join(' ')} per day`;
  };

  return (
    <header className="program-detail-header">
      <Link to="/dashboard/training" className="btn btn-light me-3 btn-success back-button mb-3">
        <i className="bi bi-arrow-left"></i> Back to Programs
      </Link>
      <div className="row align-items-start">
        <div className="col-md-6">
          <div className="program-title-section">
            <h1 className="page-main-title mb-0">{program.title}</h1>
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
        {(program.description || program.requirements) && (
          <div className="info-grid mt-3">
            {program.description && (
              <div className="info-card">
                <div className="info-header">
                  <div className="info-icon bg-light"><i className="bi bi-journal-text"></i></div>
                  <h6 className="info-title">Description</h6>
                </div>
                <p className="info-text">{program.description}</p>
              </div>
            )}
            {program.requirements && (
              <div className="info-card">
                <div className="info-header">
                  <div className="info-icon bg-light"><i className="bi bi-list-check"></i></div>
                  <h6 className="info-title">Requirements</h6>
                </div>
                <p className="info-text">{program.requirements}</p>
              </div>
            )}
          </div>
        )}
        {/* Meta badges moved below description/requirements */}
        <div className="program-meta mt-3">
          <span className="meta-item"><i className="bi bi-clock-fill"></i>{getDailyTime() || 'N/A'}</span>
          <span className="meta-item">
            <i className="bi bi-circle-fill me-1" style={{color: program.status === 'Active' ? '#28a745' : '#6c757d'}}></i>
            {program.status || 'N/A'}
          </span>
          {(() => {
            const days = getRequiredDays();
            return (
              <span className="meta-item"><i className="bi bi-calendar-check"></i>Required Days: {days ? `${days}` : 'N/A'}</span>
            );
          })()}
          {program.location && <span className="meta-item"><i className="bi bi-geo-alt-fill"></i>{program.location}</span>}
          {program.type && <span className="meta-item"><i className="bi bi-tag-fill"></i>{program.type}</span>}
          {program.max_participants && <span className="meta-item"><i className="bi bi-person-lines-fill"></i>Max: {program.max_participants}</span>}
        </div>

        {/* No fixed calendar period; showing required days instead */}
      </div>
    </header>
  );
};

export default ProgramDetailHeader;
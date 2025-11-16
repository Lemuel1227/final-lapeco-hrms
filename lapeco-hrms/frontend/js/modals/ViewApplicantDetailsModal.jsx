import React, { useState, useEffect } from 'react';
import './ViewApplicantDetailsModal.css';
import './AddEditEmployeeModal.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import placeholderImage from '../assets/placeholder-profile.jpg';
import ResumeIframe from '../common/ResumeIframe';
import { applicantAPI } from '../services/api';

const calculateAge = (birthdate) => {
    if (!birthdate) return 'N/A';
    const ageDifMs = Date.now() - new Date(birthdate).getTime();
    const ageDate = new Date(ageDifMs);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
};

const formatDate = (dateString) => {
    if (!dateString) return 'Not Set';
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
    });
};

const ViewApplicantDetailsModal = ({ applicant, show, onClose, jobTitle, onViewResume, onToast }) => {
  const [activeTab, setActiveTab] = useState('personal');
  const [fullApplicantData, setFullApplicantData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [resumeBlobUrl, setResumeBlobUrl] = useState(null);
  const [resumeLoading, setResumeLoading] = useState(false);
  const [resumeError, setResumeError] = useState(null);

  useEffect(() => {
    if (!show) {
      setActiveTab('personal');
      setFullApplicantData(null);
      setResumeLoading(false);
      setResumeError(null);
      setResumeBlobUrl(prev => {
        if (prev) {
          window.URL.revokeObjectURL(prev);
        }
        return null;
      });
    }
  }, [show]);

  useEffect(() => {
    if (!show) return;

    setActiveTab('personal');
    setResumeLoading(false);
    setResumeError(null);
    setResumeBlobUrl(prev => {
      if (prev) {
        window.URL.revokeObjectURL(prev);
      }
      return null;
    });
  }, [applicant?.id, show]);

  useEffect(() => () => {
    if (resumeBlobUrl) {
      window.URL.revokeObjectURL(resumeBlobUrl);
    }
  }, [resumeBlobUrl]);

  // Fetch full applicant details when modal opens
  useEffect(() => {
    const fetchFullApplicantData = async () => {
      if (show && applicant?.id) {
        setLoading(true);
        setError(null);
        try {
          const response = await applicantAPI.getById(applicant.id);
          setFullApplicantData(response.data);
        } catch (err) {
          console.error('Error fetching full applicant data:', err);
          setError('Failed to load applicant details');
          // Fallback to summary data if full data fails
          setFullApplicantData(applicant);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchFullApplicantData();
  }, [show, applicant?.id]);

  if (!show || !applicant) {
    return null;
  }

  // Use full data if available, otherwise use summary data
  const displayData = fullApplicantData || applicant;
  const age = calculateAge(displayData.birthday);

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div className="modal-dialog modal-dialog-centered modal-xl">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">View Applicant Details</h5>
            <button type="button" className="btn-close" onClick={onClose} aria-label="Close"></button>
          </div>
          <div className="modal-body employee-form-modal-body">
            <div className="employee-form-container">
              <div className="employee-form-left-column">
                {loading && (
                  <div className="text-center p-3">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="mt-2 mb-0">Loading details...</p>
                  </div>
                )}
                {error && (
                  <div className="alert alert-warning" role="alert">
                    <i className="bi bi-exclamation-triangle me-2"></i>
                    {error}
                  </div>
                )}
                <div className="employee-profile-img-container">
                  <img 
                    src={displayData.profile_picture_url || placeholderImage} 
                    alt={`${displayData.full_name || displayData.name}'s profile`} 
                    className="employee-profile-img-form"
                    onError={(e) => {
                      e.target.src = placeholderImage;
                    }}
                  />
                </div>
                <h4 className="applicant-profile-name">{displayData.full_name || displayData.name}</h4>
                <p className="profile-job-title">{jobTitle}</p>
                <span className={`applicant-status-badge status-${displayData.status.replace(/\s+/g, '-').toLowerCase()}`}>{displayData.status}</span>
                <div className="profile-key-info">
                    <div className="info-item"><i className="bi bi-envelope-fill"></i><a href={`mailto:${displayData.email}`}>{displayData.email}</a></div>
                    <div className="info-item"><i className="bi bi-telephone-fill"></i><span>{displayData.phone || 'N/A'}</span></div>
                    <div className="info-item"><i className="bi bi-calendar-plus-fill"></i><span>Applied: {formatDate(displayData.application_date)}</span></div>
                    <div className="info-item"><i className="bi bi-calendar-check-fill"></i><span>Interview: {displayData.interview_schedule ? `${formatDate(displayData.interview_schedule.date)} at ${displayData.interview_schedule.time}` : 'Not Scheduled'}</span></div>
                </div>
                {displayData.resume_file && (
                  <div className="d-flex flex-column gap-2">
                    <button
                      type="button"
                      className="btn btn-primary btn-resume"
                      onClick={async () => {
                        try {
                          const blob = await applicantAPI.viewResume(displayData.id);
                          const url = window.URL.createObjectURL(blob);
                          window.open(url, '_blank');
                        } catch (error) {
                          console.error('Error viewing resume:', error);
                          const errorMessage = error.response?.data?.message || 'Failed to load resume';
                          onToast({ show: true, message: errorMessage, type: 'error' });
                        }
                      }}
                    >
                      <i className="bi bi-file-earmark-text-fill me-2"></i>View Resume
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-primary btn-resume"
                      onClick={async () => {
                        try {
                          await applicantAPI.downloadResume(
                            displayData.id, 
                            `resume_${displayData.full_name || displayData.name}.pdf`
                          );
                          onToast({ show: true, message: 'Resume downloaded successfully', type: 'success' });
                        } catch (error) {
                          console.error('Error downloading resume:', error);
                          const errorMessage = error.response?.data?.message || 'Failed to download resume';
                          onToast({ show: true, message: errorMessage, type: 'error' });
                        }
                      }}
                    >
                      <i className="bi bi-download me-2"></i>Download Resume
                    </button>
                  </div>
                )}
                {!displayData.resume_file && (
                  <div className="alert alert-info mt-3" role="alert">
                    <i className="bi bi-info-circle me-2"></i>
                    No resume uploaded
                  </div>
                )}
              </div>
              <div className="employee-form-right-column">
                <ul className="nav nav-tabs">
                  <li className="nav-item"><button type="button" className={`nav-link ${activeTab === 'personal' ? 'active' : ''}`} onClick={() => setActiveTab('personal')}>Personal Details</button></li>
                  <li className="nav-item"><button type="button" className={`nav-link ${activeTab === 'government' ? 'active' : ''}`} onClick={() => setActiveTab('government')}>Government Requirements</button></li>
                  <li className="nav-item"><button type="button" className={`nav-link ${activeTab === 'resume' ? 'active' : ''}`} onClick={async () => {
                    setActiveTab('resume');
                    if (displayData.resume_file && !resumeBlobUrl) {
                      setResumeError(null);
                      setResumeLoading(true);
                      try {
                        const blob = await applicantAPI.viewResume(displayData.id);
                        const url = window.URL.createObjectURL(blob);
                        setResumeBlobUrl(prev => {
                          if (prev) {
                            window.URL.revokeObjectURL(prev);
                          }
                          return url;
                        });
                      } catch (resumeFetchError) {
                        console.error('Error loading resume preview:', resumeFetchError);
                        setResumeBlobUrl(prev => {
                          if (prev) {
                            window.URL.revokeObjectURL(prev);
                          }
                          return null;
                        });
                        const message = resumeFetchError?.response?.data?.message || 'Resume not available for this applicant.';
                        setResumeError(message);
                      } finally {
                        setResumeLoading(false);
                      }
                    }
                  }}>Resume</button></li>
                </ul>
                <div className="tab-content">
                  {activeTab === 'personal' && (
                    <div>
                      <div className="info-card">
                        <div className="details-grid">
                          <div className="detail-group details-span-2"><p className="detail-label">Applied For</p><p className="detail-value">{jobTitle || displayData.applied_for || displayData.applied_position || 'N/A'}</p></div>
                        </div>
                        <div className="details-grid-3">
                          <div className="detail-group"><p className="detail-label">First Name</p><p className="detail-value">{displayData.first_name || 'N/A'}</p></div>
                          <div className="detail-group"><p className="detail-label">Middle Name</p><p className="detail-value">{displayData.middle_name || 'N/A'}</p></div>
                          <div className="detail-group"><p className="detail-label">Last Name</p><p className="detail-value">{displayData.last_name || 'N/A'}</p></div>
                        </div>
                        <div className="details-grid mt-3">
                          <div className="detail-group"><p className="detail-label">Gender</p><p className="detail-value">{displayData.gender || 'N/A'}</p></div>
                          <div className="detail-group"><p className="detail-label">Age</p><p className="detail-value">{age}</p></div>
                          <div className="detail-group"><p className="detail-label">Birthday</p><p className="detail-value">{formatDate(displayData.birthday)}</p></div>
                          <div className="detail-group"><p className="detail-label">Email</p><p className="detail-value">{displayData.email || 'N/A'}</p></div>
                        </div>
                        <div className="details-grid mt-3">
                          <div className="detail-group"><p className="detail-label">Phone</p><p className="detail-value">{displayData.phone || 'N/A'}</p></div>
                          <div className="detail-group details-span-2"><p className="detail-label">Address</p><p className="detail-value">{displayData.address || 'N/A'}</p></div>
                        </div>
                      </div>
                    </div>
                  )}
                  {activeTab === 'government' && (
                    <div>
                      <div className="row g-4">
                        <div className="col-md-6 detail-group"><p className="detail-label">SSS No.</p><p className="detail-value">{displayData.sss_no || 'N/A'}</p></div>
                        <div className="col-md-6 detail-group"><p className="detail-label">TIN No.</p><p className="detail-value">{displayData.tin_no || 'N/A'}</p></div>
                        <div className="col-md-6 detail-group"><p className="detail-label">Pag-IBIG No.</p><p className="detail-value">{displayData.pag_ibig_no || 'N/A'}</p></div>
                        <div className="col-md-6 detail-group"><p className="detail-label">PhilHealth No.</p><p className="detail-value">{displayData.philhealth_no || 'N/A'}</p></div>
                      </div>
                    </div>
                  )}
                  {activeTab === 'resume' && (
                    <div className="resume-tab-container">
                      {displayData.resume_file ? (
                        <div className="resume-viewer">
                          {resumeLoading && (
                            <div className="d-flex flex-column align-items-center justify-content-center" style={{ height: '400px', backgroundColor: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: '0.375rem' }}>
                              <div className="spinner-border text-success mb-3" role="status">
                                <span className="visually-hidden">Loading...</span>
                              </div>
                              <p className="text-muted">Loading resume...</p>
                            </div>
                          )}
                          {resumeError && !resumeLoading && (
                            <div className="d-flex flex-column align-items-center justify-content-center" style={{ height: '400px', backgroundColor: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: '0.375rem' }}>
                              <i className="bi bi-exclamation-triangle-fill text-warning mb-3" style={{ fontSize: '3rem' }}></i>
                              <h5 className="text-muted mb-2">Resume Not Available</h5>
                              <p className="text-muted text-center mb-3">{resumeError}</p>
                            </div>
                          )}
                          {!resumeLoading && !resumeError && (
                            <ResumeIframe resumeUrl={resumeBlobUrl || `http://localhost:8000/api/applicants/${displayData.id}/resume/view`} />
                          )}
                        </div>
                      ) : (
                        <div className="resume-placeholder">
                          <i className="bi bi-file-earmark-person-fill"></i>
                          <p>No Resume on File</p>
                          <small className="text-muted">Upload is available on applicant creation.</small>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline-secondary" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewApplicantDetailsModal;
import React, { useState, useEffect } from 'react';
import './ViewApplicantDetailsModal.css';
import placeholderImage from '../assets/placeholder-profile.jpg';
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
    <div className="modal fade show d-block applicant-details-modal" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content">
          <div className="modal-body">
            <div className="applicant-details-container">
              <div className="profile-sidebar">
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
                <img 
                  src={displayData.profile_picture_url || placeholderImage} 
                  alt={`${displayData.full_name || displayData.name}'s profile`} 
                  className="profile-avatar"
                  onError={(e) => {
                    e.target.src = placeholderImage;
                  }}
                />
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
              <div className="profile-main">
                 <button type="button" className="btn-close float-end" onClick={onClose} aria-label="Close"></button>
                <ul className="nav nav-tabs">
                  <li className="nav-item"><button type="button" className={`nav-link ${activeTab === 'personal' ? 'active' : ''}`} onClick={() => setActiveTab('personal')}>Personal Details</button></li>
                  <li className="nav-item"><button type="button" className={`nav-link ${activeTab === 'government' ? 'active' : ''}`} onClick={() => setActiveTab('government')}>Government Requirements</button></li>
                </ul>
                <div className="tab-content pt-3">
                  {activeTab === 'personal' && (
                    <div>
                      <h5 className="info-section-title">Personal Information</h5>
                      <div className="row g-4">
                        <div className="col-md-4 detail-group"><p className="detail-label">First Name</p><p className="detail-value">{displayData.first_name || 'N/A'}</p></div>
                        <div className="col-md-4 detail-group"><p className="detail-label">Middle Name</p><p className="detail-value">{displayData.middle_name || 'N/A'}</p></div>
                        <div className="col-md-4 detail-group"><p className="detail-label">Last Name</p><p className="detail-value">{displayData.last_name || 'N/A'}</p></div>
                        <div className="col-md-6 detail-group"><p className="detail-label">Gender</p><p className="detail-value">{displayData.gender || 'N/A'}</p></div>
                        <div className="col-md-6 detail-group"><p className="detail-label">Age</p><p className="detail-value">{age}</p></div>
                        <div className="col-md-6 detail-group"><p className="detail-label">Birthday</p><p className="detail-value">{formatDate(displayData.birthday)}</p></div>
                        <div className="col-md-6 detail-group"><p className="detail-label">Email</p><p className="detail-value">{displayData.email || 'N/A'}</p></div>
                        <div className="col-md-6 detail-group"><p className="detail-label">Phone</p><p className="detail-value">{displayData.phone || 'N/A'}</p></div>
                      </div>
                    </div>
                  )}
                  {activeTab === 'government' && (
                    <div>
                      <h5 className="info-section-title">Government Requirements</h5>
                      <div className="row g-4">
                        <div className="col-md-6 detail-group"><p className="detail-label">SSS No.</p><p className="detail-value">{displayData.sss_no || 'N/A'}</p></div>
                        <div className="col-md-6 detail-group"><p className="detail-label">TIN No.</p><p className="detail-value">{displayData.tin_no || 'N/A'}</p></div>
                        <div className="col-md-6 detail-group"><p className="detail-label">Pag-IBIG No.</p><p className="detail-value">{displayData.pag_ibig_no || 'N/A'}</p></div>
                        <div className="col-md-6 detail-group"><p className="detail-label">PhilHealth No.</p><p className="detail-value">{displayData.philhealth_no || 'N/A'}</p></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewApplicantDetailsModal;
import React, { useState, useEffect, useMemo } from 'react';
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
  const [documents, setDocuments] = useState([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docsError, setDocsError] = useState(null);
  const [docPreviewUrl, setDocPreviewUrl] = useState(null);
  const [docPreviewLoading, setDocPreviewLoading] = useState(false);
  const [docPreviewError, setDocPreviewError] = useState(null);
  const [docPreviewName, setDocPreviewName] = useState('');
  const [docPreviewMime, setDocPreviewMime] = useState('');

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

  useEffect(() => {
    const fetchDocuments = async () => {
      const id = applicant?.id || fullApplicantData?.id;
      if (!show || !id || activeTab !== 'government') return;
      setDocsLoading(true);
      setDocsError(null);
      try {
        const res = await applicantAPI.listDocuments(id);
        setDocuments(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error('Error loading applicant documents:', err);
        setDocsError('Failed to load attachments');
      } finally {
        setDocsLoading(false);
      }
    };
    fetchDocuments();
  }, [show, applicant?.id, fullApplicantData?.id, activeTab]);

  const typeDocs = useMemo(() => {
    const byPrefix = (p) => documents.filter(d => typeof d?.name === 'string' && d.name.includes(`${p}_`));
    return {
      sss: byPrefix('sss'),
      tin: byPrefix('tin'),
      pagibig: byPrefix('pagibig'),
      philhealth: byPrefix('philhealth'),
    };
  }, [documents]);

  useEffect(() => () => {
    if (docPreviewUrl) {
      window.URL.revokeObjectURL(docPreviewUrl);
    }
  }, [docPreviewUrl]);

  const handlePreviewDoc = async (name) => {
    setDocPreviewLoading(true);
    setDocPreviewError(null);
    setDocPreviewName(name);
    try {
      const blob = await applicantAPI.viewDocument((fullApplicantData?.id || applicant?.id), name);
      const url = window.URL.createObjectURL(blob);
      setDocPreviewUrl(prev => {
        if (prev) window.URL.revokeObjectURL(prev);
        return url;
      });
      setDocPreviewMime(blob.type || 'application/octet-stream');
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to preview document';
      setDocPreviewError(msg);
    } finally {
      setDocPreviewLoading(false);
    }
  };

  if (!show || !applicant) {
    return null;
  }

  // Use full data if available, otherwise use summary data
  const displayData = fullApplicantData || applicant;
  const age = calculateAge(displayData.birthday);

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div className="modal-dialog modal-dialog-centered modal-xl">
        <div className="modal-content applicant-details-modal">
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
                  <div className="d-flex flex-column gap-2 mb-5 pb-3">
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
                    <div className="p-3">
                      <div className="mb-4">
                        <h6 className="text-uppercase text-muted mb-3 fw-bold small border-bottom pb-2">Application Info</h6>
                        <div className="row">
                          <div className="col-12">
                            <label className="form-label text-secondary small mb-1 d-block">Applied For</label>
                            <span className="fw-bold fs-5 text-primary">{jobTitle || displayData.applied_for || displayData.applied_position || 'N/A'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="mb-4">
                        <h6 className="text-uppercase text-muted mb-3 fw-bold small border-bottom pb-2">Personal Information</h6>
                        <div className="row g-3">
                          <div className="col-md-4">
                            <label className="form-label text-secondary small mb-1 d-block">First Name</label>
                            <span className="fw-semibold">{displayData.first_name || 'N/A'}</span>
                          </div>
                          <div className="col-md-4">
                            <label className="form-label text-secondary small mb-1 d-block">Middle Name</label>
                            <span className="fw-semibold">{displayData.middle_name || 'N/A'}</span>
                          </div>
                          <div className="col-md-4">
                            <label className="form-label text-secondary small mb-1 d-block">Last Name</label>
                            <span className="fw-semibold">{displayData.last_name || 'N/A'}</span>
                          </div>
                          
                          <div className="col-md-4">
                            <label className="form-label text-secondary small mb-1 d-block">Gender</label>
                            <span>{displayData.gender || 'N/A'}</span>
                          </div>
                          <div className="col-md-4">
                            <label className="form-label text-secondary small mb-1 d-block">Birthday</label>
                            <span>{formatDate(displayData.birthday)}</span>
                          </div>
                          <div className="col-md-4">
                            <label className="form-label text-secondary small mb-1 d-block">Age</label>
                            <span>{age}</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h6 className="text-uppercase text-muted mb-3 fw-bold small border-bottom pb-2">Contact Details</h6>
                        <div className="row g-3">
                          <div className="col-md-6">
                            <label className="form-label text-secondary small mb-1 d-block">Email Address</label>
                            <a href={`mailto:${displayData.email}`} className="text-decoration-none">
                              {displayData.email || 'N/A'}
                            </a>
                          </div>
                          <div className="col-md-6">
                            <label className="form-label text-secondary small mb-1 d-block">Phone Number</label>
                            <span>{displayData.phone || 'N/A'}</span>
                          </div>
                          <div className="col-12">
                            <label className="form-label text-secondary small mb-1 d-block">Address</label>
                            <span>{displayData.address || 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {activeTab === 'government' && (
                    <div>
                      <div className="info-card">
                        <div className="details-grid">
                          <div className="detail-group"><p className="detail-label">SSS No.</p><p className="detail-value">{displayData.sss_no || 'N/A'}</p></div>
                          <div>
                            <p className="detail-label">SSS ID/Registration</p>
                            {docsLoading ? (
                              <div className="text-muted">Loading...</div>
                            ) : (typeDocs.sss && typeDocs.sss.length > 0 ? (
                              <div className="d-flex flex-column gap-2">
                                {typeDocs.sss.map(doc => (
                                  <div key={doc.name} className="d-flex justify-content-between align-items-center border rounded px-2 py-1">
                                    <div className="d-flex align-items-center gap-2 overflow-hidden">
                                      <i className="bi bi-file-earmark-text"></i>
                                      <span className="text-truncate" title={doc.name}>{doc.name}</span>
                                    </div>
                                    <div className="d-flex gap-2">
                                    <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => handlePreviewDoc(doc.name)}><i className="bi bi-eye"></i></button>
                                      <button type="button" className="btn btn-sm btn-outline-primary" onClick={async () => {
                                        try { await applicantAPI.downloadDocument(displayData.id, doc.name); }
                                        catch (error) { const msg = error.response?.data?.message || 'Failed to download document'; onToast && onToast({ show: true, message: msg, type: 'error' }); }
                                      }}><i className="bi bi-download"></i></button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-muted mb-0">No attachment</p>
                            ))}
                          </div>
                        </div>
                        <div className="details-grid">
                          <div className="detail-group"><p className="detail-label">TIN No.</p><p className="detail-value">{displayData.tin_no || 'N/A'}</p></div>
                          <div>
                            <p className="detail-label">TIN ID/Certificate</p>
                            {docsLoading ? (
                              <div className="text-muted">Loading...</div>
                            ) : (typeDocs.tin && typeDocs.tin.length > 0 ? (
                              <div className="d-flex flex-column gap-2">
                                {typeDocs.tin.map(doc => (
                                  <div key={doc.name} className="d-flex justify-content-between align-items-center border rounded px-2 py-1">
                                    <div className="d-flex align-items-center gap-2 overflow-hidden">
                                      <i className="bi bi-file-earmark-text"></i>
                                      <span className="text-truncate" title={doc.name}>{doc.name}</span>
                                    </div>
                                    <div className="d-flex gap-2">
                                    <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => handlePreviewDoc(doc.name)}><i className="bi bi-eye"></i></button>
                                      <button type="button" className="btn btn-sm btn-outline-primary" onClick={async () => {
                                        try { await applicantAPI.downloadDocument(displayData.id, doc.name); }
                                        catch (error) { const msg = error.response?.data?.message || 'Failed to download document'; onToast && onToast({ show: true, message: msg, type: 'error' }); }
                                      }}><i className="bi bi-download"></i></button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-muted mb-0">No attachment</p>
                            ))}
                          </div>
                        </div>
                        <div className="details-grid">
                          <div className="detail-group"><p className="detail-label">Pag-IBIG No.</p><p className="detail-value">{displayData.pag_ibig_no || 'N/A'}</p></div>
                          <div>
                            <p className="detail-label">Pag-IBIG ID/Registration</p>
                            {docsLoading ? (
                              <div className="text-muted">Loading...</div>
                            ) : (typeDocs.pagibig && typeDocs.pagibig.length > 0 ? (
                              <div className="d-flex flex-column gap-2">
                                {typeDocs.pagibig.map(doc => (
                                  <div key={doc.name} className="d-flex justify-content-between align-items-center border rounded px-2 py-1">
                                    <div className="d-flex align-items-center gap-2 overflow-hidden">
                                      <i className="bi bi-file-earmark-text"></i>
                                      <span className="text-truncate" title={doc.name}>{doc.name}</span>
                                    </div>
                                    <div className="d-flex gap-2">
                                    <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => handlePreviewDoc(doc.name)}><i className="bi bi-eye"></i></button>
                                      <button type="button" className="btn btn-sm btn-outline-primary" onClick={async () => {
                                        try { await applicantAPI.downloadDocument(displayData.id, doc.name); }
                                        catch (error) { const msg = error.response?.data?.message || 'Failed to download document'; onToast && onToast({ show: true, message: msg, type: 'error' }); }
                                      }}><i className="bi bi-download"></i></button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-muted mb-0">No attachment</p>
                            ))}
                          </div>
                        </div>
                        <div className="details-grid">
                          <div className="detail-group"><p className="detail-label">PhilHealth No.</p><p className="detail-value">{displayData.philhealth_no || 'N/A'}</p></div>
                          <div>
                            <p className="detail-label">PhilHealth ID/Registration</p>
                            {docsLoading ? (
                              <div className="text-muted">Loading...</div>
                            ) : (typeDocs.philhealth && typeDocs.philhealth.length > 0 ? (
                              <div className="d-flex flex-column gap-2">
                                {typeDocs.philhealth.map(doc => (
                                  <div key={doc.name} className="d-flex justify-content-between align-items-center border rounded px-2 py-1">
                                    <div className="d-flex align-items-center gap-2 overflow-hidden">
                                      <i className="bi bi-file-earmark-text"></i>
                                      <span className="text-truncate" title={doc.name}>{doc.name}</span>
                                    </div>
                                    <div className="d-flex gap-2">
                                    <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => handlePreviewDoc(doc.name)}><i className="bi bi-eye"></i></button>
                                      <button type="button" className="btn btn-sm btn-outline-primary" onClick={async () => {
                                        try { await applicantAPI.downloadDocument(displayData.id, doc.name); }
                                        catch (error) { const msg = error.response?.data?.message || 'Failed to download document'; onToast && onToast({ show: true, message: msg, type: 'error' }); }
                                      }}><i className="bi bi-download"></i></button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-muted mb-0">No attachment</p>
                            ))}
                          </div>
                        </div>
                      </div>
                      {(docPreviewLoading || docPreviewUrl || docPreviewError) && (
                        <div className="info-card mt-3">
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <div className="d-flex align-items-center gap-2">
                              <i className="bi bi-eye"></i>
                              <span className="fw-semibold">Attachment Preview</span>
                              {docPreviewName && <span className="text-muted">{docPreviewName}</span>}
                            </div>
                            <div>
                              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => {
                                if (docPreviewUrl) window.URL.revokeObjectURL(docPreviewUrl);
                                setDocPreviewUrl(null);
                                setDocPreviewError(null);
                                setDocPreviewName('');
                                setDocPreviewMime('');
                              }}>Close</button>
                            </div>
                          </div>
                          {docPreviewLoading && (
                            <div className="text-center p-3">
                              <div className="spinner-border text-success" role="status"><span className="visually-hidden">Loading...</span></div>
                            </div>
                          )}
                          {docPreviewError && !docPreviewLoading && (
                            <div className="alert alert-warning" role="alert">
                              {docPreviewError}
                            </div>
                          )}
                          {docPreviewUrl && !docPreviewLoading && !docPreviewError && (
                            <div style={{height: '420px'}}>
                              {docPreviewMime.startsWith('image/') ? (
                                <img src={docPreviewUrl} alt={docPreviewName} style={{maxHeight: '100%', maxWidth: '100%'}} />
                              ) : (
                                <iframe src={docPreviewUrl} title={docPreviewName} style={{width: '100%', height: '100%', border: '1px solid var(--border-color)', borderRadius: '0.375rem'}} />
                              )}
                            </div>
                          )}
                        </div>
                      )}
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
                            <ResumeIframe resumeUrl={resumeBlobUrl || `https://api.lapeco.org/api/applicants/${displayData.id}/resume/view`} />
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

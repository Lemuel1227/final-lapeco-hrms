import React, { useState } from 'react';

const ResumeIframe = ({ resumeUrl }) => {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  const handleLoad = () => {
    setLoading(false);
  };

  const handleError = () => {
    setError(true);
    setLoading(false);
  };

  const token = localStorage.getItem('auth_token');
  const urlWithToken = token ? `${resumeUrl}?token=${encodeURIComponent(token)}` : resumeUrl;

  if (error) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center" style={{ height: '400px', backgroundColor: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: '0.375rem' }}>
        <i className="bi bi-exclamation-triangle-fill text-warning mb-3" style={{ fontSize: '3rem' }}></i>
        <h5 className="text-muted mb-2">Resume Not Available</h5>
        <p className="text-muted text-center mb-3">The resume file could not be loaded. It may not exist or there was an error accessing it.</p>
        <a href={urlWithToken} target="_blank" rel="noopener noreferrer" className="btn btn-outline-primary">
          <i className="bi bi-box-arrow-up-right me-2"></i>Try Opening in New Tab
        </a>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      {loading && (
        <div className="d-flex flex-column align-items-center justify-content-center" style={{ height: '400px', backgroundColor: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: '0.375rem' }}>
          <div className="spinner-border text-success mb-3" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="text-muted">Loading resume...</p>
        </div>
      )}
      <iframe 
        src={urlWithToken} 
        width="100%" 
        height="600px" 
        title="Resume Preview"
        onLoad={handleLoad}
        onError={handleError}
        style={{ display: loading ? 'none' : 'block' }}
      />
    </div>
  );
};

export default ResumeIframe;

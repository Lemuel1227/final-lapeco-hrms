import React from 'react';
import './ViewEmployeeDetailsModal.css';

const ViewTemplateModal = ({ template, show, onClose, onUseTemplate }) => {
  if (!show || !template) {
    return null;
  }

  const handleUseClick = () => {
    onUseTemplate(template);
    onClose();
  };

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content employee-details-modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Template Details</h5>
            <button type="button" className="btn-close" onClick={onClose} aria-label="Close"></button>
          </div>
          <div className="modal-body employee-details-modal-body">
            <div className="info-section mb-4">
              <h4 className="employee-name-modal mb-1">{template.name}</h4>
              <p className="detail-value-modal">{template.description || 'No description provided.'}</p>
            </div>
            <div className="row">
              <div className="col-md-6">
                <div className="info-section">
                  <h6 className="info-section-title">Template Columns</h6>
                  <div className="d-flex flex-wrap gap-2">
                    {(template.columns || []).map(key => (
                      <span key={key} className="badge bg-secondary fs-6">
                        {key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline-secondary" onClick={onClose}>Close</button>
            <button type="button" className="btn btn-success action-button-primary" onClick={handleUseClick}>
              <i className="bi bi-arrow-right-circle-fill me-2"></i>Use this Template
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewTemplateModal;
// src/components/modals/ViewAttachmentsModal.jsx (UPDATED)

import React, { useState, useMemo } from 'react'; // <-- Import useMemo
import useReportGenerator from '../hooks/useReportGenerator.js';
import ReportPreviewModal from './ReportPreviewModal';

const ViewAttachmentsModal = ({ show, onClose, request }) => {
  const [showPreview, setShowPreview] = useState(false);
  const [previewTitle, setPreviewTitle] = useState('');
  const { generateReport, pdfDataUri, isLoading, setPdfDataUri } = useReportGenerator();

  // --- MODIFIED LOGIC TO AGGREGATE ALL ATTACHMENTS ---
  const attachments = useMemo(() => {
    if (!request) return [];

    const attachmentSet = new Set();
    
    // General attachment
    if (request.documentName) {
      attachmentSet.add(request.documentName);
    }
    // Maternity attachments
    if (request.maternityDetails?.medicalDocumentName) {
      attachmentSet.add(request.maternityDetails.medicalDocumentName);
    }
    if (request.maternityDetails?.soloParentDocumentName) {
      attachmentSet.add(request.maternityDetails.soloParentDocumentName);
    }
    // Paternity attachments
    if (request.paternityDetails?.marriageCertName) {
      attachmentSet.add(request.paternityDetails.marriageCertName);
    }
    if (request.paternityDetails?.birthCertName) {
      attachmentSet.add(request.paternityDetails.birthCertName);
    }

    return Array.from(attachmentSet);
  }, [request]);
  // --- END MODIFIED LOGIC ---

  if (!show || !request) {
    return null;
  }

  const handlePreview = (docName) => {
    setPreviewTitle(docName);
    generateReport('attachment_viewer', { documentName: docName });
    setShowPreview(true);
  };

  const handleClosePreview = () => {
    setShowPreview(false);
    if (pdfDataUri) {
      URL.revokeObjectURL(pdfDataUri);
    }
    setPdfDataUri('');
  };

  return (
    <>
      <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Attachments for {request.name}</h5>
              <button type="button" className="btn-close" onClick={onClose}></button>
            </div>
            <div className="modal-body">
              <p className="text-muted">The following documents were attached to this leave request.</p>
              {attachments.length > 0 ? (
                <ul className="list-group">
                  {attachments.map((docName, index) => (
                    <li key={index} className="list-group-item d-flex justify-content-between align-items-center">
                      <span><i className="bi bi-file-earmark-text-fill me-2"></i>{docName}</span>
                      <button 
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => handlePreview(docName)}
                        disabled={isLoading}
                      >
                        <i className="bi bi-eye-fill me-1"></i> Preview
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-center">No attachments found.</p>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={onClose}>Close</button>
            </div>
          </div>
        </div>
      </div>
      
      {(isLoading || pdfDataUri) && (
        <ReportPreviewModal
          show={showPreview}
          onClose={handleClosePreview}
          pdfDataUri={pdfDataUri}
          reportTitle={previewTitle}
        />
      )}
    </>
  );
};

export default ViewAttachmentsModal;
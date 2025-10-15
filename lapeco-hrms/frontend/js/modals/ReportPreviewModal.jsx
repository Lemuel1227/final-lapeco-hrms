import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import './ReportPreviewModal.css';

const ReportPreviewModal = ({ show, onClose, pdfDataUri, reportTitle }) => {
  useEffect(() => {
    return () => {
      if (pdfDataUri) {
        URL.revokeObjectURL(pdfDataUri);
      }
    };
  }, [pdfDataUri]);

  if (!show) {
    return null;
  }

  const handleDownload = () => {
    if (!pdfDataUri) return;
    const link = document.createElement('a');
    link.href = pdfDataUri;
    link.download = `${reportTitle.replace(/\s+/g, '_') || 'report'}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return ReactDOM.createPortal(
    <div className="modal fade show d-block report-preview-modal-backdrop" tabIndex="-1">
      <div className="modal-dialog modal-dialog-centered modal-xl report-preview-modal-dialog">
        <div className="modal-content report-preview-modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{reportTitle || 'Report Preview'}</h5>
            <button type="button" className="btn-close" onClick={onClose} aria-label="Close"></button>
          </div>
          <div className="modal-body report-preview-modal-body">
            {pdfDataUri ? (
              <iframe
                src={pdfDataUri}
                title={reportTitle || "Report Preview"} 
                width="100%"
                height="100%"
                style={{ border: 'none' }} 
              />
            ) : (
              <p>Generating report preview...</p>
            )}
          </div>
          <div className="modal-footer">
            {pdfDataUri && (
              <button type="button" className="btn btn-primary" onClick={handleDownload}>
                <i className="bi bi-download me-1"></i> Download PDF
              </button>
            )}
            <button type="button" className="btn btn-outline-secondary" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ReportPreviewModal;
import React, { useState, useRef } from 'react';
import { format } from 'date-fns';
import placeholderAvatar from '../../assets/placeholder-profile.jpg';
import ConfirmationModal from '../../modals/ConfirmationModal';

export default function CaseDetailView({
  caseInfo,
  employee,
  currentUser,
  onBack,
  onSaveLog,
  onEdit,
  onDelete,
  onDeleteLog,
  onConfirmDeleteCase,
  onUploadAttachment,
  onDeleteAttachment,
  onDownloadAttachment,
}) {
  const [newLogEntry, setNewLogEntry] = useState('');
  const [logToDelete, setLogToDelete] = useState(null);
  const [showDeleteCaseModal, setShowDeleteCaseModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleSaveLog = () => {
    if (!newLogEntry.trim()) return;
    const entry = {
        date: new Date().toISOString().split('T')[0],
        action: newLogEntry,
    };
    onSaveLog(caseInfo.caseId, entry);
    setNewLogEntry('');
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUploadFile = async () => {
    if (!selectedFile || !onUploadAttachment) return;
    
    setIsUploading(true);
    try {
      await onUploadAttachment(caseInfo.caseId, selectedFile);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteAttachment = async (attachmentName) => {
    if (onDeleteAttachment) {
      await onDeleteAttachment(caseInfo.caseId, attachmentName);
    }
  };

  return (
    <div>
      <div className="page-header mb-4">
        <button className="btn btn-light me-3 back-button mb-3" onClick={onBack}>
          <i className="bi bi-arrow-left"></i> Back to All Cases
        </button>
      </div>

      <div className="case-detail-header-revised">
          <div className="case-detail-header-main">
            <img src={employee?.imageUrl || placeholderAvatar} alt={employee?.name} className="avatar" />
            <div className="title-section">
                <h1 className="case-reason">{caseInfo.reason}</h1>
                <p className="employee-name">For: {employee?.name || 'Unknown'} ({caseInfo.employeeId})</p>
            </div>
            <div className="actions dropdown">
                <button className="btn btn-primary dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                    Manage Case
                </button>
                <ul className="dropdown-menu dropdown-menu-end">
                    <li>
                        <a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); onEdit(caseInfo); }}>
                            <i className="bi bi-pencil-fill me-2"></i>Edit Case Details
                        </a>
                    </li>
                    <li><hr className="dropdown-divider" /></li>
                    <li>
                        <a className="dropdown-item text-danger" href="#" onClick={(e) => { e.preventDefault(); setShowDeleteCaseModal(true); }}>
                           <i className="bi bi-trash-fill me-2"></i>Delete Case
                        </a>
                    </li>
                </ul>
            </div>
          </div>
          <div className="case-detail-meta">
              <div className="meta-item">
                <span className="meta-label">Status</span>
                <div className="meta-value"><span className={`status-badge status-${caseInfo.status.toLowerCase()}`}>{caseInfo.status}</span></div>
              </div>
              <div className="meta-item">
                <span className="meta-label">Action Type</span>
                <div className="meta-value">{caseInfo.actionType}</div>
              </div>
              <div className="meta-item">
                <span className="meta-label">Incident Date</span>
                <div className="meta-value">{format(new Date(caseInfo.issueDate), 'MMM dd, yyyy')}</div>
              </div>
              {caseInfo.chargeFee && (
                  <div className="meta-item">
                      <span className="meta-label">Charge Fee</span>
                      <div className="meta-value text-danger fw-bold">
                          ₱{parseFloat(caseInfo.chargeFee).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                  </div>
              )}
          </div>
      </div>

      <div className="case-detail-layout">
        <div className="case-detail-main">
          <div className="card">
            <div className="card-header"><h5><i className="bi bi-clock-history me-2"></i>Action Log & Timeline</h5></div>
            <div className="card-body">
              <div className="mb-3">
                  <textarea className="form-control" rows="2" placeholder="Add a new log entry, note, or update..." value={newLogEntry} onChange={e => setNewLogEntry(e.target.value)}></textarea>
                  <button className="btn btn-sm btn-success w-100 mt-2" onClick={handleSaveLog} disabled={!newLogEntry.trim()}>Add to Log</button>
              </div>
              <ul className="action-log-timeline conversation-timeline">
                {(caseInfo.actionLog || []).map((log, index) => {
                  const isCurrentUser = currentUser && log.user && 
                    (String(log.user.id) === String(currentUser.id) || 
                     String(log.user.id) === String(currentUser.employee_id));
                  
                  return (
                    <li key={index} className={`log-item conversation-item ${isCurrentUser ? 'sender' : 'receiver'}`}>
                      {!isCurrentUser && (
                        <div className="conversation-avatar">
                          <img 
                            src={log.user?.imageUrl || placeholderAvatar} 
                            alt={log.user ? `${log.user.first_name} ${log.user.last_name}` : 'User'}
                            className="avatar-sm"
                          />
                        </div>
                      )}
                      <div className="conversation-content">
                        <div className="conversation-header">
                          <span className="conversation-name">
                            {log.user ? ([log.user.first_name, log.user.middle_name, log.user.last_name].filter(Boolean).join(' ') || log.user.name || 'Unknown User') : 'Unknown User'}
                          </span>
                          <span className="conversation-position">
                            {log.user?.position?.title || log.user?.position?.name || 'Staff'}
                          </span>
                          <span className="conversation-date">
                            {format(new Date(log.date), 'MMM dd, yyyy • h:mm a')}
                          </span>
                        </div>
                        <div className="conversation-message">
                          {log.action}
                        </div>
                      </div>
                      {isCurrentUser && (
                        <div className="conversation-avatar">
                          <img 
                            src={log.user?.imageUrl || placeholderAvatar} 
                            alt={log.user ? ([log.user.first_name, log.user.middle_name, log.user.last_name].filter(Boolean).join(' ') || log.user.name || 'User') : 'User'}
                            className="avatar-sm"
                          />
                        </div>
                      )}
                      <div className="conversation-actions">
                        <button 
                          className="btn btn-sm btn-outline-danger" 
                          onClick={(e) => { 
                            e.preventDefault(); 
                            setLogToDelete({ caseId: caseInfo.caseId, logId: log.id, index }); 
                          }}
                          title="Delete log entry"
                        >
                          <i className="bi bi-trash-fill"></i>
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>

        <div className="case-detail-sidebar">
           <div className="card">
             <div className="card-header"><h5><i className="bi bi-file-earmark-text-fill me-2"></i>Case Details</h5></div>
             <div className="card-body">
                <dl className="mb-0">
                    <dt>Description of Incident</dt>
                    <dd>{caseInfo.description || <span className="text-muted">No description provided.</span>}</dd>
                    
                    <dt className="mt-3">Resolution / Next Steps</dt>
                    <dd>{caseInfo.nextSteps || <span className="text-muted">No next steps defined.</span>}</dd>
                </dl>
             </div>
           </div>
           <div className="card mt-4">
             <div className="card-header"><h5><i className="bi bi-paperclip me-2"></i>Attachments</h5></div>
             <div className="card-body">
                <ul className="attachment-list">
                  {(caseInfo.attachments || []).length > 0 ? (caseInfo.attachments || []).map((file, index) => (
                    <li key={index} className="attachment-item d-flex justify-content-between align-items-center mb-2">
                      <div className="file-info d-flex align-items-center">
                        <i className="bi bi-file-earmark-text-fill me-2"></i>
                        <span>{typeof file === 'string' ? file : file.name}</span>
                      </div>
                      <div className="attachment-actions">
                        <button className="btn btn-sm btn-outline-secondary me-1" onClick={() => onDownloadAttachment && onDownloadAttachment(caseInfo.caseId, typeof file === 'string' ? file : file.name)}>
                          <i className="bi bi-download"></i>
                        </button>
                        <button 
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => handleDeleteAttachment(typeof file === 'string' ? file : file.name)}
                        >
                          <i className="bi bi-trash"></i>
                        </button>
                      </div>
                    </li>
                  )) : <p className="text-muted small">No attachments for this case.</p>}
                </ul>
                
                {/* File Upload Section */}
                <div className="upload-section mt-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="form-control mb-2"
                    onChange={handleFileSelect}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
                  />
                  {selectedFile && (
                    <div className="selected-file-preview mb-2 p-2 bg-light rounded">
                      <small className="text-muted">Selected: {selectedFile.name}</small>
                    </div>
                  )}
                  <button 
                    className="btn btn-sm btn-success w-100"
                    onClick={handleUploadFile}
                    disabled={!selectedFile || isUploading}
                  >
                    {isUploading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Uploading...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-upload me-2"></i>Upload File
                      </>
                    )}
                  </button>
                </div>
             </div>
           </div>
        </div>
      </div>

      {/* Local confirmation modals within CaseDetailView */}
      <ConfirmationModal
        show={showDeleteCaseModal}
        onClose={() => setShowDeleteCaseModal(false)}
        onConfirm={async () => {
          if (onConfirmDeleteCase) {
            await onConfirmDeleteCase(caseInfo);
          } else if (onDelete) {
            await onDelete(caseInfo);
          }
          setShowDeleteCaseModal(false);
        }}
        title="Delete Case"
        confirmText="Delete"
        confirmVariant="danger"
      >
        <p>Are you sure you want to permanently delete this case?</p>
      </ConfirmationModal>

      <ConfirmationModal
        show={!!logToDelete}
        onClose={() => setLogToDelete(null)}
        onConfirm={() => {
          if (logToDelete) {
            onDeleteLog(logToDelete.caseId, logToDelete.logId, logToDelete.index);
          }
          setLogToDelete(null);
        }}
        title="Delete Case Log Entry"
        confirmText="Delete"
        confirmVariant="danger"
      >
        <p>Are you sure you want to delete this log entry?</p>
      </ConfirmationModal>
    </div>
  );
}

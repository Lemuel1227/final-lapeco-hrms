import React, { useState, useRef } from 'react';
import { format } from 'date-fns';
import placeholderAvatar from '../../assets/placeholder-profile.jpg';
import ConfirmationModal from '../../modals/ConfirmationModal';

export default function TeamLeaderCaseDetailView({
  caseInfo,
  employee,
  currentUser,
  onBack,
  onSaveLog,
  onUploadAttachment,
  onDeleteAttachment,
  onDownloadAttachment,
  backLabel = 'Back to Dashboard',
  canInteract,
}) {
  const [newLogEntry, setNewLogEntry] = useState('');
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
          <i className="bi bi-arrow-left"></i> {backLabel}
        </button>
      </div>

      <div className="case-detail-header-revised">
          <div className="case-detail-header-main">
              {employee && (
                  <img src={employee.imageUrl || placeholderAvatar} alt={employee.name} className="avatar" />
              )}
              <div className="title-section">
                  <h1 className="case-reason">{caseInfo.reason}</h1>
                  <p className="employee-name">
                      For: {employee?.name || 'Unknown Employee'} ({caseInfo.employeeId})
                  </p>
                  {caseInfo.submittedBy && (
                      <p className="text-muted small">
                          Submitted by: {caseInfo.submittedBy}
                      </p>
                  )}
              </div>
          </div>
          <div className="case-detail-meta">
              <div className="meta-item">
                  <span className="meta-label">Status</span>
                  <div className="meta-value">
                      <span className={`status-badge status-${caseInfo.status.toLowerCase()}`}>
                          {caseInfo.status}
                      </span>
                  </div>
              </div>
              <div className="meta-item">
                  <span className="meta-label">Action Type</span>
                  <div className="meta-value">{caseInfo.actionType}</div>
              </div>
              <div className="meta-item">
                  <span className="meta-label">Incident Date</span>
                  <div className="meta-value">
                      {format(new Date(caseInfo.issueDate), 'MMM dd, yyyy')}
                  </div>
              </div>
              {caseInfo.chargeFee && (
                  <div className="meta-item">
                      <span className="meta-label">Charge Fee</span>
                      <div className="meta-value text-danger fw-bold">
                          ₱{parseFloat(caseInfo.chargeFee).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                  </div>
              )}
              {caseInfo.approvalStatus && (
                  <div className="meta-item">
                      <span className="meta-label">Approval Status</span>
                      <div className="meta-value">
                          <span className={`status-badge status-${caseInfo.approvalStatus.toLowerCase()}`}>
                              {caseInfo.approvalStatus}
                          </span>
                      </div>
                  </div>
              )}
          </div>
      </div>

      <div className="case-detail-layout">
        <div className="case-detail-main">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
                <h5 className="mb-0"><i className="bi bi-clock-history me-2"></i>Action Log & Timeline</h5>
                <span className="badge bg-secondary">{caseInfo.actionLog?.length || 0} entries</span>
            </div>
            <div className="card-body">
              {canInteract ? (
                <div className="mb-4">
                    <label className="form-label fw-semibold">Add to Log</label>
                    <div className="input-group">
                        <textarea 
                            className="form-control" 
                            rows="2" 
                            placeholder="Share updates, ask questions, or provide additional information..."
                            value={newLogEntry} 
                            onChange={e => setNewLogEntry(e.target.value)}
                        ></textarea>
                        <button 
                            className="btn btn-success" 
                            onClick={handleSaveLog} 
                            disabled={!newLogEntry.trim()}
                            style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }}
                        >
                            <i className="bi bi-send-fill"></i>
                        </button>
                    </div>
                </div>
              ) : (
                <div className="alert alert-light border-0" role="alert">
                    <i className="bi bi-info-circle me-2"></i>
                    Log interactions are available to HR and the original submitter once approved.
                </div>
              )}
              
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
                            loading="lazy"
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
                            loading="lazy"
                          />
                        </div>
                      )}
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
           
           {/* Attachments Section */}
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
                      </div>
                    </li>
                  )) : <p className="text-muted small">No attachments for this case.</p>}
                </ul>
                
                {canInteract && (
                  <div className="upload-section mt-3">
                    <label className="form-label fw-semibold">Add Attachment</label>
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
                )}
             </div>
           </div>
        </div>
      </div>
    </div>
  );
}

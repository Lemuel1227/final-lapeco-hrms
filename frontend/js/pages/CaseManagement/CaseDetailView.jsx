import React, { useState } from 'react';
import { format } from 'date-fns';
import placeholderAvatar from '../../assets/placeholder-profile.jpg';

const CaseDetailView = ({ caseInfo, employee, onBack, onSaveLog, onEdit }) => {
  const [newLogEntry, setNewLogEntry] = useState('');

  const handleSaveLog = () => {
    if (!newLogEntry.trim()) return;
    const entry = {
        date: new Date().toISOString().split('T')[0],
        action: newLogEntry,
    };
    onSaveLog(caseInfo.caseId, entry);
    setNewLogEntry('');
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
            <div className="actions">
                <button className="btn btn-primary" onClick={() => onEdit(caseInfo)}>
                    <i className="bi bi-pencil-fill me-2"></i>Edit Case
                </button>
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
              <ul className="action-log-timeline">
                {caseInfo.actionLog.map((log, index) => (
                  <li key={index} className="log-item">
                    <div className="log-icon"><i className="bi bi-dot"></i></div>
                    <div className="log-date">{format(new Date(log.date), 'MMM dd, yyyy')}</div>
                    <div className="log-action">{log.action}</div>
                  </li>
                ))}
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
                  {caseInfo.attachments.length > 0 ? caseInfo.attachments.map(file => (
                    <li key={file} className="attachment-item">
                      <a href="#" className="file-info"><i className="bi bi-file-earmark-text-fill"></i><span>{file}</span></a>
                      <button className="btn btn-sm btn-outline-secondary"><i className="bi bi-download"></i></button>
                    </li>
                  )) : <p className="text-muted small">No attachments for this case.</p>}
                </ul>
                <button className="btn btn-sm btn-outline-secondary w-100 mt-2">
                    <i className="bi bi-upload me-2"></i>Upload File
                </button>
             </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default CaseDetailView;
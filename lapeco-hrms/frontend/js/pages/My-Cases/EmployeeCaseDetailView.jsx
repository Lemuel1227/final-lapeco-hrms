import React, { useState } from 'react';
import { formatDate as formatMDY } from '../../utils/dateUtils';
import placeholderAvatar from '../../assets/placeholder-profile.jpg';

const EmployeeCaseDetailView = ({ caseInfo, currentUser, onBack, onSaveLog, canInteract = false }) => {
    const [newLogEntry, setNewLogEntry] = useState('');
    const handleSave = () => {
        if (!newLogEntry.trim()) return;
        const entry = {
            date: new Date().toISOString().slice(0, 10),
            action: newLogEntry,
        };
        onSaveLog && onSaveLog(caseInfo.caseId, entry);
        setNewLogEntry('');
    };
    return (
        <div className="container-fluid p-0 page-module-container">
            <div className="page-header mb-4">
                <button className="btn btn-light me-3 back-button mb-3" onClick={onBack}>
                    <i className="bi bi-arrow-left"></i> Back to My Cases
                </button>
            </div>

            <div className="case-detail-header-revised">
                <div className="case-detail-header-main">
                    <div className="title-section">
                        <h1 className="case-reason">{caseInfo.reason}</h1>
                        <p className="employee-name">Case ID: {caseInfo.caseId}</p>
                    </div>
                </div>
                <div className="case-detail-meta">
                    <div className="meta-item">
                        <span className="meta-label">Status</span>
                        <div className="meta-value">
                            <span className={`status-badge status-${caseInfo.status.toLowerCase()}`}>{caseInfo.status}</span>
                        </div>
                    </div>
                    <div className="meta-item">
                        <span className="meta-label">Action Type</span>
                        <div className="meta-value">{caseInfo.actionType}</div>
                    </div>
                    <div className="meta-item">
                        <span className="meta-label">Incident Date</span>
                        <div className="meta-value">{formatMDY(new Date(caseInfo.issueDate + 'T00:00:00'), 'long')}</div>
                    </div>
                </div>
            </div>

            <div className="case-detail-layout">
                <div className="case-detail-main">
                    <div className="card">
                        <div className="card-header"><h5><i className="bi bi-clock-history me-2"></i>Action Log & Timeline</h5></div>
                        <div className="card-body">
                            {canInteract ? (
                                <div className="mb-3">
                                    <label className="form-label fw-semibold">Add to Log</label>
                                    <textarea 
                                        className="form-control" 
                                        rows="2" 
                                        placeholder="Share updates, ask questions, or provide additional information..." 
                                        value={newLogEntry} 
                                        onChange={e => setNewLogEntry(e.target.value)}
                                    ></textarea>
                                    <button className="btn btn-sm btn-success w-100 mt-2" onClick={handleSave} disabled={!newLogEntry.trim()}>
                                        <i className="bi bi-plus-circle me-2"></i>Add to Log
                                    </button>
                                </div>
                            ) : (
                                <div className="alert alert-warning" role="alert">
                                    Log interactions are available to HR and the original submitter once approved.
                                </div>
                            )}
                            <ul className="action-log-timeline conversation-timeline">
                                {caseInfo.actionLog.sort((a, b) => new Date(b.date) - new Date(a.date)).map((log, index) => {
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
                                                        {formatMDY(new Date(log.date + 'T00:00:00'), 'long')}
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
                                                        alt={log.user ? `${log.user.first_name} ${log.user.last_name}` : 'User'}
                                                        className="avatar-sm"
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
                </div>
            </div>
        </div>
    );
};

export default EmployeeCaseDetailView;

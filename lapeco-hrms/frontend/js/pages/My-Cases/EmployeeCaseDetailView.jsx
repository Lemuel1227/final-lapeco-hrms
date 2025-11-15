import React from 'react';
import { formatDate as formatMDY } from '../../utils/dateUtils';

const EmployeeCaseDetailView = ({ caseInfo, onBack }) => {
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
                            <ul className="action-log-timeline">
                                {caseInfo.actionLog.sort((a, b) => new Date(b.date) - new Date(a.date)).map((log, index) => (
                                    <li key={index} className="log-item">
                                        <div className="log-icon"><i className="bi bi-dot"></i></div>
                                        <div className="log-date">{formatMDY(new Date(log.date + 'T00:00:00'), 'long')}</div>
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
                </div>
            </div>
        </div>
    );
};

export default EmployeeCaseDetailView;

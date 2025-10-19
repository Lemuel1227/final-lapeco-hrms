import React, { useState } from 'react';

const ActionCaseSubmissionModal = ({ show, onClose, onConfirm, submissionData }) => {
    const [comments, setComments] = useState('');

    if (!show) return null;

    const { submission, action } = submissionData;
    const isApproving = action === 'Approved';

    const handleConfirm = () => {
        onConfirm(submission.id, action, comments);
    };

    return (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">{action} Case Submission</h5>
                        <button type="button" className="btn-close" onClick={onClose}></button>
                    </div>
                    <div className="modal-body">
                        <p>You are about to <strong>{action.toLowerCase()}</strong> the case report regarding <strong>{submission.employeeName}</strong> for "{submission.reason}".</p>
                        
                        {isApproving ? (
                            <div className="alert alert-success">
                                Approving this submission will create a new, formal disciplinary case record.
                            </div>
                        ) : (
                            <div className="alert alert-warning">
                                Declining this submission will close it. The submitting leader will be able to see your comments.
                            </div>
                        )}

                        <div className="mb-3">
                            <label htmlFor="hrComments" className="form-label">HR Comments (Optional)</label>
                            <textarea
                                id="hrComments"
                                className="form-control"
                                rows="3"
                                value={comments}
                                onChange={(e) => setComments(e.target.value)}
                                placeholder={isApproving ? "e.g., Acknowledged. Case created and will be monitored." : "e.g., Not enough evidence provided. Please gather more details and resubmit if necessary."}
                            ></textarea>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-outline-secondary" onClick={onClose}>Cancel</button>
                        <button
                            type="button"
                            className={`btn btn-${isApproving ? 'success' : 'danger'}`}
                            onClick={handleConfirm}
                        >
                            Confirm & {action}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ActionCaseSubmissionModal;
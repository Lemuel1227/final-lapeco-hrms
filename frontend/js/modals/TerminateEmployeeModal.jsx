import React, { useState } from 'react';

const TERMINATION_REASONS = [
    "Performance Issues",
    "Company Restructuring / Redundancy",
    "Misconduct / Violation of Policy",
    "Job Abandonment",
    "End of Contract",
    "Other",
];

const TerminateEmployeeModal = ({ show, onClose, onConfirm, employee }) => {
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        reason: TERMINATION_REASONS[0],
        comments: '',
    });
    const [error, setError] = useState('');

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.reason) {
            setError('A reason for termination must be selected.');
            return;
        }
        if (!formData.date) {
            setError('Termination date is required.');
            return;
        }
        onConfirm(formData);
        onClose();
    };

    if (!show) return null;

    return (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content">
                    <form onSubmit={handleSubmit}>
                        <div className="modal-header">
                            <h5 className="modal-title">Terminate Employee: {employee.name}</h5>
                            <button type="button" className="btn-close" onClick={onClose}></button>
                        </div>
                        <div className="modal-body">
                            <p className="text-muted">Confirm details for the termination. This will set the employee's status to "Terminated" and deactivate their account.</p>
                            {error && <div className="alert alert-danger py-2">{error}</div>}
                            <div className="mb-3">
                                <label htmlFor="date" className="form-label">Termination Date*</label>
                                <input type="date" id="date" name="date" className="form-control" value={formData.date} onChange={handleChange} required />
                            </div>
                            <div className="mb-3">
                                <label htmlFor="reason" className="form-label">Reason for Termination*</label>
                                <select id="reason" name="reason" className="form-select" value={formData.reason} onChange={handleChange}>
                                    {TERMINATION_REASONS.map(reason => <option key={reason} value={reason}>{reason}</option>)}
                                </select>
                            </div>
                            <div className="mb-3">
                                <label htmlFor="comments" className="form-label">HR Comments (Optional)</label>
                                <textarea id="comments" name="comments" className="form-control" rows="3" value={formData.comments} onChange={handleChange} placeholder="Add any additional details or context..."></textarea>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-outline-secondary" onClick={onClose}>Cancel</button>
                            <button type="submit" className="btn btn-danger">Confirm Termination</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default TerminateEmployeeModal;
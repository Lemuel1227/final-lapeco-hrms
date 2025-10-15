import React from 'react';
import './SecurityPolicies.css';

const SecurityPolicies = () => {
    return (
        <div className="card settings-card">
            <div className="card-header">
                <h5 className="mb-0"><i className="bi bi-shield-lock-fill me-2"></i>Security Policies</h5>
            </div>
            <div className="card-body">
                <p className="card-text text-muted">Define the security requirements for all user accounts in the system.</p>
                
                <div className="setting-item">
                    <div className="form-check form-switch">
                        <input className="form-check-input" type="checkbox" role="switch" id="mfaSwitch" defaultChecked />
                        <label className="form-check-label" htmlFor="mfaSwitch">
                            <strong>Require Two-Factor Authentication (2FA)</strong>
                            <p className="text-muted mb-0 small">Force all users to set up 2FA for enhanced security.</p>
                        </label>
                    </div>
                </div>

                <div className="setting-item">
                    <label htmlFor="passwordLength" className="form-label">
                        <strong>Minimum Password Length</strong>
                        <p className="text-muted mb-0 small">Set the minimum number of characters required for user passwords.</p>
                    </label>
                    <div className="d-flex align-items-center" style={{maxWidth: '150px'}}>
                        <input type="range" className="form-range me-3" id="passwordLength" min="8" max="16" defaultValue="10" />
                        <span className="badge bg-secondary">10 chars</span>
                    </div>
                </div>

                <div className="setting-item">
                    <div className="form-check">
                        <input className="form-check-input" type="checkbox" id="complexPassword" defaultChecked />
                        <label className="form-check-label" htmlFor="complexPassword">
                            <strong>Enforce Password Complexity</strong>
                            <p className="text-muted mb-0 small">Require a mix of uppercase, lowercase, numbers, and symbols.</p>
                        </label>
                    </div>
                </div>
            </div>
            <div className="card-footer text-end">
                <button className="btn btn-success">Save Security Policies</button>
            </div>
        </div>
    );
};

export default SecurityPolicies;
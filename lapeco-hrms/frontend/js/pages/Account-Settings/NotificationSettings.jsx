import React from 'react';

const NotificationSettings = () => {
    return (
        <div className="card settings-card">
            <div className="card-header">
                <h5 className="mb-0">Notification Preferences</h5>
            </div>
            <div className="card-body">
                <p className="card-text text-muted">Control how you receive notifications from the HRMS.</p>
                <ul className="list-group list-group-flush">
                    <li className="list-group-item d-flex justify-content-between align-items-center">
                        <div>
                            <strong>Leave Request Updates</strong>
                            <p className="text-muted mb-0 small">Notify me when my leave requests are approved or rejected.</p>
                        </div>
                        <div className="form-check form-switch">
                            <input className="form-check-input" type="checkbox" role="switch" id="leaveSwitch" defaultChecked />
                        </div>
                    </li>
                    <li className="list-group-item d-flex justify-content-between align-items-center">
                        <div>
                            <strong>Performance Review Reminders</strong>
                            <p className="text-muted mb-0 small">Remind me when performance reviews are due.</p>
                        </div>
                        <div className="form-check form-switch">
                            <input className="form-check-input" type="checkbox" role="switch" id="perfSwitch" defaultChecked />
                        </div>
                    </li>
                    <li className="list-group-item d-flex justify-content-between align-items-center">
                        <div>
                            <strong>System Announcements</strong>
                            <p className="text-muted mb-0 small">Receive important system-wide announcements.</p>
                        </div>
                        <div className="form-check form-switch">
                            <input className="form-check-input" type="checkbox" role="switch" id="systemSwitch" />
                        </div>
                    </li>
                </ul>
            </div>
            <div className="card-footer text-end">
                <button className="btn btn-success">Save Preferences</button>
            </div>
        </div>
    );
};

export default NotificationSettings;
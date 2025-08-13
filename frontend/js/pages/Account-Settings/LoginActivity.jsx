import React from 'react';

const mockSessions = [
    { id: 1, browser: 'Chrome on macOS', location: 'Manila, PH', time: 'Active now', isCurrent: true },
    { id: 2, browser: 'Safari on iPhone', location: 'Cebu, PH', time: '2 hours ago', isCurrent: false },
    { id: 3, browser: 'Chrome on Windows', location: 'Davao, PH', time: '1 day ago', isCurrent: false },
];

const LoginActivity = () => {
  return (
    <div className="card settings-card">
      <div className="card-header">
        <h5 className="mb-0">Login Activity</h5>
      </div>
      <div className="card-body">
        <p className="card-text text-muted">This is a list of devices that have logged into your account. Revoke any sessions that you do not recognize.</p>
        <ul className="list-group list-group-flush">
          {mockSessions.map(session => (
            <li key={session.id} className="list-group-item login-activity-item">
              <i className="bi bi-display device-icon"></i>
              <div className="session-info">
                <strong>{session.browser}</strong>
                <p className="text-muted mb-0 small">{session.location} • {session.time}</p>
              </div>
              {session.isCurrent ? (
                <span className="badge bg-success-subtle text-success-emphasis">This Device</span>
              ) : (
                <button className="btn btn-sm btn-outline-secondary">Revoke</button>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default LoginActivity;
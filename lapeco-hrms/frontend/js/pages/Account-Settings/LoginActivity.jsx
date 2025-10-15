import React, { useState, useEffect } from 'react';
import { getLoginSessions, revokeSession } from '../../services/accountService';

const LoginActivity = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const data = await getLoginSessions();
      setSessions(data.sessions || []);
      setError(null);
    } catch (err) {
      console.error('Failed to load login sessions:', err);
      setError('Failed to load login sessions');
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeSession = async (sessionId) => {
    try {
      await revokeSession(sessionId);
      setSessions(prev => prev.filter(session => session.id !== sessionId));
      alert('Session has been revoked successfully.');
    } catch (err) {
      console.error('Failed to revoke session:', err);
      alert('Failed to revoke session. Please try again.');
    }
  };
  if (loading) {
    return (
      <div className="card settings-card">
        <div className="card-header">
          <h5 className="mb-0">Login Activity</h5>
        </div>
        <div className="card-body text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card settings-card">
        <div className="card-header">
          <h5 className="mb-0">Login Activity</h5>
        </div>
        <div className="card-body">
          <div className="alert alert-danger">{error}</div>
          <button className="btn btn-primary" onClick={loadSessions}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="card settings-card">
      <div className="card-header">
        <h5 className="mb-0">Login Activity</h5>
      </div>
      <div className="card-body">
        <p className="card-text text-muted">This is a list of devices that have logged into your account. Revoke any sessions that you do not recognize.</p>
        <ul className="list-group list-group-flush">
          {sessions.map(session => (
            <li key={session.id} className="list-group-item login-activity-item">
              <i className="bi bi-display device-icon"></i>
              <div className="session-info">
                <div className="session-device">{session.device}</div>
                <div className="session-details">
                  <span className="time">{session.lastActive}</span>
                </div>
              </div>
              {session.current ? (
                <span className="badge bg-success-subtle text-success-emphasis">This Device</span>
              ) : (
                <button 
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => handleRevokeSession(session.id)}
                >
                  Revoke
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default LoginActivity;
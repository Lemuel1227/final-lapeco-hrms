import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import placeholderAvatar from '../../assets/placeholder-profile.jpg';
import { dashboardAPI } from '../../services/api';

const defaultSummary = {
  currentUser: null,
  scheduleToday: null,
  teamMembers: [],
  leaderEvaluation: { leader: null, isDue: false },
  leaveBalances: { vl: 0, sl: 0 },
  recentActivity: [],
  upcomingHolidays: [],
  upcomingLeaveRequests: [],
};

const EmployeeDashboard = () => {
  const [summary, setSummary] = useState(defaultSummary);
  const [fallbackUser, setFallbackUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        setFallbackUser(JSON.parse(stored));
      }
    } catch (err) {
      console.error('Failed to parse stored user for EmployeeDashboard', err);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchSummary = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await dashboardAPI.getEmployeeSummary();
        if (!isMounted) return;

        const data = response.data || {};
        setSummary({
          currentUser: data.currentUser || null,
          scheduleToday: data.scheduleToday || null,
          teamMembers: Array.isArray(data.teamMembers) ? data.teamMembers : [],
          leaderEvaluation: data.leaderEvaluation || { leader: null, isDue: false },
          leaveBalances: data.leaveBalances || { vl: 0, sl: 0 },
          recentActivity: Array.isArray(data.recentActivity) ? data.recentActivity : [],
          upcomingHolidays: Array.isArray(data.upcomingHolidays) ? data.upcomingHolidays : [],
          upcomingLeaveRequests: Array.isArray(data.upcomingLeaveRequests) ? data.upcomingLeaveRequests : [],
        });
      } catch (err) {
        if (!isMounted) return;
        console.error('Failed to load employee dashboard summary', err);
        if (err.response?.status === 403) {
          setError('You do not have access to the employee dashboard.');
        } else {
          setError('Unable to load your dashboard right now. Please try again later.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchSummary();

    return () => {
      isMounted = false;
    };
  }, []);

  const currentUser = summary.currentUser || fallbackUser || { name: 'Employee', id: null, positionId: null };
  const firstName = currentUser?.name ? currentUser.name.split(' ')[0] : 'Employee';
  const myScheduleToday = summary.scheduleToday;
  const leaveBalances = summary.leaveBalances || { vl: 0, sl: 0 };
  const leaderEvaluation = summary.leaderEvaluation || { leader: null, isDue: false };

  const myTeam = useMemo(() => summary.teamMembers || [], [summary.teamMembers]);
  const recentActivity = useMemo(() => summary.recentActivity || [], [summary.recentActivity]);
  const upcomingHolidays = useMemo(() => summary.upcomingHolidays || [], [summary.upcomingHolidays]);

  if (isLoading) {
    return (
      <div className="p-5 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading dashboard...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-grid">
        <div className="dashboard-grid-span-4">
          <div className="dashboard-card p-4 text-center text-danger">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="dashboard-grid-span-4 mb-3">
        <div className="welcome-header">
          <h2>Welcome, {firstName}!</h2>
          <p>This is your personal dashboard. Here’s what you need to know for today.</p>
        </div>
      </div>
      
      <div className="employee-dashboard-grid-top">
        <div className={`dashboard-card my-status-card-revised ${!myScheduleToday ? 'day-off' : ''}`}>
            <div className="card-body">
                <i className={`bi ${myScheduleToday ? 'bi-calendar-check' : 'bi-calendar-x'} status-icon`}></i>
                <h5 className="status-text">{myScheduleToday ? 'On Schedule Today' : 'Day Off'}</h5>
                {myScheduleToday?.shift && <p className="status-detail">{myScheduleToday.shift}</p>}
            </div>
        </div>

        <div className="dashboard-card action-hub-card dashboard-grid-span-2">
          <div className="card-body">
              <ul className="action-hub-list">
                  <li className="action-hub-item">
                      <Link to="/dashboard/my-leave">
                          <i className="action-icon bi bi-calendar-plus-fill"></i>
                          <span className="action-label">Request New Leave</span>
                      </Link>
                  </li>
                  {leaderEvaluation.leader && leaderEvaluation.isDue && (
                    <li className="action-hub-item">
                        <Link to="/dashboard/evaluate-leader" className="bg-warning-subtle">
                            <i className="action-icon bi bi-star-fill text-warning"></i>
                            <span className="action-label">Evaluate Your Leader</span>
                            <span className="badge bg-warning text-dark">Action Required</span>
                        </Link>
                    </li>
                  )}
                  <li className="action-hub-item">
                      <Link to="/dashboard/my-leave">
                          <i className="action-icon bi bi-briefcase-fill"></i>
                          <span className="action-label">Vacation Leaves</span>
                          <span className="action-value">{leaveBalances.vl}<span className="action-unit">days</span></span>
                      </Link>
                  </li>
                  <li className="action-hub-item">
                      <Link to="/dashboard/my-leave">
                          <i className="action-icon bi bi-heart-pulse-fill"></i>
                          <span className="action-label">Sick Leaves</span>
                          <span className="action-value">{leaveBalances.sl}<span className="action-unit">days</span></span>
                      </Link>
                  </li>
                  
              </ul>
          </div>
        </div>

        <div className="dashboard-card my-team-card">
          <div className="card-header">
            <Link to="/dashboard/team-employees" className="card-link-header">
              <i className="bi bi-people-fill"></i>
              <span>My Team</span>
            </Link>
          </div>
          <div className="card-body my-team-scroll">
            <ul className="roster-snapshot-list">
              {myTeam.map(member => (
                <li key={member.id} className="roster-item">
                  <img src={member.avatarUrl || placeholderAvatar} alt={member.name} className="avatar" />
                  <span className="name">{member.name}</span>
                </li>
              ))}
              {myTeam.length === 0 && <li className="text-muted">No teammates assigned yet.</li>}
            </ul>
          </div>
        </div>
      </div>

      <div className="dashboard-grid-span-2 dashboard-card recent-activity-card">
          <div className="card-header"><h6><i className="bi bi-clock-history me-2"></i>Recent Activity</h6></div>
          <div className="card-body">
              <ul className="activity-list">
                  {recentActivity.length > 0 ? recentActivity.map(item => (
                      <li key={item.date} className="activity-item">
                          <div className="date">{format(parseISO(item.date), 'MMM dd')}</div>
                          <div className="info">
                              <span className="status">{item.status}</span>
                              <span className="details">{item.details}</span>
                          </div>
                          <div className={`status-dot status-${item.statusClass}`}></div>
                      </li>
                  )) : <li className='text-muted text-center p-3'>No attendance logs for this month yet.</li>}
              </ul>
          </div>
          <div className="card-footer">
              <Link to="/dashboard/my-attendance">View Full Attendance Log</Link>
          </div>
      </div>

      <div className="dashboard-grid-span-2 dashboard-card upcoming-holidays-card">
        <div className="card-header"><h6><i className="bi bi-flag-fill me-2"></i>Upcoming Holidays</h6></div>
        <div className="card-body">
          <ul className="holiday-snapshot-list">
            {upcomingHolidays.map(h => (
              <li key={h.id} className="holiday-item">
                <i className="bi bi-dot"></i>
                <span>{h.name} - {format(parseISO(h.date), 'MMM dd')}</span>
              </li>
            ))}
            {upcomingHolidays.length === 0 && <li className='text-muted'>No upcoming holidays.</li>}
          </ul>
        </div>
      </div>
    </>
  );
};

export default EmployeeDashboard;
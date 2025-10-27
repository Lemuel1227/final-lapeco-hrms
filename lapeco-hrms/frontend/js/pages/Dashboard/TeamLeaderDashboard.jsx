import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import TeamAttendanceCard from './TeamAttendanceCard';
import placeholderAvatar from '../../assets/placeholder-profile.jpg';
import { dashboardAPI } from '../../services/api';

const TeamLeaderDashboard = () => {
  const [summary, setSummary] = useState({
    teamRoster: [],
    attendanceToday: [],
    upcomingLeaves: [],
    stats: { totalMembers: 0, onLeaveToday: 0, pendingRequests: 0 },
  });
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        setCurrentUser(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to parse current user for TeamLeaderDashboard', e);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchSummary = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await dashboardAPI.getTeamLeaderSummary();
        if (!isMounted) return;

        const data = response.data || {};
        setSummary({
          teamRoster: Array.isArray(data.teamRoster) ? data.teamRoster : [],
          attendanceToday: Array.isArray(data.attendanceToday) ? data.attendanceToday : [],
          upcomingLeaves: Array.isArray(data.upcomingLeaves) ? data.upcomingLeaves : [],
          stats: {
            totalMembers: data.stats?.totalMembers || 0,
            onLeaveToday: data.stats?.onLeaveToday || 0,
            pendingRequests: data.stats?.pendingRequests || 0,
          },
        });
      } catch (err) {
        if (!isMounted) return;
        console.error('Failed to load team leader summary', err);
        if (err.response?.status === 403) {
          setError('You do not have permission to view the team dashboard.');
        } else {
          setError('Unable to load team dashboard data. Please try again later.');
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

  const attendanceEntries = useMemo(() => summary.attendanceToday.map(item => ({
    id: item.id,
    empId: item.empId,
    name: item.name,
    avatarUrl: item.avatarUrl,
    date: item.date,
    shift: item.shift,
    signIn: item.signIn,
    signOut: item.signOut,
    breakOut: item.breakOut,
    breakIn: item.breakIn,
    status: item.status,
    statusClass: item.statusClass,
  })), [summary.attendanceToday]);

  const rosterPreview = useMemo(() => summary.teamRoster, [summary.teamRoster]);
  const upcomingLeaves = useMemo(() => summary.upcomingLeaves || [], [summary.upcomingLeaves]);

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

  const firstName = currentUser?.name ? currentUser.name.split(' ')[0] : 'Leader';

  return (
    <div className="dashboard-grid">
      <div className="dashboard-grid-span-4">
        <div className="welcome-header">
          <h2>Welcome back, {firstName}!</h2>
          <p>Here's a quick overview of your team's status and priorities.</p>
        </div>
      </div>

      <div className="dashboard-grid-span-4">
        <div className="dashboard-stats-container">
          <div className="dashboard-stat-card">
            <div className="stat-icon icon-employees"><i className="bi bi-people-fill"></i></div>
            <div className="stat-info">
              <span className="stat-value">{summary.stats.totalMembers}</span>
              <span className="stat-label">Total Team Members</span>
            </div>
          </div>
          <div className="dashboard-stat-card">
            <div className="stat-icon icon-on-leave"><i className="bi bi-person-walking"></i></div>
            <div className="stat-info">
              <span className="stat-value">{summary.stats.onLeaveToday}</span>
              <span className="stat-label">On Leave Today</span>
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-grid-span-2">
        <TeamAttendanceCard attendanceEntries={attendanceEntries} />
      </div>

      <div className="dashboard-grid-span-2">
        <div className="dashboard-card whos-out-card">
          <div className="card-header">
            <h6><i className="bi bi-calendar2-week me-2"></i>Who's Out (Next 7 Days)</h6>
          </div>
          <div className="card-body">
            <ul className="leave-list">
              {upcomingLeaves.length > 0 ? upcomingLeaves.map(leave => {
                const startDate = leave.dateFrom ? new Date(leave.dateFrom) : null;
                const endDate = leave.dateTo ? new Date(leave.dateTo) : null;
                const hasStart = startDate && !Number.isNaN(startDate.getTime());
                const hasEnd = endDate && !Number.isNaN(endDate.getTime());

                const monthLabel = hasStart ? format(startDate, 'MMM').toUpperCase() : 'TBD';
                const dayLabel = hasStart ? format(startDate, 'dd') : '--';
                const rangeLabel = hasStart
                  ? leave.isMultiDay && hasEnd
                    ? `${format(startDate, 'MMM dd')} - ${format(endDate, 'MMM dd')}`
                    : format(startDate, 'MMM dd')
                  : 'Schedule pending';
                const dayCountLabel = `${leave.dayCount || 1} ${(leave.dayCount || 1) === 1 ? 'day' : 'days'}`;

                return (
                  <li key={leave.leaveId || leave.id} className="leave-item">
                    <div className="leave-details">
                      <div className="leave-header">
                        <img
                          src={leave.avatarUrl || placeholderAvatar}
                          alt={leave.employeeName}
                          className="avatar"
                        />
                        <div className="leave-info">
                          <span className="name">{leave.employeeName}</span>
                          <span className="leave-type-badge">{leave.leaveType}</span>
                        </div>
                         <div className="leave-meta">
                          <span className="date-range">{rangeLabel}</span>
                          <span className="day-count">{dayCountLabel}</span>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              }) : <li className="text-muted text-center p-3">No approved leave for the upcoming week.</li>}
            </ul>
          </div>
        </div>
      </div>

      <div className="dashboard-grid-span-4">
        <div className="dashboard-card manager-hub-card">
          <div className="manager-hub-grid">
            <div className="team-roster-snapshot">
              <h6><i className="bi bi-person-lines-fill me-2"></i>Team Roster</h6>
              <ul className="roster-list">
                {rosterPreview.map(member => (
                  <li key={member.id} className="roster-item">
                    <img src={member.avatarUrl || placeholderAvatar} alt={member.name} className="avatar" />
                    <span className="name">{member.name}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-auto pt-3 border-top">
                <Link to="/dashboard/team-employees" className="btn btn-sm btn-outline-secondary w-100">Manage Full Roster</Link>
              </div>
            </div>
            <div className="actionable-reminders">
              <h6><i className="bi bi-lightning-charge-fill me-2"></i>Your Actions</h6>
              <ul className="action-list">
                <li className="action-item">
                  <Link to="/dashboard/evaluate-team">
                    <i className="action-icon bi bi-clipboard2-check-fill"></i>
                    <span className="action-label">Conduct Performance Reviews</span>
                  </Link>
                </li>
                <li className="action-item">
                  <Link to="/dashboard/team-employees">
                    <i className="action-icon bi bi-people-fill"></i>
                    <span className="action-label">View Team Details</span>
                  </Link>
                </li>
                <li className="action-item">
                  <Link to="/dashboard/my-leave">
                    <i className="action-icon bi bi-calendar-plus-fill"></i>
                    <span className="action-label">Request Personal Leave</span>
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamLeaderDashboard;
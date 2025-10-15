import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { format, addDays, startOfToday, endOfToday, isWithinInterval } from 'date-fns';
import TeamAttendanceCard from './TeamAttendanceCard';
import placeholderAvatar from '../../assets/placeholder-profile.jpg';

const TeamLeaderDashboard = ({ 
  currentUser = {}, 
  employees = [], 
  leaveRequests = [],
  schedules = [],
  attendanceLogs = [],
  evaluations = []
}) => {

  const myTeam = useMemo(() => {
    if (!currentUser.isTeamLeader || !currentUser.positionId) return [];
    return employees.filter(e => e.positionId === currentUser.positionId && !e.isTeamLeader);
  }, [currentUser, employees]);
  
  const dashboardStats = useMemo(() => {
    const today = startOfToday();
    const teamIds = new Set(myTeam.map(e => e.id));
    
    const onLeaveToday = leaveRequests.filter(req => {
      if (req.status !== 'Approved' || !teamIds.has(req.empId)) return false;
      const startDate = new Date(req.dateFrom);
      const endDate = new Date(req.dateTo);
      return isWithinInterval(today, { start: startDate, end: endDate });
    }).length;

    const pendingRequests = leaveRequests.filter(r => r.status === 'Pending' && teamIds.has(r.empId)).length;

    return {
      totalMembers: myTeam.length,
      onLeaveToday,
      pendingRequests
    };
  }, [myTeam, leaveRequests]);
  
  const whosOutNext7Days = useMemo(() => {
    const today = startOfToday();
    const nextWeek = addDays(endOfToday(), 7);
    const teamIds = new Set(myTeam.map(e => e.id));

    return leaveRequests
      .filter(req => 
        req.status === 'Approved' && 
        teamIds.has(req.empId) &&
        new Date(req.dateFrom) <= nextWeek &&
        new Date(req.dateTo) >= today
      )
      .sort((a, b) => new Date(a.dateFrom) - new Date(b.dateFrom))
      .slice(0, 5);
  }, [myTeam, leaveRequests]);

  const evaluationsDueCount = useMemo(() => {
    return myTeam.reduce((count, member) => {
      const lastEval = evaluations
        .filter(ev => ev.employeeId === member.id)
        .sort((a, b) => new Date(b.periodEnd) - new Date(a.periodEnd))[0];

      if (!lastEval) return count + 1;

      const lastEvalDate = new Date(lastEval.periodEnd);
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      if (lastEvalDate < sixMonthsAgo) return count + 1;
      return count;
    }, 0);
  }, [myTeam, evaluations]);

  return (
    <div className="dashboard-grid">
      <div className="dashboard-grid-span-4">
        <div className="welcome-header">
          <h2>Welcome back, {currentUser.name?.split(' ')[0]}!</h2>
          <p>Here's a quick overview of your team's status and priorities.</p>
        </div>
      </div>

      <div className="dashboard-grid-span-4">
        <div className="dashboard-stats-container">
            <div className="dashboard-stat-card">
                <div className="stat-icon icon-employees"><i className="bi bi-people-fill"></i></div>
                <div className="stat-info"><span className="stat-value">{dashboardStats.totalMembers}</span><span className="stat-label">Total Team Members</span></div>
            </div>
            <div className="dashboard-stat-card">
                <div className="stat-icon icon-on-leave"><i className="bi bi-person-walking"></i></div>
                <div className="stat-info"><span className="stat-value">{dashboardStats.onLeaveToday}</span><span className="stat-label">On Leave Today</span></div>
            </div>
            <div className="dashboard-stat-card">
                <div className="stat-icon icon-pending"><i className="bi bi-clipboard2-check-fill"></i></div>
                <div className="stat-info"><span className="stat-value">{evaluationsDueCount}</span><span className="stat-label">Evaluations Due</span></div>
            </div>
        </div>
      </div>

      <div className="dashboard-grid-span-2">
        <TeamAttendanceCard 
            teamMembers={myTeam}
            schedules={schedules}
            attendanceLogs={attendanceLogs}
        />
      </div>
      
      <div className="dashboard-grid-span-2">
          <div className="dashboard-card whos-out-card">
              <div className="card-header"><h6><i className="bi bi-calendar2-week me-2"></i>Who's Out (Next 7 Days)</h6></div>
              <div className="card-body">
                  <ul className="leave-list">
                      {whosOutNext7Days.length > 0 ? whosOutNext7Days.map(req => (
                          <li key={req.leaveId} className="leave-item">
                              <div className="date-box">
                                  <span className="month">{format(new Date(req.dateFrom), 'MMM')}</span>
                                  <span className="day">{format(new Date(req.dateFrom), 'dd')}</span>
                              </div>
                              <div className="info">
                                  <span className="name">{req.name}</span>
                                  <span className="leave-type">{req.leaveType} ({req.days} days)</span>
                              </div>
                          </li>
                      )) : <li className="text-muted text-center p-3">No approved leave for the upcoming week.</li>}
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
                          {myTeam.slice(0, 4).map(member => (
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
                                  {evaluationsDueCount > 0 && <span className="action-badge badge rounded-pill bg-warning text-dark">{evaluationsDueCount} Due</span>}
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
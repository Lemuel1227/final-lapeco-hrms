import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { format, parseISO, isSameMonth, isAfter, startOfToday } from 'date-fns';
import placeholderAvatar from '../../assets/placeholder-profile.jpg';

const EmployeeDashboard = ({ 
  currentUser = { name: 'Employee', id: '' }, 
  schedules = [], 
  holidays = [],
  leaveRequests = [],
  evaluations = [],
  employees = [],
  attendanceLogs = []
}) => {
  const today = startOfToday();
  const todayISO = today.toISOString().split('T')[0];
  
  const leaveBalances = { vl: 12, sl: 8 };
  const myScheduleToday = schedules.find(s => s.empId === currentUser.id && s.date === todayISO);

  const myTeam = useMemo(() => {
    if (!currentUser.positionId) return [];
    return employees.filter(e => e.positionId === currentUser.positionId && e.id !== currentUser.id);
  }, [currentUser, employees]);
  
  const leaderEvaluation = useMemo(() => {
    if (!currentUser?.positionId) return { leader: null, isDue: false };
    const leader = employees.find(emp => emp.positionId === currentUser.positionId && emp.isTeamLeader);
    if (!leader) return { leader: null, isDue: false };
    
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const hasEvaluated = evaluations.some(ev => 
        ev.evaluatorId === currentUser.id && 
        ev.employeeId === leader.id &&
        new Date(ev.periodEnd) > sixMonthsAgo
    );
    return { leader, isDue: !hasEvaluated };
  }, [currentUser, employees, evaluations]);

  const recentActivity = useMemo(() => {
    const myLogsMap = new Map(attendanceLogs.filter(log => log.empId === currentUser.id).map(log => [log.date, log]));
    return schedules
        .filter(s => s.empId === currentUser.id && isSameMonth(parseISO(s.date), today))
        .map(schedule => {
            const log = myLogsMap.get(schedule.date);
            let status = 'Scheduled';
            let statusClass = 'scheduled';
            let details = `Shift: ${schedule.shift}`;

            if (log && log.signIn) {
                const shiftStartTime = schedule.shift?.split(' - ')[0] || '09:00';
                
                // Parse times for comparison with 15-minute late threshold
                const [shiftHour, shiftMin] = shiftStartTime.split(':').map(Number);
                const [signInHour, signInMin] = log.signIn.split(':').map(Number);
                
                // Convert to minutes for easier comparison
                const shiftStartMinutes = shiftHour * 60 + shiftMin;
                const signInMinutes = signInHour * 60 + signInMin;
                const lateThresholdMinutes = shiftStartMinutes + 15; // 15 minutes late threshold
                
                status = signInMinutes > lateThresholdMinutes ? 'Late' : 'Present';
                statusClass = status.toLowerCase();
                details = `Clocked In: ${log.signIn}`;
            } else if (isAfter(today, parseISO(schedule.date))) {
                status = 'Absent';
                statusClass = 'absent';
            }
            return { date: schedule.date, status, statusClass, details };
        })
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5);
  }, [attendanceLogs, schedules, currentUser.id, today]);

  const upcomingHolidays = useMemo(() => {
    return holidays
      .filter(h => isAfter(new Date(h.date), today))
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 3);
  }, [holidays, today]);

  return (
    <>
      <div className="dashboard-grid-span-4 mb-3">
        <div className="welcome-header">
          <h2>Welcome, {currentUser.name.split(' ')[0]}!</h2>
          <p>This is your personal dashboard. Here’s what you need to know for today.</p>
        </div>
      </div>
      
      <div className="employee-dashboard-grid-top">
        <div className={`dashboard-card my-status-card-revised ${!myScheduleToday ? 'day-off' : ''}`}>
            <div className="card-body">
                <i className={`bi ${myScheduleToday ? 'bi-calendar-check' : 'bi-calendar-x'} status-icon`}></i>
                <h5 className="status-text">{myScheduleToday ? "On Schedule Today" : "Day Off"}</h5>
                {myScheduleToday && <p className="status-detail">{myScheduleToday.shift}</p>}
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
          <div className="card-header"><h6><i className="bi bi-people-fill me-2"></i>My Team</h6></div>
          <div className="card-body">
            <ul className="roster-snapshot-list">
              {myTeam.slice(0, 3).map(member => (
                <li key={member.id} className="roster-item">
                  <img src={member.avatarUrl || placeholderAvatar} alt={member.name} className="avatar" />
                  <span className="name">{member.name}</span>
                </li>
              ))}
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
                <span>{h.name} - {format(new Date(h.date), 'MMM dd')}</span>
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
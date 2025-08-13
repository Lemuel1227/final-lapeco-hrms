import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import placeholderAvatar from '../../assets/placeholder-profile.jpg';

const TeamAttendanceCard = ({ teamMembers, schedules, attendanceLogs }) => {
  const today = new Date().toISOString().split('T')[0];

  const teamStatusToday = useMemo(() => {
    return teamMembers.map(member => {
      const schedule = schedules.find(s => s.empId === member.id && s.date === today);
      if (!schedule) {
        return { ...member, status: 'Day Off', statusClass: 'off' };
      }

      const log = attendanceLogs.find(l => l.empId === member.id && l.date === today);
      if (!log || !log.signIn) {
        return { ...member, status: 'Absent', statusClass: 'absent' };
      }

      const shiftStartTime = schedule.shift ? schedule.shift.split(' - ')[0] : '09:00';
      if (log.signIn > shiftStartTime) {
        return { ...member, status: 'Late', statusClass: 'late', time: log.signIn };
      }

      return { ...member, status: 'Present', statusClass: 'present', time: log.signIn };
    }).sort((a, b) => { // Sort by status priority
        const order = { present: 1, late: 2, absent: 3, off: 4 };
        return order[a.statusClass] - order[b.statusClass];
    });
  }, [teamMembers, schedules, attendanceLogs, today]);

  return (
    <div className="dashboard-card team-attendance-card">
      <div className="card-header">
        <h6>Who's In Today</h6>
      </div>
      <div className="card-body">
        <ul className="attendance-list">
          {teamStatusToday.map(member => (
            <li key={member.id} className="attendance-item">
              <img src={member.avatarUrl || placeholderAvatar} alt={member.name} />
              <div className="info">
                <span className="name">{member.name}</span>
                <span className={`status-text status-${member.statusClass}`}>{member.status} {member.time ? `(${member.time})` : ''}</span>
              </div>
              <span className={`status-dot status-${member.statusClass}`}></span>
            </li>
          ))}
        </ul>
      </div>
      <div className="card-footer">
        <Link to="/dashboard/attendance-management">View Full Attendance</Link>
      </div>
    </div>
  );
};

export default TeamAttendanceCard;
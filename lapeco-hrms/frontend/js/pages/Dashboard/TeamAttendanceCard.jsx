import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { format, isSameDay, parseISO } from 'date-fns';
import placeholderAvatar from '../../assets/placeholder-profile.jpg';

const TeamAttendanceCard = ({ attendanceEntries = [] }) => {
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');

  const formattedEntries = useMemo(() => {
    return attendanceEntries
      .filter(entry => {
        if (!entry.date) return false;
        try {
          return isSameDay(parseISO(entry.date), today);
        } catch (e) {
          return false;
        }
      })
      .map(entry => {
        const shiftLabel = entry.shift || '---';
        const statusClass = (entry.statusClass || entry.status || 'scheduled').toLowerCase();
        return {
          ...entry,
          shiftLabel,
          status: entry.status || 'Scheduled',
          statusClass,
        };
      })
      .sort((a, b) => {
        const order = { present: 1, late: 2, scheduled: 3, absent: 4 };
        const aOrder = order[a.statusClass] ?? 99;
        const bOrder = order[b.statusClass] ?? 99;
        return aOrder - bOrder;
      });
  }, [attendanceEntries, today]);

  return (
    <div className="dashboard-card team-attendance-card">
      <div className="card-header">
        <h6>Who's In Today</h6>
      </div>
      <div className="card-body">
        <ul className="attendance-list">
          {formattedEntries.map(member => {
            const startDate = member.date ? parseISO(member.date) : null;
            const hasStart = startDate && !Number.isNaN(startDate.getTime());
            const monthLabel = hasStart ? format(startDate, 'MMM').toUpperCase() : 'TBD';
            const dayLabel = hasStart ? format(startDate, 'dd') : '--';

            return (
              <li key={member.id || member.empId} className={`attendance-item`}>
                <div className="attendance-details">
                  <div className="attendance-header">
                    <div className="attendance-header-main">
                      <img src={member.avatarUrl || placeholderAvatar} alt={member.name} className="avatar" />
                      <div className="attendance-info">
                        <span className="name">{member.name}</span>
                        <span className={`status-pill status-${member.statusClass}`}>{member.status}</span>
                      </div>
                    </div>
                    {member.shiftLabel && (
                      <span className="shift">{member.shiftLabel}</span>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="card-footer">
        <Link to="/dashboard/my-attendance">View Full Attendance</Link>
      </div>
    </div>
  );
};

export default TeamAttendanceCard;
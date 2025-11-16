import React, { useState, useMemo, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './MyAttendancePage.css';
import attendanceAPI from '../../services/attendanceAPI';

const calculateHoursWorked = (signIn, signOut, breakOut, breakIn) => {
  if (!signIn || !signOut) return '0h 0m';

  const signInTime = new Date(`1970-01-01T${signIn}:00`);
  const signOutTime = new Date(`1970-01-01T${signOut}:00`);
  
  let totalMillis = signOutTime - signInTime;

  if (totalMillis < 0) totalMillis = 0;
  
  const hours = Math.floor(totalMillis / 3600000);
  const minutes = Math.floor((totalMillis % 3600000) / 60000);

  return `${hours}h ${minutes}m`;
};

const MyAttendancePage = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentUser, setCurrentUser] = useState(null);
  const [myAttendanceData, setMyAttendanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        setCurrentUser(JSON.parse(userStr));
      }
    } catch (e) {
      console.error('Failed to parse current user', e);
    }
  }, []);

  useEffect(() => {
    if (!currentUser?.id) return;
    setLoading(true);
    setError(null);
    attendanceAPI.getEmployeeAttendance(currentUser.id)
      .then(res => {
        const payload = res.data;
        const records = Array.isArray(payload) ? payload : payload?.data;
        const normalized = (records || []).map(r => {
          const signIn = r.timeIn || null;
          const signOut = r.timeOut || null;
          const breakOut = r.breakOut || null;
          const breakIn = r.breakIn || null;
          const status = r.status || 'Scheduled';
          return {
            date: r.date,
            schedule: r.shift || 'N/A',
            signIn: signIn || '---',
            signOut: signOut || '---',
            breakOut: breakOut || '---',
            breakIn: breakIn || '---',
            hoursWorked: calculateHoursWorked(signIn, signOut, breakOut, breakIn),
            status,
            statusClass: status.toLowerCase(),
          };
        });
        setMyAttendanceData(normalized);
      })
      .catch(err => {
        console.error('Failed to fetch attendance', err);
        setError('Failed to load attendance data.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [currentUser]);

  const eventsForCalendar = useMemo(() => (
    myAttendanceData.map(d => ({
      date: d.date,
      title: d.status,
      className: `fc-event-${d.statusClass}`
    }))
  ), [myAttendanceData]);

  const monthlyStats = useMemo(() => {
    const month = currentDate.getMonth();
    const year = currentDate.getFullYear();
    
    const recordsThisMonth = myAttendanceData.filter(d => {
      const recordDate = new Date(d.date + 'T00:00:00');
      return recordDate.getMonth() === month && recordDate.getFullYear() === year;
    });

    return {
      worked: recordsThisMonth.filter(d => d.status === 'Present' || d.status === 'Late').length,
      late: recordsThisMonth.filter(d => d.status === 'Late').length,
      absent: recordsThisMonth.filter(d => d.status === 'Absent').length,
      scheduled: recordsThisMonth.length,
    };
  }, [currentDate, myAttendanceData]);
  
  const recordsForSelectedMonth = useMemo(() => (
      myAttendanceData.filter(d => {
        const recordDate = new Date(d.date + 'T00:00:00');
        return recordDate.getMonth() === currentDate.getMonth() && recordDate.getFullYear() === currentDate.getFullYear();
      }).sort((a,b) => new Date(b.date) - new Date(a.date))
  ), [currentDate, myAttendanceData]);
  
  const displayedMonthYear = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="container-fluid p-0 page-module-container">
      <header className="page-header d-flex justify-content-between align-items-center mb-4">
        <h1 className="page-main-title">My Attendance</h1>
      </header>

      <div className="my-attendance-stats-bar">
        <div className="stat-card">
          <span className="stat-value">{monthlyStats.scheduled}</span>
          <span className="stat-label">Days Scheduled in {displayedMonthYear}</span>
        </div>
        <div className="stat-card">
          <span className="stat-value text-success">{monthlyStats.worked}</span>
          <span className="stat-label">Days Worked</span>
        </div>
        <div className="stat-card">
          <span className="stat-value text-warning">{monthlyStats.late}</span>
          <span className="stat-label">Late Arrivals</span>
        </div>
        <div className="stat-card">
          <span className="stat-value text-danger">{monthlyStats.absent}</span>
          <span className="stat-label">Days Absent</span>
        </div>
      </div>
      
      <div className="my-attendance-grid">
        <div className="calendar-container">
          <FullCalendar
            plugins={[dayGridPlugin]}
            initialView="dayGridMonth"
            events={eventsForCalendar}
            datesSet={(dateInfo) => setCurrentDate(dateInfo.view.currentStart)}
            height="auto"
            headerToolbar={{ left: 'title', center: '', right: 'prev,next' }}
          />
        </div>
        <div className="log-container card">
          <div className="card-header">
            <h6 className="mb-0">Daily Logs for {displayedMonthYear}</h6>
          </div>
          <div className="table-responsive">
            <table className="table data-table mb-0">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Schedule</th>
                  <th>Sign In/Out</th>
                  <th>Hours</th>
                </tr>
              </thead>
              <tbody>
                {recordsForSelectedMonth.length > 0 ? recordsForSelectedMonth.map(log => (
                  <tr key={log.date}>
                    <td>{new Date(log.date + "T00:00:00").toLocaleDateString('en-US', {month: 'short', day: 'numeric'})}</td>
                    <td><span className={`status-badge status-${log.statusClass}`}>{log.status}</span></td>
                    <td>{log.schedule}</td>
                    <td>{log.signIn} - {log.signOut}</td>
                    <td>{log.hoursWorked}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="5">
                      <div className="text-center p-4 text-muted">
                        No schedule found for this month.
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyAttendancePage;
import React, { useState, useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './MyAttendancePage.css';

const calculateHoursWorked = (signIn, signOut, breakOut, breakIn) => {
  if (!signIn || !signOut) return '0h 0m';

  const signInTime = new Date(`1970-01-01T${signIn}:00`);
  const signOutTime = new Date(`1970-01-01T${signOut}:00`);
  
  let totalMillis = signOutTime - signInTime;

  if (breakOut && breakIn) {
    const breakOutTime = new Date(`1970-01-01T${breakOut}:00`);
    const breakInTime = new Date(`1970-01-01T${breakIn}:00`);
    const breakMillis = breakInTime - breakOutTime;
    if (breakMillis > 0) {
      totalMillis -= breakMillis;
    }
  }

  if (totalMillis < 0) totalMillis = 0;
  
  const hours = Math.floor(totalMillis / 3600000);
  const minutes = Math.floor((totalMillis % 3600000) / 60000);

  return `${hours}h ${minutes}m`;
};

const MyAttendancePage = ({ currentUser, allSchedules, attendanceLogs }) => {
  // Use stored user if currentUser prop is not provided
  const storedUser = (() => {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
  })();
  
  const user = currentUser || storedUser;
  
  // Mock data for schedules and logs if not provided
  const schedules = allSchedules || [
    { empId: user?.id, date: '2023-06-01', shift: '09:00 - 17:00' },
    { empId: user?.id, date: '2023-06-02', shift: '09:00 - 17:00' },
    { empId: user?.id, date: '2023-06-05', shift: '09:00 - 17:00' },
    { empId: user?.id, date: '2023-06-06', shift: '09:00 - 17:00' },
    { empId: user?.id, date: '2023-06-07', shift: '09:00 - 17:00' },
  ];
  
  const logs = attendanceLogs || [
    { empId: user?.id, date: '2023-06-01', signIn: '08:55', signOut: '17:05', breakOut: '12:00', breakIn: '13:00' },
    { empId: user?.id, date: '2023-06-02', signIn: '09:10', signOut: '17:15', breakOut: '12:00', breakIn: '13:00' },
  ];
  const [currentDate, setCurrentDate] = useState(new Date());

  const myAttendanceData = useMemo(() => {
    if (!currentUser || !allSchedules || !attendanceLogs) return [];

    const mySchedules = allSchedules.filter(s => s.empId === currentUser.id);
    const myLogs = new Map(attendanceLogs.filter(log => log.empId === currentUser.id).map(log => [log.date, log]));

    return mySchedules.map(schedule => {
      const log = myLogs.get(schedule.date);
      const today = new Date(); today.setHours(0,0,0,0);
      const scheduleDate = new Date(schedule.date); scheduleDate.setHours(0,0,0,0);

      let status = 'Scheduled';
      let statusClass = 'scheduled';

      if (log && log.signIn) {
        const shiftStartTime = schedule.shift?.split(' - ')[0] || '00:00';
        
        // Parse times for comparison with 15-minute late threshold
        const [shiftHour, shiftMin] = shiftStartTime.split(':').map(Number);
        const [signInHour, signInMin] = log.signIn.split(':').map(Number);
        
        // Convert to minutes for easier comparison
        const shiftStartMinutes = shiftHour * 60 + shiftMin;
        const signInMinutes = signInHour * 60 + signInMin;
        const lateThresholdMinutes = shiftStartMinutes + 15; // 15 minutes late threshold
        
        status = signInMinutes > lateThresholdMinutes ? 'Late' : 'Present';
        statusClass = status.toLowerCase();
      } else {
        if (scheduleDate < today) {
          status = 'Absent';
          statusClass = 'absent';
        }
      }

      return {
        date: schedule.date,
        schedule: schedule.shift,
        signIn: log?.signIn || '---',
        signOut: log?.signOut || '---',
        breakOut: log?.breakOut || '---',
        breakIn: log?.breakIn || '---',
        hoursWorked: calculateHoursWorked(log?.signIn, log?.signOut, log?.breakOut, log?.breakIn),
        status,
        statusClass,
      };
    });
  }, [currentUser, allSchedules, attendanceLogs]);

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
      const recordDate = new Date(d.date);
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
        const recordDate = new Date(d.date);
        return recordDate.getMonth() === currentDate.getMonth() && recordDate.getFullYear() === currentDate.getFullYear();
      }).sort((a,b) => new Date(b.date) - new Date(a.date))
  ), [currentDate, myAttendanceData]);

  return (
    <div className="container-fluid p-0 page-module-container">
      <header className="page-header d-flex justify-content-between align-items-center mb-4">
        <h1 className="page-main-title">My Attendance</h1>
      </header>

      <div className="my-attendance-stats-bar">
        <div className="stat-card"><span className="stat-value">{monthlyStats.scheduled}</span><span className="stat-label">Days Scheduled</span></div>
        <div className="stat-card"><span className="stat-value text-success">{monthlyStats.worked}</span><span className="stat-label">Days Worked</span></div>
        <div className="stat-card"><span className="stat-value text-warning">{monthlyStats.late}</span><span className="stat-label">Late Arrivals</span></div>
        <div className="stat-card"><span className="stat-value text-danger">{monthlyStats.absent}</span><span className="stat-label">Days Absent</span></div>
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
            <h6 className="mb-0">Daily Logs for {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h6>
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
                  <tr><td colSpan="5" className="text-center p-4 text-muted">No schedule found for this month.</td></tr>
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
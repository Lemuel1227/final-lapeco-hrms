import React, { useState, useMemo } from 'react';
import './MyPayrollPage.css';

const formatCurrency = (value) => Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const getCurrentPayPeriod = () => {
    const today = new Date();
    const dayOfMonth = today.getDate();
    const year = today.getFullYear();
    const month = today.getMonth();
    
    if (dayOfMonth <= 15) {
        return {
            start: new Date(year, month, 1).toISOString().split('T')[0],
            end: new Date(year, month, 15).toISOString().split('T')[0],
        };
    } else {
        return {
            start: new Date(year, month, 16).toISOString().split('T')[0],
            end: new Date(year, month + 1, 0).toISOString().split('T')[0],
        };
    }
};

const MyPayrollProjectionPage = ({ currentUser, positions = [], schedules = [], attendanceLogs = [], holidays = [] }) => {
  const [startDate, setStartDate] = useState(getCurrentPayPeriod().start);
  const [endDate, setEndDate] = useState(getCurrentPayPeriod().end);

  const positionMap = useMemo(() => new Map(positions.map(p => [p.id, p])), [positions]);
  const holidayMap = useMemo(() => new Map(holidays.map(h => [h.date, h])), [holidays]);
  const scheduleMap = useMemo(() => new Map(schedules.map(s => [`${s.empId}-${s.date}`, s])), [schedules]);
  const attendanceMap = useMemo(() => new Map(attendanceLogs.map(a => [`${a.empId}-${a.date}`, a])), [attendanceLogs]);
  
  const projectionData = useMemo(() => {
    if (!startDate || !endDate || new Date(endDate) < new Date(startDate)) {
      return null;
    }
    
    const position = positionMap.get(currentUser.positionId);
    if (!position) return null;

    const dailyRate = position.monthlySalary / 22;
    let totalGross = 0;
    const breakdown = [];
    const today = new Date();
    today.setHours(23, 59, 59, 999); 

    for (let d = new Date(startDate); d <= new Date(endDate); d.setDate(d.getDate() + 1)) {
        if (d > today) continue;
        
        const dateStr = d.toISOString().split('T')[0];
        const dayOfWeek = new Date(dateStr + 'T00:00:00').getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) continue;

        const schedule = scheduleMap.get(`${currentUser.id}-${dateStr}`);
        if (!schedule) continue;

        const attendance = attendanceMap.get(`${currentUser.id}-${dateStr}`);
        const holiday = holidayMap.get(dateStr);
        let dailyPay = 0;
        let dayStatus = 'Absent';

        if (attendance && attendance.signIn) {
            dailyPay = dailyRate;
            dayStatus = 'Present';
            if (holiday) {
                if (holiday.type === 'Regular Holiday') { dailyPay *= 2; }
                if (holiday.type === 'Special Non-Working Day') { dailyPay *= 1.3; }
                dayStatus = `Worked Holiday (${holiday.name})`;
            }
        }
        totalGross += dailyPay;
        breakdown.push({ date: dateStr, status: dayStatus, pay: dailyPay });
    }
    
    return {
        totalGross, 
        breakdown,
        cutOff: `${new Date(startDate + 'T00:00:00').toLocaleDateString('en-US', {month: 'short', day: 'numeric'})} - ${new Date(endDate + 'T00:00:00').toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'})}`
    };
  }, [startDate, endDate, currentUser, positionMap, scheduleMap, attendanceMap, holidayMap]);
  
  const hasValidDateRange = startDate && endDate && new Date(endDate) >= new Date(startDate);

  return (
    <div className="payroll-projection-container">
      <div className="card shadow-sm mb-4">
        <div className="card-body p-4">
          <h5 className="card-title section-title">Select Projection Period</h5>
          <p className="text-secondary">Select a date range to see your estimated gross income based on your attendance records.</p>
          <div className="row g-3">
            <div className="col-md-5"><label htmlFor="startDate" className="form-label fw-bold">Start Date</label><input type="date" id="startDate" className="form-control" value={startDate} onChange={e => setStartDate(e.target.value)} /></div>
            <div className="col-md-5"><label htmlFor="endDate" className="form-label fw-bold">End Date</label><input type="date" id="endDate" className="form-control" value={endDate} onChange={e => setEndDate(e.target.value)} /></div>
          </div>
        </div>
      </div>
      
      {hasValidDateRange && projectionData && (
        <div className="card shadow-sm">
            <div className="card-body p-4">
                <div className="projection-summary-card">
                    <div className="summary-label">Projected Gross Income</div>
                    <div className="summary-value">₱{formatCurrency(projectionData.totalGross)}</div>
                    <div className="summary-period">For Period: {projectionData.cutOff}</div>
                </div>
                
                <h6 className="mt-4 section-title">Daily Breakdown</h6>
                <div className="table-responsive breakdown-table-container">
                    <table className="table data-table table-sm table-striped mb-0">
                        <thead><tr><th>Date</th><th>Status</th><th className="text-end">Estimated Earning</th></tr></thead>
                        <tbody>
                            {projectionData.breakdown.length > 0 ? projectionData.breakdown.map((day, index) => (
                                <tr key={index}>
                                    <td>{new Date(day.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</td>
                                    <td>{day.status}</td>
                                    <td className="text-end">₱{formatCurrency(day.pay)}</td>
                                </tr>
                            )) : (
                                <tr><td colSpan="3" className="text-center p-4 text-muted">No attendance data to calculate for this period.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default MyPayrollProjectionPage;
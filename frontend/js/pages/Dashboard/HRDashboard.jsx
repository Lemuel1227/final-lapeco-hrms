import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Bar } from 'react-chartjs-2';
import { useState, useEffect } from 'react';
import { employeeAPI, positionAPI, leaveAPI, holidayAPI } from '../../services/api';

const HRDashboard = () => {
  const [employees, setEmployees] = useState([]);
  const [positions, setPositions] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [empRes, posRes, leaveRes, holidayRes] = await Promise.all([
          employeeAPI.getAll(),
          positionAPI.getAll(),
          leaveAPI.getAll(),
          holidayAPI.getAll(),
        ]);
        
        const empData = Array.isArray(empRes.data) ? empRes.data : (empRes.data?.data || []);
        setEmployees(empData);
        
        const posData = Array.isArray(posRes.data) ? posRes.data : (posRes.data?.data || []);
        setPositions(posData);
        
        const leaveData = Array.isArray(leaveRes.data) ? leaveRes.data : (leaveRes.data?.data || []);
        const mappedLeaves = leaveData.map(l => ({
          leaveId: l.id,
          empId: l.user?.id ?? l.user_id,
          name: l.user?.name ?? '',
          status: l.status,
          dateFrom: l.date_from,
          dateTo: l.date_to,
          type: l.type,
        }));
        setLeaveRequests(mappedLeaves);
        
        const holidayData = Array.isArray(holidayRes.data) ? holidayRes.data : (holidayRes.data?.data || []);
        const mappedHolidays = holidayData.map(h => ({
          id: h.id,
          name: h.title,
          date: h.date,
          type: h.type,
        }));
        setHolidays(mappedHolidays);
      } catch (err) {
        console.error('Error loading dashboard data:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const onLeaveToday = leaveRequests.filter(req => {
      if (req.status !== 'Approved') return false;
      const startDate = new Date(req.dateFrom);
      const endDate = new Date(req.dateTo);
      return startDate <= today && today <= endDate;
    }).length;

    return {
      totalEmployees: employees.length,
      onLeaveToday: onLeaveToday,
      pendingLeaves: leaveRequests.filter(req => req.status === 'Pending').length,
    };
  }, [employees, leaveRequests]);

  const chartData = useMemo(() => {
    const positionMap = new Map(positions.map(p => [p.id, p.title || p.name]));
    const counts = positions.reduce((acc, pos) => ({ ...acc, [pos.title]: 0 }), {});
    employees.forEach(emp => {
      const positionTitle = positionMap.get(emp.position_id || emp.positionId);
      if (positionTitle && counts.hasOwnProperty(positionTitle)) {
        counts[positionTitle]++;
      }
    });
    return {
      labels: Object.keys(counts),
      datasets: [{
        label: 'Employees',
        data: Object.values(counts),
        backgroundColor: 'rgba(25, 135, 84, 0.6)',
        borderColor: 'rgba(25, 135, 84, 1)',
        borderWidth: 1,
      }],
    };
  }, [employees, positions]);
  const chartOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { ticks: { stepSize: 1 } } } };

  const upcomingHolidays = useMemo(() => {
    const today = new Date();
    return holidays
      .filter(h => new Date(h.date) >= today)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 5);
  }, [holidays]);
  
  const pendingLeaveRequests = useMemo(() => leaveRequests.filter(r => r.status === 'Pending').slice(0, 5), [leaveRequests]);

  if (loading) {
    return (
      <div className="text-center p-5">
        <div className="spinner-border text-success" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-3">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-grid">
      <div className="dashboard-grid-span-4">
        <div className="dashboard-stats-container">
          <div className="dashboard-stat-card">
            <div className="stat-icon icon-employees"><i className="bi bi-people-fill"></i></div>
            <div className="stat-info"><span className="stat-value">{stats.totalEmployees}</span><span className="stat-label">Total Employees</span></div>
          </div>
          <div className="dashboard-stat-card">
            <div className="stat-icon icon-on-leave"><i className="bi bi-person-walking"></i></div>
            <div className="stat-info"><span className="stat-value">{stats.onLeaveToday}</span><span className="stat-label">On Leave Today</span></div>
          </div>
          <div className="dashboard-stat-card">
            <div className="stat-icon icon-pending"><i className="bi bi-hourglass-split"></i></div>
            <div className="stat-info"><span className="stat-value">{stats.pendingLeaves}</span><span className="stat-label">Pending Leaves</span></div>
          </div>
        </div>
      </div>

      <div className="dashboard-grid-span-2 dashboard-card">
        <div className="card-header"><h6>Pending Leave Requests</h6></div>
        <div className="card-body">
          <ul className="dashboard-list-group">
            {pendingLeaveRequests.length > 0 ? pendingLeaveRequests.map(req => (
              <li key={req.leaveId}><span>{req.name}</span> <span className="text-muted">{req.type}</span></li>
            )) : <li className="text-muted">No pending requests.</li>}
          </ul>
        </div>
        <div className="card-footer"><Link to="/dashboard/leave-management">View All</Link></div>
      </div>

      <div className="dashboard-grid-span-2 dashboard-card">
        <div className="card-header"><h6>Upcoming Holidays</h6></div>
        <div className="card-body">
          <ul className="dashboard-list-group">
            {upcomingHolidays.map(h => (
              <li key={h.id}><span>{h.name}</span> <span className="text-muted">{h.date}</span></li>
            ))}
          </ul>
        </div>
        <div className="card-footer"><Link to="/dashboard/holiday-management">View Calendar</Link></div>
      </div>

      <div className="dashboard-grid-span-4 dashboard-card">
        <div className="card-header"><h6>Employee Distribution by Position</h6></div>
        <div className="card-body" style={{ height: '300px' }}><Bar options={chartOptions} data={chartData} /></div>
      </div>
    </div>
  );
};

export default HRDashboard;
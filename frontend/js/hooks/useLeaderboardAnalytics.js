import { useMemo } from 'react';

export const useLeaderboardAnalytics = (props = {}, filters = {}) => {
  const { startDate, endDate, positionFilter } = filters;
  
  // Extract data from props with default empty arrays
  const employees = props.employees || [];
  const positions = props.positions || [];
  const schedules = props.schedules || [];
  const attendanceLogs = props.attendanceLogs || [];
  const leaveRequests = props.leaveRequests || [];
  const evaluations = props.evaluations || [];

  const analyticsData = useMemo(() => {
    // Early return if essential data is not available
    if (!employees.length || !positions.length) {
      return [];
    }

    const positionMap = new Map(positions.map(p => [p.id, p]));
    const attendanceMap = new Map(attendanceLogs.map(log => [`${log.empId}-${log.date}`, log]));
    const leaveMap = new Map();
    
    // Group leave requests by employee ID
    leaveRequests.forEach(leave => {
      const employeeId = leave.user_id || leave.empId; // Support both field names
      if (!leaveMap.has(employeeId)) {
        leaveMap.set(employeeId, []);
      }
      leaveMap.get(employeeId).push(leave);
    });
    
    const evaluationMap = new Map();
    
    // Group evaluations by employee ID
    evaluations.forEach(evaluation => {
      if (!evaluationMap.has(evaluation.empId)) {
        evaluationMap.set(evaluation.empId, []);
      }
      evaluationMap.get(evaluation.empId).push(evaluation);
    });

    return employees.map(employee => {
      const position = positionMap.get(employee.position_id);
      if (!position) return null;

      const empSchedules = schedules.filter(s => s.empId === employee.id);
      const empLogs = new Map();
      empSchedules.forEach(schedule => {
        const log = attendanceMap.get(`${schedule.empId}-${schedule.date}`);
        if (log) empLogs.set(schedule.date, log);
      });

      const empLeaves = leaveMap.get(employee.id) || [];
      const empEvals = (evaluationMap.get(employee.id) || []).sort((a, b) => new Date(b.date) - new Date(a.date));

      let absences = 0;
      let lates = 0;
      let presentDays = 0;

      empSchedules.forEach(schedule => {
        const log = empLogs.get(schedule.date);
        if (!log || !log.signIn) {
          absences++;
        } else {
          presentDays++;
          const shiftStartTime = schedule.shift ? schedule.shift.split(' - ')[0] : '00:00';
          if (log.signIn > shiftStartTime) { 
            lates++; 
          } 
        }
      });
      const attendanceScore = Math.max(0, 100 - (absences * 5) - (lates * 2));
      const latestPerformanceScore = empEvals.length > 0 ? empEvals[0].overallScore : 0;
      const overallScore = (latestPerformanceScore * 0.6) + (attendanceScore * 0.4);
      const leaveDays = empLeaves.reduce((sum, leave) => sum + leave.days, 0);
      let overtimeMinutes = 0;
      empSchedules.forEach(schedule => {
        const log = empLogs.get(schedule.date);
        if (log && log.signIn && log.signOut) {
          const signInTime = new Date(`1970-01-01T${log.signIn}`);
          const signOutTime = new Date(`1970-01-01T${log.signOut}`);
          let workDurationMinutes = (signOutTime - signInTime) / 60000;
          if(workDurationMinutes > 480) workDurationMinutes -= 60;
          const shiftDurationMinutes = 8 * 60;
          if(workDurationMinutes > shiftDurationMinutes) { overtimeMinutes += (workDurationMinutes - shiftDurationMinutes); }
        }
      });
      return { ...employee, positionTitle: position.title, absences, lates, presentDays, attendanceScore, performanceScore: latestPerformanceScore, overallScore, leaveDays, overtimeHours: overtimeMinutes / 60 };
    }).filter(Boolean);
  }, [employees, positions, schedules, attendanceLogs, leaveRequests, evaluations, startDate, endDate]);

  const filteredData = useMemo(() => {
    if (!analyticsData.length) return [];
    
    return analyticsData.filter(emp => {
      if (positionFilter && positionFilter !== 'All Positions' && emp.positionTitle !== positionFilter) {
        return false;
      }
      return true;
    });
  }, [analyticsData, positionFilter]);

  const sortedByOverallScore = useMemo(() => [...filteredData].sort((a, b) => b.overallScore - a.overallScore), [filteredData]);
  const sortedByTeamScore = useMemo(() => [...filteredData].filter(emp => emp.role === 'TEAM_LEADER').sort((a, b) => b.overallScore - a.overallScore), [filteredData]);
  const sortedByPresence = useMemo(() => [...filteredData].sort((a, b) => b.presentDays - a.presentDays), [filteredData]);
  const sortedByLates = useMemo(() => [...filteredData].sort((a, b) => b.lates - a.lates), [filteredData]);
  const sortedByLeaveDays = useMemo(() => [...filteredData].sort((a, b) => b.leaveDays - a.leaveDays), [filteredData]);
  const sortedByOvertime = useMemo(() => [...filteredData].sort((a, b) => b.overtimeHours - a.overtimeHours), [filteredData]);

  const summaryStats = useMemo(() => {
    if (!filteredData.length) {
      return {
        totalEmployees: 0,
        averageAttendanceScore: 0,
        averagePerformanceScore: 0,
        totalLeaveDays: 0,
        totalOvertime: 0
      };
    }

    const totalEmployees = filteredData.length;
    const averageAttendanceScore = filteredData.reduce((sum, emp) => sum + emp.attendanceScore, 0) / totalEmployees;
    const averagePerformanceScore = filteredData.reduce((sum, emp) => sum + emp.performanceScore, 0) / totalEmployees;
    const totalLeaveDays = filteredData.reduce((sum, emp) => sum + emp.leaveDays, 0);
    const totalOvertime = filteredData.reduce((sum, emp) => sum + emp.overtimeHours, 0);

    return { totalEmployees, averageAttendanceScore, averagePerformanceScore, totalLeaveDays, totalOvertime };
  }, [filteredData]);

  return {
    sortedByOverallScore,
    sortedByTeamScore,
    sortedByPresence,
    sortedByLates,
    sortedByLeaveDays,
    sortedByOvertime,
    summaryStats,
    isLoading: false
  };
};
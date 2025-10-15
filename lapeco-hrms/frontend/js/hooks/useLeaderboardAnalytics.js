import { useMemo } from 'react';
import { subDays, startOfDay, endOfDay } from 'date-fns';

export const useLeaderboardAnalytics = ({ employees, positions, schedules, attendanceLogs, leaveRequests, evaluations }, { startDate, endDate, positionFilter }) => {

  const analyticsData = useMemo(() => {
    const start = startDate ? startOfDay(new Date(startDate)) : startOfDay(subDays(new Date(), 89));
    const end = endDate ? endOfDay(new Date(endDate)) : endOfDay(new Date());
    
    const positionMap = new Map(positions.map(p => [p.id, p]));

    return employees.map(employee => {
      const position = positionMap.get(employee.positionId);
      if (!position) return null;
      const empSchedules = schedules.filter(s => s.empId === employee.id && new Date(s.date) >= start && new Date(s.date) <= end);
      const empLogs = new Map(attendanceLogs.filter(l => l.empId === employee.id && new Date(l.date) >= start && new Date(l.date) <= end).map(l => [l.date, l]));
      const empLeaves = leaveRequests.filter(l => l.empId === employee.id && l.status === 'Approved' && new Date(l.dateFrom) <= end && new Date(l.dateTo) >= start);
      const empEvals = evaluations.filter(ev => ev.employeeId === employee.id && new Date(ev.periodEnd) <= end).sort((a,b) => new Date(b.periodEnd) - new Date(a.periodEnd));
      
      let absences = 0, lates = 0, presentDays = 0;
      empSchedules.forEach(schedule => {
        const log = empLogs.get(schedule.date);
        if (!log || !log.signIn) { absences++; } else { presentDays++; if (log.signIn > (schedule.start_time || '00:00')) { lates++; } }
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
    if (!positionFilter) return analyticsData;
    return analyticsData.filter(emp => emp.positionTitle === positionFilter);
  }, [analyticsData, positionFilter]);

  // --- DERIVED RANKINGS & STATS ---
  const sortedByTeamScore = useMemo(() => {
    const leaders = employees.filter(e => e.isTeamLeader);
    const employeeScores = new Map(filteredData.map(e => [e.id, e.overallScore]));
    const positionMap = new Map(positions.map(p => [p.id, p.title]));
    const leaderScores = leaders.map(leader => {
      const teamMembers = employees.filter(e => e.positionId === leader.positionId && !e.isTeamLeader);
      if (teamMembers.length === 0) return null;
      let totalScore = 0;
      let membersWithScores = 0;
      teamMembers.forEach(member => {
        if (employeeScores.has(member.id)) { totalScore += employeeScores.get(member.id); membersWithScores++; }
      });
      const averageTeamScore = membersWithScores > 0 ? totalScore / membersWithScores : 0;
      return { ...leader, positionTitle: positionMap.get(leader.positionId) || 'Unassigned', averageTeamScore, teamSize: teamMembers.length };
    }).filter(Boolean);
    return leaderScores.sort((a, b) => b.averageTeamScore - a.averageTeamScore);
  }, [filteredData, employees, positions]);

  const sortedByOverallScore = useMemo(() => 
    [...filteredData].sort((a, b) => b.overallScore - a.overallScore), [filteredData]);
  const sortedByPresence = useMemo(() => 
    [...filteredData].sort((a, b) => b.presentDays - a.presentDays), [filteredData]);
  const sortedByLates = useMemo(() => 
    [...filteredData].sort((a, b) => b.lates - a.lates), [filteredData]);
  const sortedByLeaveDays = useMemo(() => 
    [...filteredData].sort((a, b) => b.leaveDays - a.leaveDays), [filteredData]);
  const sortedByOvertime = useMemo(() => 
    [...filteredData].sort((a, b) => b.overtimeHours - a.overtimeHours), [filteredData]);

  const summaryStats = useMemo(() => ({
    totalPresentDays: filteredData.reduce((sum, e) => sum + e.presentDays, 0),
    totalAbsences: filteredData.reduce((sum, e) => sum + e.absences, 0),
    totalLates: filteredData.reduce((sum, e) => sum + e.lates, 0),
    totalOvertime: filteredData.reduce((sum, e) => sum + e.overtimeHours, 0),
    totalLeaveDays: filteredData.reduce((sum, e) => sum + e.leaveDays, 0),
  }), [filteredData]);
  
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
export const generateAttendanceSummaryReport = async (layoutManager, dataSources, params) => {
  const { schedules, attendanceLogs, employees } = dataSources;
  const { doc, margin } = layoutManager;
  const date = params.startDate;

  if (!date) {
    doc.text("Error: No date was selected for this report.", margin, layoutManager.y);
    return;
  }

  // --- 1. DATA PREPARATION ---
  const schedulesForDate = schedules.filter(s => s.date === date);
  const attendanceForDate = attendanceLogs.filter(log => log.date === date);

  if (schedulesForDate.length === 0) {
    doc.text(`No employees were scheduled for ${date}.`, margin, layoutManager.y);
    return;
  }

  const stats = { Present: 0, Late: 0, Absent: 0 };
  schedulesForDate.forEach(sch => {
    const log = attendanceForDate.find(l => l.empId === sch.empId);
    if (!log || !log.signIn) {
      stats.Absent++;
    } else {
      stats.Present++;
      if (sch.start_time && log.signIn > sch.start_time) {
        stats.Late++;
      }
    }
  });
  // Note: 'Present' in stats includes 'Late' for the total count of physically present employees.
  const presentOnTime = stats.Present - stats.Late;

  // --- 2. CHART CONFIGURATION ---
  const chartConfig = {
    type: 'doughnut',
    data: {
      labels: [`Present (${presentOnTime})`, `Late (${stats.Late})`, `Absent (${stats.Absent})`],
      datasets: [{
        data: [presentOnTime, stats.Late, stats.Absent],
        backgroundColor: ['#198754', '#ffc107', '#dc3545']
      }]
    },
    options: { plugins: { legend: { position: 'right' } } }
  };
  
  // --- 3. SUMMARY TEXT ---
  const summaryText = `On ${date}, a total of ${schedulesForDate.length} employee(s) were scheduled. Of these, ${stats.Present} were present (${stats.Late} of whom were late), and ${stats.Absent} were absent.`;

  // --- 4. TABLE DATA ---
  const employeeMap = new Map(employees.map(e => [e.id, e]));
  const tableHead = ['ID', 'Name', 'Start Time', 'End Time', 'Sign In', 'Break Out', 'Break In', 'Sign Out', 'OT (hrs)', 'Status'];
  const tableBody = schedulesForDate.map(sch => {
    const log = attendanceForDate.find(l => l.empId === sch.empId);
    const emp = employeeMap.get(sch.empId);
    let status = "Absent";
    if (log && log.signIn) {
      status = (sch.start_time && log.signIn > sch.start_time) ? 'Late' : 'Present';
    }
    return [
      sch.empId, emp?.name || 'N/A', sch.start_time || 'N/A', sch.end_time || 'N/A',
      log?.signIn || '---', log?.breakOut || '---', log?.breakIn || '---', log?.signOut || '---',
      log?.overtime_hours || '0', status
    ];
  });

  // --- 5. PDF ASSEMBLY ---
  await layoutManager.addChartWithTitle(`Attendance Overview for ${date}`, chartConfig, { height: 180 });
  layoutManager.addSummaryText(summaryText);
  layoutManager.addSectionTitle("Daily Attendance Log");
  layoutManager.addTable([tableHead], tableBody);
};
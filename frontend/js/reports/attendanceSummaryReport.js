import autoTable from 'jspdf-autotable';

/**
 * Generates the Daily Attendance Summary Report.
 * @param {jsPDF} doc - The jsPDF instance.
 * @param {object} params - Report parameters (e.g., startDate).
 * @param {object} dataSources - Contains all mock data (employees, schedules, etc.).
 * @param {function} addChartAndTitle - Helper function to add a chart to the PDF.
 * @returns {jsPDF} The modified jsPDF document.
 */
export const generateAttendanceSummaryReport = async (doc, params, dataSources, addChartAndTitle) => {
  const { schedules, attendanceLogs, employees } = dataSources;
  const date = params.startDate;

  if (!date) {
    doc.text("Error: No date was selected for this report.", params.margin, params.startY);
    return doc;
  }

  // 1. Filter data for the selected date
  const schedulesForDate = schedules.filter(s => s.date === date);
  const attendanceForDate = attendanceLogs.filter(log => log.date === date);

  if (schedulesForDate.length === 0) {
    doc.text(`No employees were scheduled for ${date}.`, params.margin, params.startY);
    return doc;
  }

  // 2. Calculate stats for the chart
  const stats = { Present: 0, Late: 0, Absent: 0 };
  schedulesForDate.forEach(sch => {
    const log = attendanceForDate.find(l => l.empId === sch.empId);
    if (!log || !log.signIn) {
      stats.Absent++;
    } else {
      if (sch.shift) {
        const shiftStart = sch.shift.split(' - ')[0];
        if (log.signIn > shiftStart) {
          stats.Late++;
        } else {
          stats.Present++;
        }
      } else {
        stats.Present++; // Default to Present if no shift time is defined
      }
    }
  });

  // 3. Configure and add the chart to the PDF
  const chartConfig = {
    type: 'doughnut',
    data: {
      labels: Object.keys(stats),
      datasets: [{
        data: Object.values(stats),
        backgroundColor: ['#198754', '#ffc107', '#dc3545']
      }]
    },
    options: {
      plugins: {
        legend: { position: 'right' }
      }
    }
  };
  let finalY = await addChartAndTitle(`Attendance Overview for ${date}`, chartConfig);

  // 4. Prepare data for the main table
  const employeeMap = new Map(employees.map(e => [e.id, e]));
  const tableColumns = ['ID', 'Name', 'Shift', 'Sign In', 'Sign Out', 'Status'];
  const tableRows = schedulesForDate.map(sch => {
    const log = attendanceForDate.find(l => l.empId === sch.empId);
    const emp = employeeMap.get(sch.empId);
    let status = "Absent";
    if (log && log.signIn) {
      if (sch.shift) {
        const shiftStart = sch.shift.split(' - ')[0];
        status = log.signIn > shiftStart ? 'Late' : 'Present';
      } else {
        status = 'Present';
      }
    }
    return [
      sch.empId,
      emp?.name || 'N/A',
      sch.shift || 'N/A',
      log?.signIn || '---',
      log?.signOut || '---',
      status
    ];
  });

  // 5. Add the table to the PDF
  autoTable(doc, {
    head: [tableColumns],
    body: tableRows,
    startY: finalY,
    theme: 'striped',
    headStyles: { fillColor: [25, 135, 84] }
  });

  return doc;
};
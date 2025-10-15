export const generateTrainingProgramReport = async (layoutManager, dataSources, params) => {
  const { trainingPrograms, enrollments, employees } = dataSources;
  const { programId } = params;
  const { doc, margin } = layoutManager;

  // --- 1. DATA PREPARATION ---
  const program = trainingPrograms.find(p => p.id.toString() === programId.toString());
  if (!program) {
    doc.text("The selected training program could not be found.", margin, layoutManager.y);
    return;
  }

  const programEnrollments = (enrollments || []).filter(e => e.programId.toString() === programId.toString());

  if (programEnrollments.length === 0) {
    doc.text(`There are no employees enrolled in "${program.title}".`, margin, layoutManager.y);
    return;
  }

  const stats = { 'Completed': 0, 'In Progress': 0, 'Not Started': 0 };
  programEnrollments.forEach(e => {
    stats[e.status]++;
  });

  const completionRate = programEnrollments.length > 0
    ? (stats['Completed'] / programEnrollments.length) * 100
    : 0;

  // --- 2. CHART CONFIGURATION ---
  const chartConfig = {
    type: 'pie',
    data: {
      labels: Object.keys(stats),
      datasets: [{
        data: Object.values(stats),
        backgroundColor: ['#198754', '#0dcaf0', '#6c757d'],
      }]
    },
    options: {
      plugins: {
        legend: { position: 'right' }
      }
    }
  };

  // --- 3. SUMMARY TEXT ---
  const summaryText = `This report summarizes the status for the "${program.title}" training program. A total of ${programEnrollments.length} employee(s) are enrolled. The overall completion rate for this program is currently ${completionRate.toFixed(1)}%.`;
  
  // --- 4. TABLE DATA ---
  const employeeMap = new Map(employees.map(e => [e.id, e.name]));
  const tableHead = ['Employee ID', 'Employee Name', 'Progress', 'Status'];
  const tableBody = programEnrollments.map(enr => [
    enr.employeeId,
    employeeMap.get(enr.employeeId) || 'N/A',
    `${enr.progress || 0}%`,
    enr.status
  ]);
  
  // --- 5. PDF ASSEMBLY ---
  await layoutManager.addChartWithTitle(`Enrollment Status for "${program.title}"`, chartConfig);
  layoutManager.addSummaryText(summaryText);
  layoutManager.addSectionTitle("Detailed Enrollment List");
  layoutManager.addTable([tableHead], tableBody, {
    columnStyles: { 2: { halign: 'left' } }
  });
};
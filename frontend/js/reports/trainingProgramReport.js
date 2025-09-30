import autoTable from 'jspdf-autotable';

/**
 * Generates the Training Program Summary Report.
 * @param {jsPDF} doc - The jsPDF instance.
 * @param {object} params - Report parameters (e.g., programId).
 * @param {object} dataSources - Contains all mock data (trainingPrograms, enrollments, employees).
 * @param {function} addChartAndTitle - Helper function to add a chart to the PDF.
 * @returns {jsPDF} The modified jsPDF document.
 */
export const generateTrainingProgramReport = async (doc, params, dataSources, addChartAndTitle) => {
  const { trainingPrograms, enrollments, employees } = dataSources;
  const { programId, margin } = params;

  // 1. Find the selected program
  const program = trainingPrograms.find(p => p.id.toString() === programId.toString());
  if (!program) {
    doc.text("The selected training program could not be found.", margin, params.startY);
    return doc;
  }

  // 2. Filter enrollments for this program
  const programEnrollments = (enrollments || []).filter(e => e.programId.toString() === programId.toString());

  if (programEnrollments.length === 0) {
    doc.text(`There are no employees enrolled in "${program.title}".`, margin, params.startY);
    return doc;
  }

  // 3. Aggregate data for the enrollment status chart
  const stats = { 'Completed': 0, 'In Progress': 0, 'Not Started': 0 };
  programEnrollments.forEach(e => {
    stats[e.status]++;
  });

  // 4. Configure and add the chart to the PDF
  const chartConfig = {
    type: 'pie',
    data: {
      labels: Object.keys(stats),
      datasets: [{
        data: Object.values(stats),
        backgroundColor: ['#198754', '#0dcaf0', '#6c757d'],
        borderColor: '#fff',
        borderWidth: 2,
      }]
    },
    options: {
      plugins: {
        legend: { position: 'right' }
      }
    }
  };
  let finalY = await addChartAndTitle(`Enrollment Status for "${program.title}"`, chartConfig);

  // 5. Prepare data for the main table
  const employeeMap = new Map(employees.map(e => [e.id, e.name]));
  const tableColumns = ['Employee ID', 'Employee Name', 'Progress', 'Status'];
  const tableRows = programEnrollments.map(enr => [
    enr.employeeId,
    employeeMap.get(enr.employeeId) || 'N/A',
    `${enr.progress || 0}%`,
    enr.status
  ]);

  // 6. Add the table to the PDF
  autoTable(doc, {
    head: [tableColumns],
    body: tableRows,
    startY: finalY,
    theme: 'striped',
    headStyles: { fillColor: [25, 135, 84] }
  });

  return doc;
};
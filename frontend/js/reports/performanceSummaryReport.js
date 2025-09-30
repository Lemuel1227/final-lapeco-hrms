import autoTable from 'jspdf-autotable';

/**
 * Generates the Performance Summary Report.
 * @param {jsPDF} doc - The jsPDF instance.
 * @param {object} params - Report parameters (e.g., startDate, endDate).
 * @param {object} dataSources - Contains all mock data (evaluations, employees, positions).
 * @param {function} addChartAndTitle - Helper function to add a chart to the PDF.
 * @returns {jsPDF} The modified jsPDF document.
 */
export const generatePerformanceSummaryReport = async (doc, params, dataSources, addChartAndTitle) => {
  const { evaluations, employees, positions } = dataSources;
  const { startDate, endDate, margin } = params;

  // 1. Filter evaluations based on the selected date range
  const filteredEvals = (evaluations || []).filter(ev => {
    const evalDate = new Date(ev.periodEnd);
    return evalDate >= new Date(startDate) && evalDate <= new Date(endDate);
  });

  if (filteredEvals.length === 0) {
    doc.text("No performance evaluations were found for the selected period.", margin, params.startY);
    return doc;
  }

  // 2. Aggregate data for the performance distribution chart
  const brackets = { 'Needs Improvement (<70%)': 0, 'Meets Expectations (70-90%)': 0, 'Outstanding (>90%)': 0 };
  filteredEvals.forEach(ev => {
    if (ev.overallScore < 70) {
      brackets['Needs Improvement (<70%)']++;
    } else if (ev.overallScore < 90) {
      brackets['Meets Expectations (70-90%)']++;
    } else {
      brackets['Outstanding (>90%)']++;
    }
  });

  // 3. Configure and add the chart to the PDF
  const chartConfig = {
    type: 'bar',
    data: {
      labels: Object.keys(brackets),
      datasets: [{
        label: 'Number of Employees',
        data: Object.values(brackets),
        backgroundColor: ['#dc3545', '#ffc107', '#198754']
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1 }
        }
      }
    }
  };
  let finalY = await addChartAndTitle(`Performance Distribution (${startDate} to ${endDate})`, chartConfig);

  // 4. Prepare data for the main table
  const employeeMap = new Map(employees.map(e => [e.id, e]));
  const positionMap = new Map(positions.map(p => [p.id, p.title]));
  const tableColumns = ['Employee', 'Position', 'Evaluator', 'Evaluation Date', 'Score'];
  const tableRows = filteredEvals.map(ev => {
    const emp = employeeMap.get(ev.employeeId);
    const evaluator = employeeMap.get(ev.evaluatorId);
    return [
      emp?.name || ev.employeeId,
      positionMap.get(emp?.positionId) || 'N/A',
      evaluator?.name || ev.evaluatorId,
      ev.periodEnd,
      `${ev.overallScore.toFixed(2)}%`
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
import autoTable from 'jspdf-autotable';

/**
 * Generates the Disciplinary Cases Report.
 * @param {jsPDF} doc - The jsPDF instance.
 * @param {object} params - Report parameters (e.g., startDate, endDate).
 * @param {object} dataSources - Contains all mock data (cases, employees).
 * @param {function} addChartAndTitle - Helper function to add a chart to the PDF.
 * @returns {jsPDF} The modified jsPDF document.
 */
export const generateDisciplinaryCasesReport = async (doc, params, dataSources, addChartAndTitle) => {
  const { cases, employees } = dataSources;
  const { startDate, endDate, margin } = params;

  // 1. Filter cases based on the selected date range
  const filteredCases = (cases || []).filter(c => {
    const caseDate = new Date(c.issueDate);
    return caseDate >= new Date(startDate) && caseDate <= new Date(endDate);
  });

  if (filteredCases.length === 0) {
    doc.text("No disciplinary cases were found for the selected period.", margin, params.startY);
    return doc;
  }

  // 2. Aggregate data for the chart
  const actionTypeCounts = filteredCases.reduce((acc, c) => {
    acc[c.actionType] = (acc[c.actionType] || 0) + 1;
    return acc;
  }, {});

  // 3. Configure and add the chart to the PDF
  const chartConfig = {
    type: 'pie',
    data: {
      labels: Object.keys(actionTypeCounts),
      datasets: [{
        data: Object.values(actionTypeCounts),
        backgroundColor: ['#ffc107', '#fd7e14', '#dc3545', '#6f42c1', '#0dcaf0', '#6c757d'],
        borderColor: '#fff',
        borderWidth: 2,
      }]
    },
    options: {
      plugins: { legend: { position: 'right' } }
    }
  };
  let finalY = await addChartAndTitle(`Cases by Action Type (${startDate} to ${endDate})`, chartConfig);

  // 4. Prepare data for the main table
  const employeeMap = new Map(employees.map(e => [e.id, e.name]));
  const tableColumns = ["Case ID", "Employee Name", "Reason / Infraction", "Action Type", "Issue Date", "Status"];
  const tableRows = filteredCases.map(c => [
    c.caseId,
    employeeMap.get(c.employeeId) || c.employeeId,
    c.reason,
    c.actionType,
    c.issueDate,
    c.status
  ]);

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
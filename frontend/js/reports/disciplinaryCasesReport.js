export const generateDisciplinaryCasesReport = async (layoutManager, dataSources, params) => {
  const { cases, employees } = dataSources;
  const { startDate, endDate } = params;
  const { doc, margin } = layoutManager;

  const filteredCases = (cases || []).filter(c => {
    const caseDate = new Date(c.issueDate);
    return caseDate >= new Date(startDate) && caseDate <= new Date(endDate);
  });

  if (filteredCases.length === 0) {
    doc.text("No disciplinary cases were found for the selected period.", margin, layoutManager.y);
    return;
  }

  layoutManager.addSectionTitle(`Cases by Action Type (${startDate} to ${endDate})`, { spaceBefore: 0, fontSize: 14 });

  const actionTypeCounts = filteredCases.reduce((acc, c) => {
    acc[c.actionType] = (acc[c.actionType] || 0) + 1;
    return acc;
  }, {});

  const chartConfig = {
    type: 'pie',
    data: {
      labels: Object.keys(actionTypeCounts),
      datasets: [{
        data: Object.values(actionTypeCounts),
        backgroundColor: ['#ffc107', '#fd7e14', '#dc3545', '#6f42c1', '#0dcaf0', '#6c757d'],
      }]
    },
    options: { plugins: { legend: { position: 'right' } } }
  };
  await layoutManager.addChart(chartConfig, { height: 180 });

  layoutManager.addSectionTitle("Case Details");

  const employeeMap = new Map(employees.map(e => [e.id, e.name]));
  const tableHead = ["Case ID", "Employee Name", "Reason / Infraction", "Action Type", "Issue Date", "Status"];
  const tableBody = filteredCases.map(c => [
    c.caseId, employeeMap.get(c.employeeId) || c.employeeId, c.reason,
    c.actionType, c.issueDate, c.status
  ]);

  layoutManager.addTable([tableHead], tableBody);
};
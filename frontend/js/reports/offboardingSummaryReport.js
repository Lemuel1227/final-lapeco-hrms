export const generateOffboardingSummaryReport = async (layoutManager, dataSources, params) => {
  const { resignations, terminations, employees } = dataSources;
  const { startDate, endDate } = params;
  const { doc, margin } = layoutManager;

  const start = new Date(startDate);
  const end = new Date(endDate);

  const filteredResignations = (resignations || []).filter(r => {
    const effectiveDate = new Date(r.effectiveDate);
    return r.status === 'Approved' && effectiveDate >= start && effectiveDate <= end;
  });

  const filteredTerminations = (terminations || []).filter(t => {
    const termDate = new Date(t.date);
    return termDate >= start && termDate <= end;
  });

  if (filteredResignations.length === 0 && filteredTerminations.length === 0) {
    doc.text("No offboarding activity found for the selected period.", margin, layoutManager.y);
    return;
  }
  
  layoutManager.addSectionTitle(`Offboarding Types (${startDate} to ${endDate})`, { spaceBefore: 0, fontSize: 14 });
  
  const chartConfig = {
    type: 'pie',
    data: {
      labels: ['Voluntary Resignations', 'Involuntary Terminations'],
      datasets: [{
        data: [filteredResignations.length, filteredTerminations.length],
        backgroundColor: ['#6c757d', '#dc3545'],
      }]
    },
    options: { plugins: { legend: { position: 'right' } } }
  };
  await layoutManager.addChart(chartConfig, { height: 180 });

  const employeeMap = new Map(employees.map(e => [e.id, e]));

  if (filteredResignations.length > 0) {
    layoutManager.addSectionTitle("Voluntary Resignations");
    const resTableHead = ["Employee Name", "Last Position", "Effective Date", "Reason"];
    const resTableBody = filteredResignations.map(r => [
      r.employeeName, r.position, r.effectiveDate, r.reason,
    ]);
    layoutManager.addTable([resTableHead], resTableBody);
  }

  if (filteredTerminations.length > 0) {
    layoutManager.addSectionTitle("Involuntary Terminations");
    const termTableHead = ["Employee Name", "Termination Date", "Reason", "Comments"];
    const termTableBody = filteredTerminations.map(t => {
      const emp = employeeMap.get(t.employeeId);
      return [emp?.name || t.employeeId, t.date, t.reason, t.comments];
    });
    layoutManager.addTable([termTableHead], termTableBody);
  }
};
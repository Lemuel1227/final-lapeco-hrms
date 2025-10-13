import autoTable from 'jspdf-autotable';

export const generateOffboardingSummaryReport = async (doc, params, dataSources, addChartAndTitle) => {
  const { resignations, terminations, employees } = dataSources;
  const { startDate, endDate, margin } = params;

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
    doc.text("No offboarding activity found for the selected period.", margin, params.startY);
    return doc;
  }

  // Chart
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
  let finalY = await addChartAndTitle(`Offboarding Types (${startDate} to ${endDate})`, chartConfig);

  const employeeMap = new Map(employees.map(e => [e.id, e]));

  // Resignations Table
  if (filteredResignations.length > 0) {
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text("Voluntary Resignations", margin, finalY);
    finalY += 15;

    const resTableColumns = ["Employee Name", "Last Position", "Effective Date", "Reason"];
    const resTableRows = filteredResignations.map(r => [
      r.employeeName,
      r.position,
      r.effectiveDate,
      r.reason,
    ]);
    autoTable(doc, { head: [resTableColumns], body: resTableRows, startY: finalY, theme: 'striped' });
    finalY = doc.lastAutoTable.finalY + 25;
  }

  // Terminations Table
  if (filteredTerminations.length > 0) {
    if (finalY > doc.internal.pageSize.getHeight() - 100) {
      doc.addPage();
      finalY = params.startY;
    }
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text("Involuntary Terminations", margin, finalY);
    finalY += 15;

    const termTableColumns = ["Employee Name", "Termination Date", "Reason", "Comments"];
    const termTableRows = filteredTerminations.map(t => {
        const emp = employeeMap.get(t.employeeId);
        return [
            emp?.name || t.employeeId,
            t.date,
            t.reason,
            t.comments
        ];
    });
    autoTable(doc, { head: [termTableColumns], body: termTableRows, startY: finalY, theme: 'striped' });
  }

  return doc;
};
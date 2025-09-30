import autoTable from 'jspdf-autotable';

export const generateEmployeeMasterlistReport = async (doc, params, dataSources, addChartAndTitle) => {
  const { employees, positions } = dataSources;
  
  const positionMap = new Map(positions.map(p => [p.id, p.title]));
  const counts = positions.reduce((acc, pos) => ({ ...acc, [pos.title]: 0 }), {});
  employees.forEach(emp => {
      const positionTitle = positionMap.get(emp.positionId);
      if (positionTitle && counts.hasOwnProperty(positionTitle)) counts[positionTitle]++;
  });

  const chartConfig = { type: 'bar', data: { labels: Object.keys(counts), datasets: [{ label: 'Employees', data: Object.values(counts), backgroundColor: 'rgba(25, 135, 84, 0.6)' }] }, options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } } };
  
  let finalY = await addChartAndTitle("Employee Distribution by Position", chartConfig);

  const tableColumns = ['ID', 'Name', 'Position', 'Email', 'Joining Date'];
  const tableRows = employees.map(emp => [emp.id, emp.name, positionMap.get(emp.positionId) || 'Unassigned', emp.email, emp.joiningDate]);
  
  autoTable(doc, { head: [tableColumns], body: tableRows, startY: finalY, theme: 'striped', headStyles: { fillColor: [25, 135, 84] } });

  return doc;
};
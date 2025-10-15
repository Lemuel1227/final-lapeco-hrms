export const generateEmployeeMasterlistReport = async (layoutManager, dataSources) => {
  const { employees, positions } = dataSources;
  
  // --- 1. DATA PREPARATION ---
  const positionMap = new Map(positions.map(p => [p.id, p.title]));
  
  const counts = positions.reduce((acc, pos) => ({ ...acc, [pos.title]: 0 }), {});
  employees.forEach(emp => {
      const positionTitle = positionMap.get(emp.positionId);
      if (positionTitle && counts.hasOwnProperty(positionTitle)) counts[positionTitle]++;
  });

  const activePositions = Object.entries(counts).filter(([, count]) => count > 0);
  const mostPopulousPosition = activePositions.sort((a, b) => b[1] - a[1])[0] || ['N/A', 0];

  // --- 2. CHART CONFIGURATION ---
  const chartConfig = {
    type: 'bar',
    data: {
      labels: activePositions.map(([title]) => title),
      datasets: [{
        label: 'Employees',
        data: activePositions.map(([, count]) => count),
        backgroundColor: 'rgba(25, 135, 84, 0.6)'
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
    }
  };
  
  // --- 3. SUMMARY TEXT ---
  const summaryText = `This report provides a complete list of all ${employees.length} active employees in the organization. The data indicates that '${mostPopulousPosition[0]}' is currently the position with the most employees, having ${mostPopulousPosition[1]} individuals.`;
  
  // --- 4. TABLE DATA ---
  const tableHead = ['ID', 'Name', 'Position', 'Email', 'Joining Date'];
  const tableBody = employees.map(emp => [
    emp.id,
    emp.name,
    positionMap.get(emp.positionId) || 'Unassigned',
    emp.email,
    emp.joiningDate
  ]);

  // --- 5. PDF ASSEMBLY using LayoutManager ---
  await layoutManager.addChartWithTitle("Employee Distribution by Position", chartConfig, { height: 200 });
  layoutManager.addSummaryText(summaryText);
  layoutManager.addSectionTitle("Detailed Masterlist");
  layoutManager.addTable([tableHead], tableBody);
};
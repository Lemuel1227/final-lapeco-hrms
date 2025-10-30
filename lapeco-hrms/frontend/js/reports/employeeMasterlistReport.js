export const generateEmployeeMasterlistReport = async (layoutManager, dataSources) => {
  const { employees = [], positions = [] } = dataSources;
  
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
  
  // Add section title with proper spacing
  layoutManager.addSectionTitle("Detailed Masterlist");
  layoutManager.y += 5; // Add spacing after section title
  
  const { doc, margin } = layoutManager;
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Add total count box
  const boxHeight = 14;
  const textPadding = 5;
  
  doc.setFillColor(25, 135, 84); // Green background
  doc.setDrawColor(25, 135, 84);
  doc.roundedRect(margin, layoutManager.y, pageWidth - 2 * margin, boxHeight, 2, 2, 'FD');
  
  doc.setTextColor(255, 255, 255); // White text
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  
  // Center text vertically: y position = box top + (box height / 2) + (font size / 2) - 1
  const textY = layoutManager.y + (boxHeight / 2) + (11 / 2) - 1;
  doc.text(`Total Employees: ${employees.length}`, margin + textPadding, textY);
  
  doc.setTextColor(0, 0, 0); // Reset to black
  doc.setFont('helvetica', 'normal');
  
  layoutManager.y += 20; // Add proper spacing after count box before table
  
  layoutManager.addTable([tableHead], tableBody);
};
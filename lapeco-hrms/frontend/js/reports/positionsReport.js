import { formatCurrency } from '../utils/formatters';

export const generatePositionsReport = async (layoutManager, dataSources) => {
  const { employees, positions } = dataSources;
  const { doc, margin } = layoutManager;

  if (!positions || positions.length === 0) {
    doc.text("No position data found to generate a report.", margin, layoutManager.y);
    return;
  }

  // --- 1. DATA PREPARATION ---
  const employeeCounts = positions.reduce((acc, pos) => {
    acc[pos.id] = employees.filter(emp => emp.positionId === pos.id).length;
    return acc;
  }, {});

  const highestSalaryPosition = [...positions].sort((a, b) => b.monthlySalary - a.monthlySalary)[0];

  // --- 2. CHART CONFIGURATION ---
  const countChartConfig = {
    type: 'bar',
    data: {
      labels: positions.map(p => p.title),
      datasets: [{
        label: 'Number of Employees',
        data: positions.map(p => employeeCounts[p.id] || 0),
        backgroundColor: 'rgba(25, 135, 84, 0.6)'
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
    }
  };
  
  // --- 3. SUMMARY TEXT ---
  const summaryText = `This report outlines the ${positions.length} defined positions within the company. The role with the highest base salary is '${highestSalaryPosition.title}' at ${formatCurrency(highestSalaryPosition.monthlySalary)}. The chart above illustrates the current headcount for each position, providing a clear overview of workforce distribution.`;

  // --- 4. TABLE DATA ---
  const tableHead = ['Position Title', 'Count', 'Salary', 'Description'];
  const tableBody = positions.map(pos => [
    pos.title,
    employeeCounts[pos.id] || 0,
    formatCurrency(pos.monthlySalary),
    pos.description
  ]);
  
  // --- 5. PDF ASSEMBLY ---
  await layoutManager.addChartWithTitle("Employee Count by Position", countChartConfig, { height: 200 });
  layoutManager.addSummaryText(summaryText);
  layoutManager.addSectionTitle("Position Details");
  
  // MODIFIED: Enforced explicit column widths to guarantee correct layout
  layoutManager.addTable([tableHead], tableBody, {
    columnStyles: {
      0: { cellWidth: 110 },       // Position Title
      1: { halign: 'center', cellWidth: 50 }, // Count
      2: { halign: 'left', cellWidth: 100 }, // Salary
      3: { cellWidth: 'auto' },      // Description will take the remaining space
    }
  });
};
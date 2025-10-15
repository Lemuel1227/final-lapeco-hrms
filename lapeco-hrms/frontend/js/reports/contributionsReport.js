import { generateSssData, generatePhilhealthData, generatePagibigData } from '../hooks/contributionUtils';
import { formatCurrency } from '../utils/formatters';

const addContributionSection = (layoutManager, title, data) => {
  layoutManager.addSectionTitle(title, { fontSize: 14, spaceBefore: 15, spaceAfter: 10 });

  const tableHead = data.columns.map(c => c.label);
  
  const tableBody = data.rows.map(row => {
    return data.columns.map(col => {
      const value = row[col.key];
      if (['employeeContribution', 'employerContribution', 'totalContribution'].includes(col.key)) {
        return formatCurrency(value);
      }
      return value;
    });
  });

  layoutManager.addTable([tableHead], tableBody, {
    columnStyles: {
      5: { halign: 'right' }, // EE Share
      6: { halign: 'right' }, // ER Share
      7: { halign: 'right' }, // Total
    }
  });
};

export const generateContributionsReport = async (layoutManager, dataSources, params) => {
  const { employees, positions, payrolls } = dataSources;
  const { runId } = params;
  const { doc, margin } = layoutManager;

  const selectedRun = payrolls.find(p => p.runId === runId);
  if (!selectedRun) {
    doc.text("The selected payroll run could not be found.", margin, layoutManager.y);
    return;
  }

  // --- 1. DATA PREPARATION ---
  const sssData = generateSssData(employees, positions, selectedRun);
  const philhealthData = generatePhilhealthData(employees, positions, selectedRun);
  const pagibigData = generatePagibigData(employees, positions, selectedRun);

  const calculateTotal = (data) => data.rows.reduce((sum, row) => sum + (row.totalContribution || 0), 0);
  const sssTotal = calculateTotal(sssData);
  const philhealthTotal = calculateTotal(philhealthData);
  const pagibigTotal = calculateTotal(pagibigData);
  const grandTotal = sssTotal + philhealthTotal + pagibigTotal;

  // --- 2. CHART CONFIGURATION ---
  const chartConfig = {
    type: 'bar',
    data: {
      labels: ['SSS', 'PhilHealth', 'Pag-IBIG'],
      datasets: [{
        label: 'Total Contribution (PHP)',
        data: [sssTotal, philhealthTotal, pagibigTotal],
        backgroundColor: [
          'rgba(13, 110, 253, 0.6)',  // SSS - Blue
          'rgba(220, 53, 69, 0.6)',   // PhilHealth - Red
          'rgba(25, 135, 84, 0.6)',  // Pag-IBIG - Green
        ],
      }],
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { callback: value => `PHP ${(value / 1000)}k` }
        }
      }
    }
  };
  
  // --- 3. SUMMARY TEXT ---
  const summaryText = `For the pay period ${selectedRun.cutOff}, the total combined mandatory contribution amounts to ${formatCurrency(grandTotal)}. This comprises ${formatCurrency(sssTotal)} for SSS, ${formatCurrency(philhealthTotal)} for PhilHealth, and ${formatCurrency(pagibigTotal)} for Pag-IBIG. Detailed breakdowns for each contribution type are provided below.`;

  // --- 4. PDF ASSEMBLY ---
  await layoutManager.addChartWithTitle("Total Contributions Overview", chartConfig, { height: 180 });
  layoutManager.addSummaryText(summaryText);
  
  // Add each detailed section table
  addContributionSection(layoutManager, 'SSS Contributions', sssData);
  addContributionSection(layoutManager, 'PhilHealth Contributions', philhealthData);
  addContributionSection(layoutManager, 'Pag-IBIG Contributions', pagibigData);
};
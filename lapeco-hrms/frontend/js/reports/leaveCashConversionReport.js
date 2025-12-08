import { formatDate } from '../utils/dateUtils';
import { formatCurrency } from '../utils/formatters';

export const generateLeaveCashConversionReport = async (layoutManager, dataSources, params) => {
  const { cashRecords } = dataSources;
  const { year } = params;
  const { doc, margin } = layoutManager;

  // --- 1. DATA PREPARATION ---
  const filteredRecords = cashRecords || [];

  if (filteredRecords.length === 0) {
    doc.text(`No leave cash conversion records found for the year ${year}.`, margin, layoutManager.y);
    return;
  }

  // Calculate totals
  const totalAmount = filteredRecords.reduce((sum, r) => sum + Number(r.totalAmount || 0), 0);
  const totalPaid = filteredRecords.filter(r => r.status === 'Paid').reduce((sum, r) => sum + Number(r.totalAmount || 0), 0);
  
  const statusCounts = filteredRecords.reduce((acc, r) => {
    const status = r.status || 'Pending';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  // --- 2. CHART CONFIGURATION ---
  const chartConfig = {
    type: 'pie',
    data: {
      labels: Object.keys(statusCounts),
      datasets: [{
        data: Object.values(statusCounts),
        backgroundColor: ['#0d6efd', '#198754', '#ffc107', '#0dcaf0', '#6c757d', '#e83e8c'],
      }]
    },
    options: { 
        plugins: { 
            legend: { position: 'right' },
            title: { display: true, text: 'Request Status Distribution' }
        } 
    }
  };

  // --- 3. SUMMARY TEXT ---
  const summaryText = `This report summarizes the Leave Cash Conversion for the year ${year}. \n\n` +
    `Total Requests: ${filteredRecords.length}\n` +
    `Total Amount (All Statuses): ${formatCurrency(totalAmount)}\n` +
    `Total Amount Paid: ${formatCurrency(totalPaid)}`;

  // --- 4. TABLE DATA ---
  const tableHead = ["Name", "Position", "VL Conv.", "SL Conv.", "Total Amount", "Status", "Date"];
  const tableBody = filteredRecords.map(r => [
    r.name, 
    r.position, 
    r.vacationDays, 
    r.sickDays, 
    formatCurrency(r.totalAmount), 
    r.status,
    r.processedAt ? formatDate(new Date(r.processedAt), 'short') : '-'
  ]);

  // --- 5. PDF ASSEMBLY ---
  layoutManager.addSummaryText(summaryText);
  await layoutManager.addChartWithTitle(`Status Breakdown (${year})`, chartConfig, { height: 180 });
  layoutManager.addSectionTitle(`Cash Conversion Details - ${year}`);
  layoutManager.addTable([tableHead], tableBody);
};

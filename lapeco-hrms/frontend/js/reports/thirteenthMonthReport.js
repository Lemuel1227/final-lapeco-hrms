import { formatCurrency } from '../utils/formatters';

export const generateThirteenthMonthReport = async (layoutManager, dataSources, params) => {
  const { thirteenthMonthPayData } = dataSources;
  const { year } = params;
  const { doc, margin } = layoutManager;

  if (!thirteenthMonthPayData || thirteenthMonthPayData.records.length === 0) {
    doc.text(`No 13th month pay data could be calculated for the year ${year}.`, margin, layoutManager.y);
    return;
  }
  
  // --- 1. DATA PREPARATION ---
  const { records, totalPayout, eligibleCount } = thirteenthMonthPayData;
  const avgPayout = eligibleCount > 0 ? totalPayout / eligibleCount : 0;

  // Group data for the chart
  const brackets = {
    'Below PHP 5k': 0,
    'PHP 5k - 10k': 0,
    'PHP 10k - 20k': 0,
    'Above PHP 20k': 0,
  };

  records.forEach(rec => {
    if (rec.thirteenthMonthPay < 5000) brackets['Below PHP 5k']++;
    else if (rec.thirteenthMonthPay <= 10000) brackets['PHP 5k - 10k']++;
    else if (rec.thirteenthMonthPay <= 20000) brackets['PHP 10k - 20k']++;
    else brackets['Above PHP 20k']++;
  });

  // --- 2. CHART CONFIGURATION ---
  const chartConfig = {
    type: 'bar',
    data: {
      labels: Object.keys(brackets),
      datasets: [{
        label: 'Number of Employees',
        data: Object.values(brackets),
        backgroundColor: 'rgba(25, 135, 84, 0.6)',
      }],
    },
    options: {
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
    },
  };
  
  // --- 3. SUMMARY TEXT ---
  const summaryText = `This report details the 13th Month Pay computation for the year ${year}. A total of ${eligibleCount} employee(s) were eligible, resulting in a total payout of ${formatCurrency(totalPayout)}. The average payout per eligible employee is ${formatCurrency(avgPayout)}.`;

  // --- 4. TABLE DATA ---
  const tableHead = ['ID', 'Employee Name', 'Total Basic Salary', '13th Month Pay', 'Status'];
  const tableBody = records.map(rec => [
    rec.id,
    rec.name,
    formatCurrency(rec.totalBasicSalary),
    formatCurrency(rec.thirteenthMonthPay),
    rec.status || 'Pending'
  ]);
  
  // --- 5. PDF ASSEMBLY ---
  await layoutManager.addChartWithTitle(`13th Month Payout Distribution for ${year}`, chartConfig);
  layoutManager.addSummaryText(summaryText);
  layoutManager.addSectionTitle("Detailed Payout List");
  layoutManager.addTable([tableHead], tableBody, {
    // MODIFIED: Enforced explicit column widths for perfect alignment
    columnStyles: {
      0: { cellWidth: 80 },  // ID
      1: { cellWidth: 'auto' }, // Employee Name
      2: { halign: 'left', cellWidth: 110 }, // Total Basic Salary
      3: { halign: 'left', cellWidth: 100 }, // 13th Month Pay
      4: { halign: 'left', cellWidth: 60 } // Status
    }
  });
};
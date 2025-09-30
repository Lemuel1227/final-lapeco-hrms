import autoTable from 'jspdf-autotable';

const formatCurrency = (value) => {
    if (typeof value !== 'number') return '0.00';
    return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

/**
 * Generates the Payroll Run Summary Report.
 * @param {jsPDF} doc - The jsPDF instance.
 * @param {object} params - Report parameters (e.g., runId).
 * @param {object} dataSources - Contains all mock data (payrolls).
 * @returns {jsPDF} The modified jsPDF document.
 */
export const generatePayrollRunSummaryReport = async (doc, params, dataSources) => {
  const { payrolls } = dataSources;
  const { runId, margin, startY, pageWidth } = params;
  let finalY = startY;

  // 1. Find the selected payroll run
  const run = (payrolls || []).find(p => p.runId === runId);

  if (!run) {
    doc.text("The selected payroll run could not be found.", margin, finalY);
    return doc;
  }

  // 2. Calculate totals for the header
  const runTotals = run.records.reduce((acc, rec) => {
    const totalEarnings = (rec.earnings || []).reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const totalStatutory = Object.values(rec.deductions || {}).reduce((sum, val) => sum + val, 0);
    const totalOther = (rec.otherDeductions || []).reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const netPay = totalEarnings - totalStatutory - totalOther;

    acc.gross += totalEarnings;
    acc.deductions += totalStatutory + totalOther;
    acc.net += netPay;
    return acc;
  }, { gross: 0, deductions: 0, net: 0 });

  // 3. Add report-specific subheader info
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.text(`Pay Period:`, margin, finalY);
  doc.setFont(undefined, 'normal');
  doc.text(run.cutOff, margin + 60, finalY);

  doc.setFont(undefined, 'bold');
  doc.text(`Total Net Payout:`, pageWidth / 2, finalY);
  doc.setFont(undefined, 'normal');
  doc.text(`₱ ${formatCurrency(runTotals.net)}`, pageWidth / 2 + 85, finalY);
  finalY += 25;

  // 4. Prepare data for the main table
  const tableColumns = ['ID', 'Employee Name', 'Gross Pay (₱)', 'Deductions (₱)', 'Net Pay (₱)', 'Status'];
  const tableRows = run.records.map(rec => {
    const totalEarnings = (rec.earnings || []).reduce((s, i) => s + Number(i.amount), 0);
    const totalDeductions = Object.values(rec.deductions).reduce((s, v) => s + v, 0) + (rec.otherDeductions || []).reduce((s, i) => s + Number(i.amount), 0);
    const netPay = totalEarnings - totalDeductions;
    return [
        rec.empId,
        rec.employeeName,
        formatCurrency(totalEarnings),
        formatCurrency(totalDeductions),
        formatCurrency(netPay),
        rec.status
    ];
  });

  // 5. Add the table to the PDF
  autoTable(doc, {
    head: [tableColumns],
    body: tableRows,
    startY: finalY,
    theme: 'striped',
    headStyles: { fillColor: [25, 135, 84] },
    columnStyles: {
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' }
    }
  });

  return doc;
};
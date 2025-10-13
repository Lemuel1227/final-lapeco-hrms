import autoTable from 'jspdf-autotable';

/**
 * Formats a number as a currency string with the "PHP" prefix.
 * @param {number | string} value - The value to format.
 * @returns {string} Formatted currency string, e.g., "PHP 1,234.56".
 */
const formatCurrency = (value) => {
    const num = Number(value);
    if (isNaN(num)) return 'PHP 0.00';
    return `PHP ${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

/**
 * Formats a number into a string with commas for thousands separators.
 * @param {number | string} value - The value to format.
 * @returns {string} Formatted number string, e.g., "1,234.56".
 */
const formatNumber = (value) => {
    const num = Number(value);
    if (isNaN(num)) return '0.00';
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const generatePayrollRunSummaryReport = async (doc, params, dataSources, addChartAndTitle) => {
  const { payrolls } = dataSources;
  const { runId, margin, startY, pageWidth } = params;
  let finalY = startY;

  // 1. Find the selected payroll run
  const run = (payrolls || []).find(p => p.runId === runId);

  if (!run) {
    doc.text("The selected payroll run could not be found.", margin, finalY);
    return doc;
  }

  // 2. Calculate comprehensive totals
  const runTotals = run.records.reduce((acc, rec) => {
    const totalEarnings = (rec.earnings || []).reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const totalStatutory = Object.values(rec.deductions || {}).reduce((sum, val) => sum + Number(val), 0);
    const totalOther = (rec.otherDeductions || []).reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const totalDeductions = totalStatutory + totalOther;
    acc.gross += totalEarnings;
    acc.deductions += totalDeductions;
    acc.net += totalEarnings - totalDeductions;
    return acc;
  }, { gross: 0, deductions: 0, net: 0 });

  // 3. Add redesigned subheader
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  
  const headerCol1X = margin;
  const headerCol2X = pageWidth / 2 + 20;
  const valueOffsetX = 100;

  doc.setFont(undefined, 'bold'); doc.text(`Pay Period:`, headerCol1X, finalY);
  doc.setFont(undefined, 'normal'); doc.text(run.cutOff, headerCol1X + valueOffsetX, finalY);

  doc.setFont(undefined, 'bold'); doc.text(`Total Gross Pay:`, headerCol2X, finalY);
  doc.setFont(undefined, 'normal'); doc.text(formatCurrency(runTotals.gross), pageWidth - margin, finalY, { align: 'right' });
  finalY += 15;

  doc.setFont(undefined, 'bold'); doc.text(`Total Employees:`, headerCol1X, finalY);
  doc.setFont(undefined, 'normal'); doc.text(run.records.length.toString(), headerCol1X + valueOffsetX, finalY);

  doc.setFont(undefined, 'bold'); doc.text(`Total Deductions:`, headerCol2X, finalY);
  doc.setFont(undefined, 'normal'); doc.text(formatCurrency(runTotals.deductions), pageWidth - margin, finalY, { align: 'right' });
  finalY += 15;
  
  doc.setFont(undefined, 'bold'); doc.text(`Total Net Payout:`, headerCol2X, finalY);
  doc.setFont(undefined, 'normal'); doc.setFontSize(11); doc.setTextColor(25, 135, 84);
  doc.text(formatCurrency(runTotals.net), pageWidth - margin, finalY, { align: 'right' });
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  finalY += 30;
  
  // 4. Configure and add the chart
  const chartConfig = {
    type: 'bar',
    data: { labels: ['Gross Pay', 'Deductions', 'Net Pay'], datasets: [{ label: 'Amount', data: [runTotals.gross, runTotals.deductions, runTotals.net], backgroundColor: ['rgba(13, 202, 240, 0.6)', 'rgba(220, 53, 69, 0.6)', 'rgba(25, 135, 84, 0.6)'] }] },
    options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { callback: value => `PHP ${(value / 1000).toLocaleString()}k` } } } }
  };
  finalY = await addChartAndTitle("Financial Overview", chartConfig, finalY);

  // 5. Prepare data for the table with RAW NUMBERS for custom rendering
  const tableColumns = ['ID', 'Employee Name', 'Basic Pay', 'OT & Other Pay', 'Gross Pay', 'Statutory Ded.', 'Other Ded.', 'Total Ded.', 'Net Pay'];

  const tableRows = run.records.map(rec => {
    const basicPay = (rec.earnings || []).find(e => e.description?.toLowerCase().includes('regular'))?.amount || 0;
    const overtimeAndOtherPay = (rec.earnings || []).reduce((sum, item) => !item.description?.toLowerCase().includes('regular') ? sum + Number(item.amount) : sum, 0);
    const grossPay = basicPay + overtimeAndOtherPay;
    const statutoryDeductions = Object.values(rec.deductions || {}).reduce((sum, val) => sum + Number(val), 0);
    const otherDeductions = (rec.otherDeductions || []).reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const totalDeductions = statutoryDeductions + otherDeductions;
    const netPay = grossPay - totalDeductions;
    
    return [
        rec.empId,
        rec.employeeName,
        basicPay,
        overtimeAndOtherPay,
        grossPay,
        statutoryDeductions,
        otherDeductions,
        totalDeductions,
        netPay,
    ];
  });

  // 6. Add the table to the PDF with custom cell rendering for perfect alignment
  autoTable(doc, {
    head: [tableColumns],
    body: tableRows,
    startY: finalY,
    theme: 'striped',
    headStyles: { fillColor: [25, 135, 84], halign: 'center' },
    columnStyles: {
      0: { halign: 'left' },
      1: { halign: 'left' },
    },
    didDrawCell: (data) => {
      const currencyColumns = [2, 3, 4, 5, 6, 7, 8]; // Indexes of columns to format
      if (data.section === 'body' && currencyColumns.includes(data.column.index)) {
        const cell = data.cell;
        const rawValue = cell.raw; // Get the raw number from the data
        const numberText = formatNumber(rawValue);
        const padding = 5;

        // CRITICAL FIX: Erase the default content by redrawing the cell's background.
        // This prevents text from being drawn on top of itself.
        doc.setFillColor(cell.styles.fillColor);
        doc.rect(cell.x, cell.y, cell.width, cell.height, 'F');
        
        // Set the text color
        doc.setTextColor(cell.styles.textColor);
        
        // Draw the currency symbol left-aligned
        doc.text('PHP', cell.x + padding, cell.y + cell.height / 2, {
            baseline: 'middle'
        });

        // Draw the formatted number right-aligned
        doc.text(numberText, cell.x + cell.width - padding, cell.y + cell.height / 2, {
            align: 'right',
            baseline: 'middle'
        });
      }
    }
  });

  return doc;
};
import autoTable from 'jspdf-autotable';

const formatCurrency = (value) => {
    if (typeof value !== 'number') return '0.00';
    return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const generateThirteenthMonthReport = async (doc, params, dataSources) => {
  const { thirteenthMonthPayData } = dataSources;
  const { year, margin, startY, pageWidth } = params;
  let finalY = startY;

  if (!thirteenthMonthPayData || thirteenthMonthPayData.records.length === 0) {
    doc.text(`No 13th month pay data could be calculated for the year ${year}.`, margin, finalY);
    return doc;
  }

  // Add report-specific subheader info
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.text(`Report Year:`, margin, finalY);
  doc.setFont(undefined, 'normal');
  doc.text(year.toString(), margin + 70, finalY);

  doc.setFont(undefined, 'bold');
  doc.text(`Total Payout:`, pageWidth / 2, finalY);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(25, 135, 84); // Success color
  doc.text(`₱ ${formatCurrency(thirteenthMonthPayData.totalPayout)}`, pageWidth / 2 + 70, finalY);
  doc.setTextColor(0, 0, 0);

  finalY += 15;
  doc.setFont(undefined, 'bold');
  doc.text(`Eligible Employees:`, margin, finalY);
  doc.setFont(undefined, 'normal');
  doc.text(thirteenthMonthPayData.eligibleCount.toString(), margin + 100, finalY);
  finalY += 30;

  // Prepare data for the main table
  const tableColumns = ['ID', 'Employee Name', 'Total Basic Salary (₱)', '13th Month Pay (₱)', 'Status'];
  const tableRows = thirteenthMonthPayData.records.map(rec => [
    rec.id,
    rec.name,
    formatCurrency(rec.totalBasicSalary),
    formatCurrency(rec.thirteenthMonthPay),
    rec.status || 'Pending'
  ]);

  // Add the table to the PDF
  autoTable(doc, {
    head: [tableColumns],
    body: tableRows,
    startY: finalY,
    theme: 'striped',
    headStyles: { fillColor: [25, 135, 84] },
    columnStyles: {
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'center' }
    }
  });

  return doc;
};
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import logo from '../assets/logo.png';

// --- HELPERS & CONFIG ---
const FONT_REGULAR = 'Helvetica';
const COLOR_PRIMARY = '#212529';
const COLOR_SECONDARY = '#6c757d';
const COLOR_BORDER = '#dee2e6';
const COLOR_HEADER_BG = [248, 249, 250];
const PAGE_MARGIN = 40;
const SECTION_HEADER_HEIGHT = 18;
const LINE_HEIGHT = 13;
const FOOTER_HEIGHT = 180; 

const COLOR_BRAND = [25, 135, 84];
const COLOR_WHITE = [255, 255, 255];

const formatCurrency = (val) => (val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatDateString = (dateStr) => dateStr ? format(new Date(dateStr + 'T00:00:00'), 'MMMM dd, yyyy') : 'N/A';

const addFooterAndConcernSlip = (doc, y, pageWidth, employeeDetails, payrollId) => {
    doc.setFont(FONT_REGULAR, 'bold'); doc.setFontSize(8); doc.setTextColor(COLOR_SECONDARY);
    doc.text('THIS IS A COMPUTER GENERATED PAYSLIP', pageWidth / 2, y, { align: 'center' });
    y += 12;
    doc.setFont(FONT_REGULAR, 'normal'); doc.setFontSize(7);
    doc.text('For concerns regarding your payslip, please get in touch with the office and we will gladly assist you. Please fill-up form below for your concerns.', pageWidth / 2, y, { align: 'center' });
    y += 15;

    const concernStartY = y;

    const concernLine = (label, lineY, value = '') => {
        doc.setFontSize(8); 
        doc.setTextColor(COLOR_SECONDARY); 
        doc.text(label, PAGE_MARGIN, lineY);

        const labelWidth = doc.getTextWidth(label);
        const lineStartX = PAGE_MARGIN + labelWidth + 5;
        const valueStartX = lineStartX + 5;

        doc.setDrawColor(COLOR_SECONDARY); 
        doc.line(lineStartX, lineY, pageWidth / 2 + 80, lineY);
        
        if (value) {
            doc.setFont(FONT_REGULAR, 'bold'); 
            doc.setTextColor(COLOR_PRIMARY); 
            doc.text(value, valueStartX, lineY - 2);
        }
    };
    
    concernLine('Employee Full Name:', concernStartY, employeeDetails.name.toUpperCase());
    concernLine('Employee Number:', concernStartY + 15, employeeDetails.id);
    concernLine('Payroll Number in Concern:', concernStartY + 30, payrollId);
    concernLine('Concern dates:', concernStartY + 45);
    concernLine('Over/Underpaid Amount:', concernStartY + 60);
    concernLine('Loan/Deduction Amount:', concernStartY + 75);
    concernLine('Other Concerns:', concernStartY + 90);

    const guideX = pageWidth / 2 + 100;
    const guideY = concernStartY;
    const guideWidth = 150;
    const guideHeight = 55;
    const guidePadding = 10;

    doc.setDrawColor(COLOR_BORDER); doc.setFillColor(...COLOR_HEADER_BG);
    doc.roundedRect(guideX, guideY, guideWidth, guideHeight, 3, 3, 'FD');
    doc.setFont(FONT_REGULAR, 'bold'); doc.setTextColor(COLOR_PRIMARY);
    doc.text('Payslip Guide', guideX + guidePadding, guideY + 10);
    doc.setFont(FONT_REGULAR, 'normal'); doc.setFontSize(6.5); doc.setTextColor(COLOR_SECONDARY);
    const guideItems = [
        { label: 'Gross Pay', formula: '= Total Amount of Earnings' },
        { label: 'Statutory Ded', formula: '= SSS + PHIC + HDMF' },
        { label: 'Other Ded', formula: '= Canteen + Cash Advance + Others + Loans' },
        { label: 'Net Pay', formula: '= Gross - Statutory Deductions - Other Ded' },
    ];
    
    const labelWidths = guideItems.map(item => doc.getTextWidth(item.label));
    const maxLabelWidth = Math.max(...labelWidths);
    const formulaX = guideX + guidePadding + maxLabelWidth + 5;
    const formulaMaxWidth = (guideX + guideWidth) - formulaX - (guidePadding / 2);
    let currentGuideY = guideY + 22;
    const lineHeight = 9;

    guideItems.forEach(item => {
        if (currentGuideY > guideY + guideHeight - guidePadding) return;

        doc.text(item.label, guideX + guidePadding, currentGuideY);
        doc.text(item.formula, formulaX, currentGuideY, { maxWidth: formulaMaxWidth });
        
        const lines = doc.splitTextToSize(item.formula, formulaMaxWidth).length;
        currentGuideY += (lines * lineHeight);
    });

    y = concernStartY + 120;
    doc.line(PAGE_MARGIN, y, PAGE_MARGIN + 200, y);
    doc.text('Printed Name over Signature of Employee', PAGE_MARGIN, y + 8);
    doc.line(pageWidth - PAGE_MARGIN - 200, y, pageWidth - PAGE_MARGIN, y);
    doc.text('Received and Noted by:', pageWidth - PAGE_MARGIN - 200, y + 8);
};


// --- MAIN GENERATOR FUNCTION ---
export const generatePayslipReport = async (layoutManager, dataSources) => {
  const { doc } = layoutManager;
  const { payslipData, employeeDetails } = dataSources;
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = layoutManager.margin;

  const addHeader = () => {
    doc.addImage(logo, 'PNG', pageWidth / 2 - 40, 25, 80, 26);
    doc.setFont(FONT_REGULAR, 'bold');
    doc.setFontSize(18);
    doc.setTextColor(...COLOR_BRAND);
    doc.text('Payslip', pageWidth / 2, 70, { align: 'center' });
    doc.setFont(FONT_REGULAR, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(COLOR_SECONDARY);
    doc.text(`Generated on: ${format(new Date(), 'MMMM dd, yyyy, hh:mm a')}`, pageWidth / 2, 82, { align: 'center' });
    y = 95;
  };

  const addInfoSection = (title, data) => {
    doc.setFont(FONT_REGULAR, 'bold'); doc.setFontSize(10); doc.setTextColor(...COLOR_BRAND);
    doc.text(title, PAGE_MARGIN, y);
    doc.setDrawColor(COLOR_BORDER); doc.line(PAGE_MARGIN, y + 4, pageWidth - PAGE_MARGIN, y + 4);
    y += 15;
    doc.setFont(FONT_REGULAR, 'normal'); doc.setFontSize(9);
    
    const col1X = PAGE_MARGIN + 5;
    const col2X = pageWidth / 2 + 15;
    const valueOffset = 90;

    const numRows = Math.ceil(data.length / 2);
    for (let i = 0; i < numRows; i++) {
        const currentY = y + (i * LINE_HEIGHT);
        const item1 = data[i], item2 = data[i + numRows];
        if (item1) {
            doc.setTextColor(COLOR_SECONDARY); doc.text(`${item1.label}:`, col1X, currentY);
            doc.setTextColor(COLOR_PRIMARY); doc.text(item1.value, col1X + valueOffset, currentY);
        }
        if (item2) {
            doc.setTextColor(COLOR_SECONDARY); doc.text(`${item2.label}:`, col2X, currentY);
            doc.setTextColor(COLOR_PRIMARY); doc.text(item2.value, col2X + valueOffset, currentY);
        }
    }
    y += numRows * LINE_HEIGHT;
  };

  const addSectionHeader = (doc, x, currentY, width, title) => {
    doc.setFillColor(...COLOR_BRAND);
    doc.rect(x, currentY, width, SECTION_HEADER_HEIGHT, 'F');
    doc.setFont(FONT_REGULAR, 'bold'); doc.setFontSize(9); doc.setTextColor(...COLOR_WHITE);
    doc.text(title, x + 5, currentY + SECTION_HEADER_HEIGHT / 2, { verticalAlign: 'middle' });
  };
  
  const pageBreakCheck = (data) => {
    if (data.pageNumber > 1) {
      y = PAGE_MARGIN;
    }
  };

  addHeader();
  const employeeData = [
      { label: 'Full Name', value: employeeDetails.name || 'N/A' }, { label: 'Tax ID', value: employeeDetails.tinNo || 'N/A' },
      { label: 'PHIC No.', value: employeeDetails.philhealthNo || 'N/A' }, { label: 'PY Account', value: '000001' },
      { label: 'Location', value: 'Manila Warehouse' }, { label: 'Status', value: employeeDetails.status || 'N/A' },
      { label: 'Employee No.', value: employeeDetails.id || 'N/A' }, { label: 'SSS No.', value: employeeDetails.sssNo || 'N/A' },
      { label: 'HDMF No.', value: employeeDetails.pagIbigNo || 'N/A' }, { label: 'Position', value: employeeDetails.positionTitle || 'N/A' },
      { label: 'Schedule', value: 'Rotating Shift' },
  ];
  addInfoSection('Employee Details', employeeData);
  y += 5;
  const periodData = [
      { label: 'Payroll Type', value: payslipData.payrollType || 'Semi-monthly' }, { label: 'Payment Date', value: formatDateString(payslipData.paymentDate) },
      { label: 'Pay End Date', value: formatDateString(payslipData.payEndDate) }, { label: 'Period', value: payslipData.period || 'N/A' },
      { label: 'Pay Start Date', value: formatDateString(payslipData.payStartDate) },
  ];
  addInfoSection('Payroll Period', periodData);
  y += 10;
  
  doc.setFont(FONT_REGULAR, 'bold'); doc.setFontSize(10); doc.setTextColor(...COLOR_BRAND);
  doc.text('Pay Summary', PAGE_MARGIN, y);
  doc.setDrawColor(COLOR_BORDER); doc.line(PAGE_MARGIN, y + 4, pageWidth - PAGE_MARGIN, y + 4);
  y += 15;
  
  const totalGross = (payslipData.earnings || []).reduce((sum, item) => sum + (item.amount || 0), 0);
  const totalStatutory = Object.values(payslipData.deductions || {}).reduce((sum, val) => sum + val, 0);
  const totalOther = (payslipData.otherDeductions || []).reduce((sum, item) => sum + (item.amount || 0), 0);
  const netPay = totalGross - totalStatutory - totalOther;
  
  autoTable(doc, {
      startY: y, theme: 'grid', styles: { fontSize: 8, cellPadding: 3, lineColor: COLOR_BORDER, lineWidth: 0.5 },
      headStyles: { fillColor: COLOR_BRAND, textColor: COLOR_WHITE, fontStyle: 'bold', lineColor: COLOR_BORDER },
      head: [['Category', 'Gross', 'Statutory Deductions', 'Taxes', 'Other Deductions', 'Net Pay']],
      body: [[ 'Current', formatCurrency(totalGross), formatCurrency(totalStatutory), formatCurrency(payslipData.deductions?.tax || 0), formatCurrency(totalOther), formatCurrency(netPay) ]],
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right', fontStyle: 'bold' } },
      didDrawCell: (data) => { if (data.section === 'body' && data.column.index === 5) { doc.setTextColor(...COLOR_BRAND); } },
      didDrawPage: pageBreakCheck,
  });
  y = doc.lastAutoTable.finalY + 8;
  
  const midPoint = pageWidth / 2;
  const tableWidth = midPoint - PAGE_MARGIN - 2.5;
  addSectionHeader(doc, PAGE_MARGIN, y, tableWidth, 'Hours and Earnings');
  addSectionHeader(doc, midPoint + 2.5, y, tableWidth, 'Statutory Deductions');
  let tableStartY = y + SECTION_HEADER_HEIGHT;

  autoTable(doc, {
      startY: tableStartY, head: [['Description', 'Hours', 'Amount']], body: (payslipData.earnings || []).map(e => [e.description, e.hours, formatCurrency(e.amount)]),
      theme: 'grid', tableWidth: tableWidth, margin: { left: PAGE_MARGIN }, styles: { fontSize: 8, cellPadding: 3, lineColor: COLOR_BORDER, lineWidth: 0.5 },
      headStyles: { fillColor: COLOR_HEADER_BG, textColor: COLOR_SECONDARY, fontStyle: 'bold', lineColor: COLOR_BORDER }, didDrawPage: pageBreakCheck,
  });
  const leftTableY1 = doc.lastAutoTable.finalY;

  autoTable(doc, {
      startY: tableStartY, head: [['Description', 'Amount']], body: [['SSS', formatCurrency(payslipData.deductions?.sss)], ['PHIC', formatCurrency(payslipData.deductions?.philhealth)], ['HDMF', formatCurrency(payslipData.deductions?.hdmf)]],
      theme: 'grid', tableWidth: tableWidth, margin: { left: midPoint + 2.5 }, styles: { fontSize: 8, cellPadding: 3, lineColor: COLOR_BORDER, lineWidth: 0.5 },
      headStyles: { fillColor: COLOR_HEADER_BG, textColor: COLOR_SECONDARY, fontStyle: 'bold', lineColor: COLOR_BORDER }, didDrawPage: pageBreakCheck,
  });
  y = Math.max(leftTableY1, doc.lastAutoTable.finalY) + 8;

  addSectionHeader(doc, PAGE_MARGIN, y, tableWidth, 'Leave Balances');
  addSectionHeader(doc, midPoint + 2.5, y, tableWidth, 'Absences');
  tableStartY = y + SECTION_HEADER_HEIGHT;
  
  autoTable(doc, {
      startY: tableStartY, head: [['Description', 'Unused Leave (hrs)', 'Claimed (hrs)']], body: [['Vacation', formatCurrency((payslipData.leaveBalances?.vacation || 0) * 8), '0.00'], ['Sick', formatCurrency((payslipData.leaveBalances?.sick || 0) * 8), '0.00']],
      theme: 'grid', tableWidth: tableWidth, margin: { left: PAGE_MARGIN }, styles: { fontSize: 8, cellPadding: 3, lineColor: COLOR_BORDER, lineWidth: 0.5 },
      headStyles: { fillColor: COLOR_HEADER_BG, textColor: COLOR_SECONDARY, fontStyle: 'bold', lineColor: COLOR_BORDER }, didDrawPage: pageBreakCheck,
  });
  const leftTableY2 = doc.lastAutoTable.finalY;

  autoTable(doc, {
      startY: tableStartY, head: [['Description', 'Start Date', 'End Date', 'Total Day/s']], body: (payslipData.absences || []).length > 0 ? payslipData.absences.map(a => [a.description, a.startDate, a.endDate, a.totalDays]) : [['-', '-', '-', '0.00']],
      theme: 'grid', tableWidth: tableWidth, margin: { left: midPoint + 2.5 }, styles: { fontSize: 8, cellPadding: 3, lineColor: COLOR_BORDER, lineWidth: 0.5 },
      headStyles: { fillColor: COLOR_HEADER_BG, textColor: COLOR_SECONDARY, fontStyle: 'bold', lineColor: COLOR_BORDER }, didDrawPage: pageBreakCheck,
  });
  y = Math.max(leftTableY2, doc.lastAutoTable.finalY) + 8;
  
  addSectionHeader(doc, PAGE_MARGIN, y, pageWidth - (PAGE_MARGIN * 2), 'Other Deductions Information');
  tableStartY = y + SECTION_HEADER_HEIGHT;

  autoTable(doc, {
      startY: tableStartY, head: [['Description', 'Loan Amount', 'Amount Deduction', 'Outstanding Balance']],
      body: (payslipData.otherDeductions || []).map(d => [d.description, formatCurrency(d.loanAmount), formatCurrency(d.amount), formatCurrency(d.outstandingBalance)]),
      theme: 'grid', margin: { left: PAGE_MARGIN }, styles: { fontSize: 8, cellPadding: 3, lineColor: COLOR_BORDER, lineWidth: 0.5 },
      headStyles: { fillColor: COLOR_HEADER_BG, textColor: COLOR_SECONDARY, fontStyle: 'bold', lineColor: COLOR_BORDER },
      didDrawPage: pageBreakCheck,
  });
  
  let finalY = doc.lastAutoTable.finalY;

  finalY += 15;
  doc.setDrawColor(COLOR_BORDER);
  doc.setLineDashPattern([2, 2], 0);
  doc.line(PAGE_MARGIN, finalY, pageWidth - PAGE_MARGIN, finalY);
  doc.setLineDashPattern([], 0); 
  finalY += 15;
  
  if (pageHeight - finalY < FOOTER_HEIGHT) {
      doc.addPage();
      finalY = PAGE_MARGIN;
  }
  addFooterAndConcernSlip(doc, finalY, pageWidth, employeeDetails, payslipData.payrollId);
};
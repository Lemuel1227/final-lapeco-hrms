import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logo from '../assets/logo.png';

export const createPdfDoc = () => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;
  return { doc, pageWidth, margin };
};

export const addHeader = (doc, title, { pageWidth, margin }) => {
  const generationDate = new Date().toLocaleDateString();
  
  doc.addImage(logo, 'PNG', margin, 20, 80, 26);
  doc.setFontSize(18);
  doc.setFont(undefined, 'bold');
  doc.text(title, pageWidth - margin, 40, { align: 'right' });
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.text(`Generated on: ${generationDate}`, pageWidth - margin, 55, { align: 'right' });
  doc.setLineWidth(1);
  doc.line(margin, 70, pageWidth - margin, 70);
  
  return 85; // Return the starting Y position for content
};

export const generateArchivedReport = (archivedReport) => {
  const { doc, pageWidth, margin } = createPdfDoc();
  let startY = addHeader(doc, archivedReport.headerData['Employer Name'] || archivedReport.type, { pageWidth, margin });

  // Add custom header data from the archive
  doc.setFontSize(10);
  Object.entries(archivedReport.headerData).forEach(([key, value]) => {
    if (key !== 'Employer Name') {
      doc.setFont(undefined, 'bold');
      doc.text(`${key}:`, margin, startY);
      doc.setFont(undefined, 'normal');
      doc.text(value, margin + 120, startY);
      startY += 15;
    }
  });
  startY += 10;

  const tableColumns = archivedReport.columns.map(col => col.label);
  const tableRows = archivedReport.rows.map(row => 
    archivedReport.columns.map(col => row[col.key] || '')
  );

  autoTable(doc, {
    head: [tableColumns],
    body: tableRows,
    startY: startY,
    theme: 'striped',
    headStyles: { fillColor: [25, 135, 84] },
  });

  return doc;
};
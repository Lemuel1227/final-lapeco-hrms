import autoTable from 'jspdf-autotable';
import { generateSssData, generatePhilhealthData, generatePagibigData } from '../hooks/contributionUtils';

const addContributionSection = (doc, title, data, startY) => {
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text(title, doc.internal.pageSize.getWidth() / 2, startY, { align: 'center' });

  const tableColumns = data.columns.map(c => c.label);
  const tableRows = data.rows.map(row => data.columns.map(col => row[col.key]));

  autoTable(doc, {
    head: [tableColumns],
    body: tableRows,
    startY: startY + 15,
    theme: 'striped',
    headStyles: { fillColor: [25, 135, 84] },
    didDrawPage: (hookData) => {
      if (hookData.pageNumber > 1) {
      }
    }
  });

  return doc.lastAutoTable.finalY + 30;
};

export const generateContributionsReport = async (doc, params, dataSources) => {
  const { employees, positions, payrolls } = dataSources;
  const { runId, margin } = params;
  let finalY = params.startY;

  const selectedRun = payrolls.find(p => p.runId === runId);
  if (!selectedRun) {
    doc.text("The selected payroll run could not be found.", margin, finalY);
    return doc;
  }

  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.text('Pay Period:', margin, finalY);
  doc.setFont(undefined, 'normal');
  doc.text(selectedRun.cutOff, margin + 60, finalY);
  finalY += 30;

  // Generate data for all three contribution types
  const sssData = generateSssData(employees, positions, selectedRun);
  const philhealthData = generatePhilhealthData(employees, positions, selectedRun);
  const pagibigData = generatePagibigData(employees, positions, selectedRun);

  // Add each section to the PDF
  finalY = addContributionSection(doc, 'SSS Contributions', sssData, finalY);
  
  if (finalY > doc.internal.pageSize.getHeight() - 200) { 
    doc.addPage();
    finalY = margin;
  }

  finalY = addContributionSection(doc, 'PhilHealth Contributions', philhealthData, finalY);
  
  if (finalY > doc.internal.pageSize.getHeight() - 200) {
    doc.addPage();
    finalY = margin;
  }

  addContributionSection(doc, 'Pag-IBIG Contributions', pagibigData, finalY);

  return doc;
};
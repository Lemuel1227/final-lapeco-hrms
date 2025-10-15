import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logo from '../assets/logo.png';
import { generateChartAsImage } from './chartGenerator';

export class PdfLayoutManager {

  constructor(orientation = 'portrait', title = 'Report', theme = 'light', options = {}) {
    this.doc = new jsPDF({ orientation, unit: 'pt', format: 'a4' });
    this.title = title;
    this.theme = theme;
    this.options = options;

    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();
    this.margin = 40;
    this.y = 0;
    
    if (!this.options.skipHeader) {
      this.addHeader();
    } else {
      this.y = this.margin;
    }
  }

  // Adds the header to the current page
  addHeader() {
    const generationDate = new Date().toLocaleDateString();
    
    this.doc.addImage(logo, 'PNG', this.margin, 20, 80, 26);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(18);
    this.doc.text(this.title, this.pageWidth - this.margin, 40, { align: 'right' });
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(10);
    this.doc.text(`Generated on: ${generationDate}`, this.pageWidth - this.margin, 55, { align: 'right' });
    this.doc.setLineWidth(1);
    this.doc.line(this.margin, 70, this.pageWidth - this.margin, 70);
    
    this.y = 85;
  }

  // Adds the footer with page numbers to all pages
  addFooter() {
    const totalPages = this.doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      this.doc.setPage(i);
      this.doc.setFontSize(8);
      this.doc.setTextColor(150);
      this.doc.text(
        `Page ${i} of ${totalPages}`,
        this.pageWidth / 2,
        this.pageHeight - 20,
        { align: 'center' }
      );
    }
    this.doc.setPage(totalPages);
  }

  // Checks if content will fit, adds a new page if not
  checkPageBreak(contentHeight) {
    if (this.y + contentHeight > this.pageHeight - (this.margin + 20)) {
      this.doc.addPage();
      if (!this.options.skipHeader) {
        this.addHeader();
      } else {
        this.y = this.margin;
      }
    }
  }

  // Adds a section title
  addSectionTitle(title, options = {}) {
    const { fontSize = 12, style = 'bold', spaceBefore = 20, spaceAfter = 15 } = options;
    this.y += spaceBefore;
    this.checkPageBreak(fontSize + spaceAfter);

    this.doc.setFont('helvetica', style);
    this.doc.setFontSize(fontSize);
    this.doc.text(title, this.margin, this.y);

    this.y += spaceAfter;
  }
  
  // Adds a chart to the document
  async addChart(chartConfig, options = {}) {
    const { width = this.pageWidth - this.margin * 2, height = 150 } = options;
    this.checkPageBreak(height + 20);

    const backgroundColor = this.theme === 'dark' ? '#2c3136' : '#ffffff';
    
    const chartImage = await generateChartAsImage(chartConfig, {
      width: width * 2.5,
      height: height * 2.5,
      backgroundColor,
    });
    
    this.doc.addImage(chartImage, 'PNG', this.margin, this.y, width, height);
    this.y += height + 20;
  }
  
  // High-level method for chart with title
  async addChartWithTitle(title, chartConfig, chartOptions = {}) {
    this.addSectionTitle(title, { spaceBefore: 0, fontSize: 14 });
    await this.addChart(chartConfig, chartOptions);
  }

  // Method for adding summary text
  addSummaryText(text, options = {}) {
    const { fontSize = 10, style = 'normal', spaceBefore = 0, spaceAfter = 25 } = options;
    this.y += spaceBefore;
    
    this.doc.setFont('helvetica', style);
    this.doc.setFontSize(fontSize);
    this.doc.setTextColor(45, 55, 72); // A darker, more professional gray
    this.doc.setLineHeightFactor(1.5); // Increase line spacing for readability

    const splitText = this.doc.splitTextToSize(text, this.pageWidth - this.margin * 2);
    const textHeight = splitText.length * fontSize * 1.5;
    
    this.checkPageBreak(textHeight + spaceAfter);
    this.doc.text(splitText, this.margin, this.y);
    this.y += textHeight + spaceAfter;
    this.doc.setTextColor(0, 0, 0);
  }

  // Adds a table using jspdf-autotable
  addTable(head, body, options = {}) {
    this.checkPageBreak(40);

    const defaultOptions = {
      startY: this.y,
      head,
      body,
      theme: 'striped',
      headStyles: { fillColor: [25, 135, 84] },
      didDrawPage: (data) => {
        this.addHeader();
        data.settings.startY = this.y;
      },
      margin: { top: 90, left: this.margin, right: this.margin }
    };

    autoTable(this.doc, { ...defaultOptions, ...options });
    this.y = this.doc.lastAutoTable.finalY + 20;
  }

  // Finalize the document and get the output
  getOutput(type = 'blob') {
    if (!this.options.skipFooter) {
      this.addFooter();
    }
    return this.doc.output(type);
  }
}
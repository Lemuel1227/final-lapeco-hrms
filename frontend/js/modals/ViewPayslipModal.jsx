import React, { useMemo, useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ReportPreviewModal from './ReportPreviewModal';
import logo from '../../assets/logo.png';
import './ViewPayslipModal.css';

const formatCurrency = (value) => Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const ViewPayslipModal = ({ show, onClose, payslipData }) => {
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [pdfDataUri, setPdfDataUri] = useState('');

  const totals = useMemo(() => {
    if (!payslipData) return { gross: 0, deductions: 0, net: 0 };
    const gross = payslipData.grossPay + (payslipData.adjustments?.allowances || 0) + (payslipData.adjustments?.bonuses || 0);
    const deductions = Object.values(payslipData.deductions).reduce((s, v) => s + v, 0);
    return { gross, deductions, net: gross - deductions };
  }, [payslipData]);
  
  const handleDownloadPdf = () => {
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();
    
    // Header
    doc.addImage(logo, 'PNG', 15, 12, 40, 13);
    doc.setFontSize(22); doc.setFont(undefined, 'bold');
    doc.text('PAYSLIP', pageW - 15, 25, { align: 'right' });
    doc.setDrawColor('#198754'); doc.setLineWidth(0.5);
    doc.line(15, 32, pageW - 15, 32);

    // Info Section
    doc.setFontSize(10);
    doc.text(`Employee:`, 15, 45);
    doc.text(`Pay Period:`, pageW / 2, 45);
    doc.setFont(undefined, 'bold');
    doc.text(`${payslipData.employeeName} (${payslipData.empId})`, 55, 45);
    doc.text(payslipData.cutOff, pageW / 2 + 30, 45);
    
    const earningsBody = [
        ['Base Pay', formatCurrency(payslipData.earnings.basePay)],
        ['Overtime Pay', formatCurrency(payslipData.earnings.overtimePay)],
        ['Holiday Pay', formatCurrency(payslipData.earnings.holidayPay)],
        ['Allowances', formatCurrency(payslipData.adjustments.allowances)],
        ['Bonuses', formatCurrency(payslipData.adjustments.bonuses)],
    ];
    
    const deductionsBody = [
        ['Withholding Tax', formatCurrency(payslipData.deductions.tax)],
        ['SSS', formatCurrency(payslipData.deductions.sss)],
        ['PhilHealth', formatCurrency(payslipData.deductions.philhealth)],
        ['Pag-IBIG', formatCurrency(payslipData.deductions.hdmf)],
    ];

    autoTable(doc, {
        head: [['Earnings', 'Amount (₱)']],
        body: earningsBody,
        startY: 55, theme: 'grid', headStyles: { fillColor: '#198754' },
        columnStyles: { 1: { halign: 'right' } }
    });

    autoTable(doc, {
        head: [['Deductions', 'Amount (₱)']],
        body: deductionsBody,
        startY: doc.lastAutoTable.finalY + 10, theme: 'grid', headStyles: { fillColor: '#dc3545' },
        columnStyles: { 1: { halign: 'right' } }
    });

    // Summary
    const finalY = doc.lastAutoTable.finalY + 15;
    doc.setFontSize(10); doc.setFont(undefined, 'normal');
    doc.text('Gross Pay:', pageW - 60, finalY, { align: 'right' });
    doc.text(formatCurrency(totals.gross), pageW - 15, finalY, { align: 'right' });
    doc.text('Total Deductions:', pageW - 60, finalY + 15, { align: 'right' });
    doc.text(`- ${formatCurrency(totals.deductions)}`, pageW - 15, finalY + 15, { align: 'right' });
    doc.setLineWidth(0.2); doc.line(pageW - 60, finalY + 20, pageW - 15, finalY + 20);
    doc.setFontSize(12); doc.setFont(undefined, 'bold');
    doc.text('Net Pay:', pageW - 60, finalY + 30, { align: 'right' });
    doc.setTextColor('#198754');
    doc.text(`₱ ${formatCurrency(totals.net)}`, pageW - 15, finalY + 30, { align: 'right' });

    const pdfBlob = doc.output('blob');
    const url = URL.createObjectURL(pdfBlob);
    setPdfDataUri(url);
    setShowPdfPreview(true);
  };
  
  if (!show) return null;

  return (
    <>
      <div className={`modal fade show d-block ${showPdfPreview ? 'modal-behind' : ''}`} tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content payslip-modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Payslip Details</h5>
              <button type="button" className="btn-close" onClick={onClose}></button>
            </div>
            <div className="modal-body">
              <div className="payslip-header">
                <div>
                  <h4 className="employee-name">{payslipData.employeeName}</h4>
                  <p className="employee-id text-muted">{payslipData.empId}</p>
                </div>
                <div className="text-right">
                  <p className="period-label">PAY PERIOD</p>
                  <h5 className="period-dates">{payslipData.cutOff}</h5>
                </div>
              </div>

              <div className="payslip-grid">
                <div className="payslip-section">
                  <h6>Earnings</h6>
                  <div className="payslip-item"><span className="label">Base Pay</span><span className="value">₱{formatCurrency(payslipData.earnings.basePay)}</span></div>
                  <div className="payslip-item"><span className="label">Overtime Pay</span><span className="value">₱{formatCurrency(payslipData.earnings.overtimePay)}</span></div>
                  <div className="payslip-item"><span className="label">Holiday Pay</span><span className="value">₱{formatCurrency(payslipData.earnings.holidayPay)}</span></div>
                  <div className="payslip-item"><span className="label">Allowances</span><span className="value">₱{formatCurrency(payslipData.adjustments.allowances)}</span></div>
                  <div className="payslip-item"><span className="label">Bonuses</span><span className="value">₱{formatCurrency(payslipData.adjustments.bonuses)}</span></div>
                </div>
                 <div className="payslip-section">
                  <h6>Deductions</h6>
                  <div className="payslip-item"><span className="label">Withholding Tax</span><span className="value">₱{formatCurrency(payslipData.deductions.tax)}</span></div>
                  <div className="payslip-item"><span className="label">SSS</span><span className="value">₱{formatCurrency(payslipData.deductions.sss)}</span></div>
                  <div className="payslip-item"><span className="label">PhilHealth</span><span className="value">₱{formatCurrency(payslipData.deductions.philhealth)}</span></div>
                  <div className="payslip-item"><span className="label">Pag-IBIG</span><span className="value">₱{formatCurrency(payslipData.deductions.hdmf)}</span></div>
                </div>
              </div>

              <div className="payslip-summary">
                <div className="summary-item"><span className="label">Gross Pay</span><span className="value">₱{formatCurrency(totals.gross)}</span></div>
                <div className="summary-item"><span className="label">Total Deductions</span><span className="value text-danger">- ₱{formatCurrency(totals.deductions)}</span></div>
                <div className="summary-item net-pay"><span className="label">Net Pay</span><span className="value">₱{formatCurrency(totals.net)}</span></div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={onClose}>Close</button>
              <button type="button" className="btn btn-primary" onClick={handleDownloadPdf}><i className="bi bi-download me-2"></i>Download PDF</button>
            </div>
          </div>
        </div>
      </div>
      {showPdfPreview && <ReportPreviewModal show={showPdfPreview} onClose={() => setShowPdfPreview(false)} pdfDataUri={pdfDataUri} reportTitle="Payslip Preview" />}
    </>
  );
};

export default ViewPayslipModal;
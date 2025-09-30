import React, { useState, useEffect, useMemo } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import './PayrollAdjustmentModal.css';
import ReportPreviewModal from './ReportPreviewModal';
import logo from '../assets/logo.png';

const formatCurrency = (value) => Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const PayrollAdjustmentModal = ({ show, onClose, onSave, payrollData }) => {
  const [activeTab, setActiveTab] = useState('summary');
  const [showPayslipPreview, setShowPayslipPreview] = useState(false);
  const [payslipPdfData, setPayslipPdfData] = useState('');
  const [status, setStatus] = useState('');
  const [adjustments, setAdjustments] = useState({
    allowances: 0,
    bonuses: 0,
    otherEarnings: 0,
    loanRepayments: 0,
    cashAdvances: 0,
  });

  useEffect(() => {
    if (payrollData) {
      setStatus(payrollData.status);
      setAdjustments({
        allowances: payrollData.adjustments?.allowances || 0,
        bonuses: payrollData.adjustments?.bonuses || 0,
        otherEarnings: payrollData.adjustments?.otherEarnings || 0,
        loanRepayments: payrollData.adjustments?.loanRepayments || 0,
        cashAdvances: payrollData.adjustments?.cashAdvances || 0,
      });
      setActiveTab('summary');
    }
  }, [payrollData]);

  const totals = useMemo(() => {
    if (!payrollData) return { baseGrossPay: 0, totalGrossPay: 0, totalDeductions: 0, netPay: 0 };
    
    const baseGrossPay = payrollData.grossPay;
    const totalEarningsAdjustments = (adjustments.allowances || 0) + (adjustments.bonuses || 0) + (adjustments.otherEarnings || 0);
    const totalGrossPay = baseGrossPay + totalEarningsAdjustments;

    const baseDeductions = Object.values(payrollData.deductions).reduce((sum, val) => sum + val, 0);
    const totalDeductionAdjustments = (adjustments.loanRepayments || 0) + (adjustments.cashAdvances || 0);
    const totalDeductions = baseDeductions + totalDeductionAdjustments;

    const netPay = totalGrossPay - totalDeductions;
    
    return { baseGrossPay, totalGrossPay, totalDeductions, netPay };
  }, [payrollData, adjustments]);

  const handleAdjustmentChange = (field, value) => {
    setAdjustments(prev => ({
      ...prev,
      [field]: Number(value) || 0
    }));
  };

  const handleSave = () => {
    onSave(payrollData.payrollId, { status, adjustments, netPay: totals.netPay });
    onClose();
  };

  const handleGeneratePayslip = () => {
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();
    
    doc.addImage(logo, 'PNG', 15, 12, 40, 13);
    doc.setFontSize(22); doc.setFont(undefined, 'bold');
    doc.text('PAYSLIP', pageW - 15, 25, { align: 'right' });
    doc.setDrawColor('#198754'); doc.setLineWidth(0.5);
    doc.line(15, 32, pageW - 15, 32);

    doc.setFontSize(10);
    doc.text(`Employee:`, 15, 45);
    doc.text(`Pay Period:`, pageW / 2, 45);
    doc.setFont(undefined, 'bold');
    doc.text(`${payrollData.employeeName} (${payrollData.empId})`, 55, 45);
    doc.text(payrollData.cutOff, pageW / 2 + 30, 45);
    
    const financialBody = [
        ['Calculated Gross Pay', formatCurrency(totals.baseGrossPay), ''],
        ['Allowances', formatCurrency(adjustments.allowances), ''],
        ['Bonuses / Commission', formatCurrency(adjustments.bonuses), ''],
        ['Other Earnings', formatCurrency(adjustments.otherEarnings), ''],
        ['Withholding Tax', '', formatCurrency(payrollData.deductions.tax)],
        ['SSS Contribution', '', formatCurrency(payrollData.deductions.sss)],
        ['PhilHealth', '', formatCurrency(payrollData.deductions.philhealth)],
        ['Pag-IBIG', '', formatCurrency(payrollData.deductions.hdmf)],
        ['Loan Repayments', '', formatCurrency(adjustments.loanRepayments)],
        ['Cash Advances', '', formatCurrency(adjustments.cashAdvances)],
        [{ content: 'Total Gross Pay', styles: { fontStyle: 'bold' } }, { content: formatCurrency(totals.totalGrossPay), styles: { fontStyle: 'bold' } }, ''],
        [{ content: 'Total Deductions', styles: { fontStyle: 'bold' } }, '', { content: `(${formatCurrency(totals.totalDeductions)})`, styles: { fontStyle: 'bold' } }],
    ];

    autoTable(doc, {
        head: [['Description', 'Earnings (₱)', 'Deductions (₱)']],
        body: financialBody,
        startY: 55,
        theme: 'striped',
        headStyles: { fillColor: '#343a40' },
        columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
    });

    const finalY = doc.lastAutoTable.finalY + 20;
    doc.setFontSize(14); doc.setFont(undefined, 'bold');
    doc.text('NET PAY:', pageW - 70, finalY, { align: 'right' });
    doc.setFontSize(16); doc.setTextColor('#198754');
    doc.text(`₱ ${formatCurrency(totals.netPay)}`, pageW - 15, finalY, { align: 'right' });

    const pdfBlob = doc.output('blob');
    const url = URL.createObjectURL(pdfBlob);
    setPayslipPdfData(url);
    setShowPayslipPreview(true);
  };
  
  const ReadOnlyField = ({ label, value }) => (<div className="form-group"><label>{label}</label><span className="form-control-plaintext">₱{formatCurrency(value)}</span></div>);
  const AdjustmentField = ({ label, field }) => (<div className="form-group"><label htmlFor={field}>{label}</label><div className="input-group"><span className="input-group-text">₱</span><input type="number" id={field} className="form-control" value={adjustments[field]} onChange={e => handleAdjustmentChange(field, e.target.value)} /></div></div>);

  if (!show) return null;

  return (
    <>
      <div className={`modal fade show d-block ${showPayslipPreview ? 'modal-behind' : ''}`} tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
        <div className="modal-dialog modal-dialog-centered modal-lg payroll-adjustment-modal-dialog">
          <div className="modal-content payroll-adjustment-modal-content">
            <div className="modal-header">
              <h5 className="modal-title">
                <span className="employee-name">{payrollData.employeeName}</span><span className="period-text">({payrollData.cutOff})</span>
              </h5>
              <button type="button" className="btn-close" onClick={onClose}></button>
            </div>
            <div className="modal-body">
              <ul className="nav nav-tabs">
                <li className="nav-item"><button className={`nav-link ${activeTab === 'summary' ? 'active' : ''}`} onClick={() => setActiveTab('summary')}>Summary</button></li>
                <li className="nav-item"><button className={`nav-link ${activeTab === 'earnings' ? 'active' : ''}`} onClick={() => setActiveTab('earnings')}>Earnings</button></li>
                <li className="nav-item"><button className={`nav-link ${activeTab === 'deductions' ? 'active' : ''}`} onClick={() => setActiveTab('deductions')}>Deductions</button></li>
              </ul>
              <div className="tab-content">
                {activeTab === 'earnings' && <div className="form-grid">
                  <ReadOnlyField label="Calculated Base + Holiday/OT" value={totals.baseGrossPay} />
                  <AdjustmentField label="Allowances" field="allowances" />
                  <AdjustmentField label="Bonuses / Commission" field="bonuses" />
                  <AdjustmentField label="Other Earnings" field="otherEarnings" />
                  {/* --- NEW: Added Gross Pay for clarity --- */}
                  <ReadOnlyField label="Total Gross Pay" value={totals.totalGrossPay} />
                </div>}
                {activeTab === 'deductions' && <div className="form-grid">
                  <ReadOnlyField label="Withholding Tax" value={payrollData.deductions.tax} />
                  <ReadOnlyField label="SSS Contribution" value={payrollData.deductions.sss} />
                  <ReadOnlyField label="PhilHealth Contribution" value={payrollData.deductions.philhealth} />
                  <ReadOnlyField label="Pag-IBIG Contribution" value={payrollData.deductions.hdmf} />
                  <AdjustmentField label="Loan Repayments" field="loanRepayments" />
                  <AdjustmentField label="Cash Advances" field="cashAdvances" />
                </div>}
                {activeTab === 'summary' && <div className="summary-section">
                  <div className="summary-row"><span className="label">Total Gross Earnings</span><span className="value">₱{formatCurrency(totals.totalGrossPay)}</span></div>
                  <div className="summary-row total-deductions"><span className="label">Total Deductions</span><span className="value">- ₱{formatCurrency(totals.totalDeductions)}</span></div>
                  <div className="summary-row net-pay"><span className="label">Net Pay</span><span className="value">₱{formatCurrency(totals.netPay)}</span></div>
                </div>}
              </div>
            </div>
            <div className="modal-footer">
              <div className="footer-actions-left">
                  <button type="button" className="btn btn-outline-primary" onClick={handleGeneratePayslip}>
                    <i className="bi bi-file-earmark-text-fill me-2"></i>Preview Payslip
                  </button>
              </div>
              <div className="footer-actions-right">
                <div className="status-selector">
                  <label htmlFor="payrollStatus" className="form-label mb-0">Status:</label>
                  <select id="payrollStatus" className="form-select form-select-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="Pending">Pending</option>
                    <option value="Paid">Paid</option>
                  </select>
                </div>
                <button type="button" className="btn btn-success" onClick={handleSave}><i className="bi bi-save-fill me-2"></i>Save</button>
              </div>
            </div>
          </div>
        </div>
      </div>
      {showPayslipPreview && <ReportPreviewModal show={showPayslipPreview} onClose={() => setShowPayslipPreview(false)} pdfDataUri={payslipPdfData} reportTitle={`Payslip - ${payrollData.employeeName}`} />}
    </>
  );
};

export default PayrollAdjustmentModal;
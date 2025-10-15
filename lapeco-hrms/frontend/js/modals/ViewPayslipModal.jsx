import React, { useState, useMemo } from 'react';
import ReportPreviewModal from './ReportPreviewModal';
import useReportGenerator from '../hooks/useReportGenerator';
import './ViewPayslipModal.css';

const formatCurrency = (value) => Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const ViewPayslipModal = ({ show, onClose, payslipData }) => {
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  
  const { generateReport, pdfDataUri, isLoading, setPdfDataUri } = useReportGenerator();

  const totals = useMemo(() => {
    if (!payslipData) return { gross: 0, deductions: 0, net: 0 };
    const gross = payslipData.grossPay + (payslipData.adjustments?.allowances || 0) + (payslipData.adjustments?.bonuses || 0);
    const deductions = Object.values(payslipData.deductions).reduce((s, v) => s + v, 0);
    return { gross, deductions, net: gross - deductions };
  }, [payslipData]);
  
  const handleDownloadPdf = async () => {
    await generateReport('payslip', {}, { payslipData });
    setShowPdfPreview(true);
  };
  
  const handleClosePreview = () => {
    setShowPdfPreview(false);
    if (pdfDataUri) {
        URL.revokeObjectURL(pdfDataUri);
    }
    setPdfDataUri('');
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
                <div className="text-end">
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
              <button type="button" className="btn btn-primary" onClick={handleDownloadPdf} disabled={isLoading}>
                {isLoading ? 'Generating...' : <><i className="bi bi-download me-2"></i>Download PDF</>}
              </button>
            </div>
          </div>
        </div>
      </div>
      {(isLoading || pdfDataUri) && <ReportPreviewModal show={showPdfPreview} onClose={handleClosePreview} pdfDataUri={pdfDataUri} reportTitle="Payslip Preview" />}
    </>
  );
};

export default ViewPayslipModal;
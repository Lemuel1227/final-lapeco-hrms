import React, { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { addDays } from 'date-fns';
import ReportPreviewModal from '../../modals/ReportPreviewModal';
import useReportGenerator from '../../../hooks/useReportGenerator';
import './MyPayrollPage.css';

const formatCurrency = (value) => Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const MyPayrollHistoryPage = ({ currentUser, payrolls = [] }) => {
  const { employees, theme } = useOutletContext();
  
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const { generateReport, pdfDataUri, isLoading, setPdfDataUri } = useReportGenerator(theme);

  const myPayrolls = useMemo(() => {
    return payrolls
      .map(run => {
        const myRecord = run.records.find(rec => rec.empId === currentUser.id);
        if (!myRecord) return null;
        
        const totalEarnings = (myRecord.earnings || []).reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
        const totalStatutory = Object.values(myRecord.deductions || {}).reduce((sum, val) => sum + val, 0);
        const totalOther = (myRecord.otherDeductions || []).reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
        const netPay = totalEarnings - totalStatutory - totalOther;

        return { ...run, myRecord: { ...myRecord, calculatedNetPay: netPay } };
      })
      .filter(Boolean)
      .sort((a,b) => new Date(b.cutOff.split(' to ')[0]) - new Date(a.cutOff.split(' to ')[0]));
  }, [payrolls, currentUser.id]);

  const employeeDetails = useMemo(() => {
      return employees.find(emp => emp.id === currentUser.id);
  }, [employees, currentUser.id]);

  const handleViewPayslip = async (record, run) => {
    const [start, end] = run.cutOff.split(' to ');
    const calculatedPaymentDate = addDays(new Date(end), 5).toISOString().split('T')[0];
    
    const fullPayslipData = { 
      ...record,
      payStartDate: record.payStartDate ?? start,
      payEndDate: record.payEndDate ?? end,
      paymentDate: record.paymentDate ?? calculatedPaymentDate,
      period: record.period ?? run.cutOff,
      leaveBalances: employeeDetails?.leaveCredits || {},
    };

    await generateReport('payslip', {}, { payslipData: fullPayslipData, employeeDetails });
    setShowPdfPreview(true);
  };
  
  const handleClosePreview = () => {
    setShowPdfPreview(false);
    if (pdfDataUri) URL.revokeObjectURL(pdfDataUri);
    setPdfDataUri('');
  };

  return (
    <div className="my-payroll-history-container">
      <div className="accordion my-payroll-accordion" id="myPayrollHistoryAccordion">
        {myPayrolls.length > 0 ? myPayrolls.map((run) => (
          <div className="accordion-item" key={run.runId}>
            <h2 className="accordion-header">
              <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target={`#collapse-history-${run.runId}`}>
                <div className="period-info">
                  <span className="period-date">{run.cutOff}</span>
                  <span className="period-status">Status: {run.myRecord.status}</span>
                </div>
                <div className="period-summary">
                  <span className="summary-label">Official Net Pay</span>
                  <span className="summary-value">₱{formatCurrency(run.myRecord.calculatedNetPay)}</span>
                </div>
              </button>
            </h2>
            <div id={`collapse-history-${run.runId}`} className="accordion-collapse collapse" data-bs-parent="#myPayrollHistoryAccordion">
              <div className="accordion-body text-center p-4">
                  <p className="text-muted mb-3">This is an official record. View the full PDF payslip for a detailed breakdown of earnings and deductions.</p>
                  <button className="btn btn-primary" onClick={() => handleViewPayslip(run.myRecord, run)} disabled={isLoading}>
                      {isLoading ? 'Generating...' : <><i className="bi bi-file-earmark-pdf-fill me-2"></i>View Official Payslip PDF</>}
                  </button>
              </div>
            </div>
          </div>
        )) : (
          <div className="text-center p-5 bg-light rounded">
            <i className="bi bi-archive-fill fs-1 text-muted mb-3 d-block"></i>
            <h4 className="text-muted">No Official Payroll History</h4>
            <p className="text-muted">Your finalized payslips will appear here after they are processed by HR.</p>
          </div>
        )}
      </div>
      {(isLoading || pdfDataUri) && (
        <ReportPreviewModal 
          show={showPdfPreview} 
          onClose={handleClosePreview} 
          pdfDataUri={pdfDataUri} 
          reportTitle="Official Payslip"
        />
      )}
    </div>
  );
};

export default MyPayrollHistoryPage;
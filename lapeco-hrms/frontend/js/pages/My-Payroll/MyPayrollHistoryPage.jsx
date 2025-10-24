import React, { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { addDays } from 'date-fns';
import ReportPreviewModal from '../../modals/ReportPreviewModal';
import useReportGenerator from '../../hooks/useReportGenerator';
import './MyPayrollPage.css';
import { payrollAPI } from '../../services/api';

const formatCurrency = (value) => Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const MyPayrollHistoryPage = (props = {}) => {
  const { currentUser, payrolls } = props;
  const context = useOutletContext() || {};
  const employees = Array.isArray(context.employees) ? context.employees : [];
  const positions = Array.isArray(context.positions) ? context.positions : [];
  const theme = context.theme;

  const providedPayrolls = useMemo(() => (
    Array.isArray(payrolls) ? payrolls : []
  ), [payrolls]);

  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const { generateReport, pdfDataUri, isLoading, setPdfDataUri } = useReportGenerator(theme);
  const [payrollRuns, setPayrollRuns] = useState([]);
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState('');

  const effectiveUser = useMemo(() => {
    if (currentUser?.id) {
      return currentUser;
    }

    if (typeof window !== 'undefined') {
      try {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          return JSON.parse(storedUser);
        }
      } catch (error) {
        console.warn('Unable to parse stored user data:', error);
      }
    }

    return {};
  }, [currentUser]);

  useEffect(() => {
    if (providedPayrolls.length) {
      setPayrollRuns(providedPayrolls);
      return;
    }

    if (!effectiveUser?.id) {
      return;
    }

    let isMounted = true;
    const loadPayrolls = async () => {
      setIsFetching(true);
      setFetchError('');

      try {
        const { data } = await payrollAPI.getAll();
        if (!isMounted) return;

        setPayrollRuns(Array.isArray(data?.payroll_runs) ? data.payroll_runs : []);
      } catch (error) {
        if (!isMounted) return;

        const message = error.response?.data?.message || 'Failed to load payroll history.';
        setFetchError(message);
        setPayrollRuns([]);
      } finally {
        if (isMounted) {
          setIsFetching(false);
        }
      }
    };

    loadPayrolls();

    return () => {
      isMounted = false;
    };
  }, [providedPayrolls, effectiveUser?.id]);

  const identifierSet = useMemo(() => {
    const identifiers = new Set();

    const normalized = (value) => {
      if (value === undefined || value === null) return null;
      const stringValue = String(value).trim();
      return stringValue.length ? stringValue : null;
    };

    const candidateKeys = [
      normalized(effectiveUser?.employee_id),
      normalized(effectiveUser?.employeeId),
      normalized(effectiveUser?.empId),
      normalized(effectiveUser?.id),
    ];

    candidateKeys.forEach((value) => {
      if (value) {
        identifiers.add(value);
      }
    });

    return identifiers;
  }, [effectiveUser]);

  const sourcePayrolls = useMemo(() => {
    if (providedPayrolls.length) {
      return providedPayrolls;
    }

    return payrollRuns;
  }, [providedPayrolls, payrollRuns]);

  const [myPayrollRecords, setMyPayrollRecords] = useState([]);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);

  useEffect(() => {
    if (!identifierSet.size || !sourcePayrolls.length) {
      setMyPayrollRecords([]);
      return;
    }

    const loadMyRecords = async () => {
      setIsLoadingRecords(true);
      const records = [];

      for (const run of sourcePayrolls) {
        try {
          // Fetch employee list for this period
          const { data } = await payrollAPI.getPeriodDetails(run.periodId);
          
          // Find my record
          const myRecord = data.records?.find(rec => {
            const empIdentifier = rec?.empId !== undefined && rec?.empId !== null ? String(rec.empId).trim() : null;
            return empIdentifier && identifierSet.has(empIdentifier);
          });

          if (myRecord) {
            // Fetch full record details
            const { data: fullRecord } = await payrollAPI.getPayrollRecord(myRecord.payrollId);
            
            const totalEarnings = (fullRecord.earnings || []).reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
            const totalStatutory = Object.values(fullRecord.deductions || {}).reduce((sum, val) => sum + val, 0);
            const totalOther = (fullRecord.otherDeductions || []).reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
            const netPay = totalEarnings - totalStatutory - totalOther;

            records.push({ ...run, myRecord: { ...fullRecord, calculatedNetPay: netPay } });
          }
        } catch (error) {
          console.error('Failed to load payroll record:', error);
        }
      }

      records.sort((a,b) => new Date(b.cutOff.split(' to ')[0]) - new Date(a.cutOff.split(' to ')[0]));
      setMyPayrollRecords(records);
      setIsLoadingRecords(false);
    };

    loadMyRecords();
  }, [sourcePayrolls, identifierSet]);

  const myPayrolls = myPayrollRecords;

  const employeeDetails = useMemo(() => {
      if (!effectiveUser?.id) {
          return null;
      }
      
      // Build full name from effectiveUser first
      let userName = effectiveUser.name;
      if (!userName && (effectiveUser.first_name || effectiveUser.firstName)) {
        const parts = [
          effectiveUser.first_name || effectiveUser.firstName,
          effectiveUser.middle_name || effectiveUser.middleName,
          effectiveUser.last_name || effectiveUser.lastName
        ].filter(Boolean);
        userName = parts.join(' ');
      }
      
      const emp = employees.find(e => e?.id === effectiveUser.id);

      // Try to find position from effectiveUser first
      const userPosition = positions.find(p => p?.id === effectiveUser.position_id || p?.id === effectiveUser.positionId);
      const userPositionTitle = userPosition ? (userPosition.title || userPosition.name) : 
                                (effectiveUser?.position_title || effectiveUser?.position?.name || effectiveUser?.position || 'N/A');

      if (!emp) {
          return {
              ...effectiveUser,
              id: String(effectiveUser.id || ''),
              name: String(userName || ''),
              email: String(effectiveUser.email || ''),
              tinNo: String(effectiveUser.tin_no || effectiveUser.tinNo || ''),
              sssNo: String(effectiveUser.sss_no || effectiveUser.sssNo || ''),
              philhealthNo: String(effectiveUser.philhealth_no || effectiveUser.philhealthNo || ''),
              pagIbigNo: String(effectiveUser.pag_ibig_no || effectiveUser.pagIbigNo || ''),
              positionTitle: userPositionTitle,
          };
      }

      const pos = positions.find(p => p?.id === emp.positionId || p?.id === emp.position_id);
      
      // Build full name from components if name field doesn't exist
      let fullName = emp.name;
      if (!fullName && (emp.first_name || emp.firstName)) {
        const parts = [
          emp.first_name || emp.firstName,
          emp.middle_name || emp.middleName,
          emp.last_name || emp.lastName
        ].filter(Boolean);
        fullName = parts.join(' ');
      }
      
      return { 
        ...emp, 
        id: String(emp.id || ''),
        name: String(fullName || userName || ''),
        email: String(emp.email || ''),
        tinNo: String(emp.tin_no || emp.tinNo || ''),
        sssNo: String(emp.sss_no || emp.sssNo || ''),
        philhealthNo: String(emp.philhealth_no || emp.philhealthNo || ''),
        pagIbigNo: String(emp.pag_ibig_no || emp.pagIbigNo || ''),
        positionTitle: pos ? (pos.title || pos.name) : userPositionTitle
      };
  }, [employees, positions, effectiveUser]);

  const handleViewPayslip = async (record, run) => {
    // Use employeeDetails from the record if available, otherwise use the computed one
    const payslipEmployeeDetails = record.employeeDetails ? {
      ...record.employeeDetails,
      id: String(record.employeeDetails.id || ''),
      name: String(record.employeeDetails.name || ''),
      email: String(record.employeeDetails.email || ''),
      tinNo: String(record.employeeDetails.tinNo || ''),
      sssNo: String(record.employeeDetails.sssNo || ''),
      philhealthNo: String(record.employeeDetails.philhealthNo || ''),
      pagIbigNo: String(record.employeeDetails.pagIbigNo || ''),
      positionTitle: record.employeeDetails.position || record.employeeDetails.positionTitle || 'N/A',
    } : employeeDetails;

    if (!payslipEmployeeDetails) {
        console.error("Employee details not available yet.");
        return;
    }

    const [start, end] = run.cutOff.split(' to ');
    const calculatedPaymentDate = addDays(new Date(end), 5).toISOString().split('T')[0];
    
    const fullPayslipData = { 
      ...record,
      payrollId: String(record.payrollId || ''),
      empId: String(record.empId || ''),
      payStartDate: record.payStartDate ?? start,
      payEndDate: record.payEndDate ?? end,
      paymentDate: record.paymentDate ?? calculatedPaymentDate,
      period: record.period ?? run.cutOff,
      leaveBalances: record.leaveBalances || payslipEmployeeDetails?.leaveCredits || {},
    };

    await generateReport('payslip', {}, { payslipData: fullPayslipData, employeeDetails: payslipEmployeeDetails });
    setShowPdfPreview(true);
  };
  
  const handleClosePreview = () => {
    setShowPdfPreview(false);
    if (pdfDataUri) URL.revokeObjectURL(pdfDataUri);
    setPdfDataUri('');
  };

  return (
    <div className="my-payroll-history-container mt-4">
      {(isFetching || isLoadingRecords) && (
        <div className="alert alert-info" role="alert">
          Loading your payroll history...
        </div>
      )}

      {!isFetching && fetchError && (
        <div className="alert alert-danger" role="alert">
          {fetchError}
        </div>
      )}

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
                  <button className="btn btn-primary" onClick={() => handleViewPayslip(run.myRecord, run)} disabled={isLoading || !employeeDetails}>
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
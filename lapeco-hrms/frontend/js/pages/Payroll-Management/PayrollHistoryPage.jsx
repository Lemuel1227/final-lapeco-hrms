import React, { useState, useMemo, useEffect } from 'react';
import PayrollRunCard from './PayrollRunCard';
import PayrollRunDetailModal from './PayrollRunDetailModal';
import PayrollAdjustmentModal from '../../modals/PayrollAdjustmentModal';
import ConfirmationModal from '../../modals/ConfirmationModal';
import ReportConfigurationModal from '../../modals/ReportConfigurationModal';
import ReportPreviewModal from '../../modals/ReportPreviewModal';
import ToastNotification from '../../common/ToastNotification';
import useReportGenerator from '../../hooks/useReportGenerator';
import { reportsConfig } from '../../config/reports.config';
import { payrollAPI, positionAPI } from '../../services/api';

const PayrollHistoryPage = ({ payrolls=[], employees=[], positions=[], handlers, allLeaveRequests }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortConfig, setSortConfig] = useState({ key: 'payPeriod', direction: 'desc' });

  // Modal States
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedRun, setSelectedRun] = useState(null);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [runToDelete, setRunToDelete] = useState(null);
  const [runToMarkAsPaid, setRunToMarkAsPaid] = useState(null); // --- NEW STATE ---
  
  // Report States
  const [showReportConfigModal, setShowReportConfigModal] = useState(false);
  const [reportToGenerate, setReportToGenerate] = useState(null);
  const { generateReport, pdfDataUri, isLoading, setPdfDataUri } = useReportGenerator();
  const [showReportPreview, setShowReportPreview] = useState(false);
  
  // Toast notification state
  const [toast, setToast] = useState(null);

  const employeeMap = useMemo(() => new Map(employees.map(e => [e.id, e])), [employees]);

  const [fetchedPayrolls, setFetchedPayrolls] = useState([]);
  const [fetchedPositions, setFetchedPositions] = useState([]);
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      setIsFetching(true);
      setFetchError('');
      try {
        const promises = [];
        
        // Fetch payrolls if not provided
        if (payrolls.length === 0) {
          promises.push(payrollAPI.getAll());
        }
        
        // Fetch positions if not provided
        if (positions.length === 0) {
          promises.push(positionAPI.getAll());
        }

        const results = await Promise.all(promises);
        
        if (!isMounted) return;
        
        let resultIndex = 0;
        if (payrolls.length === 0) {
          const payrollData = results[resultIndex++];
          setFetchedPayrolls(Array.isArray(payrollData?.data?.payroll_runs) ? payrollData.data.payroll_runs : []);
        }
        
        if (positions.length === 0) {
          const positionData = results[resultIndex++];
          setFetchedPositions(Array.isArray(positionData?.data) ? positionData.data : []);
        }
      } catch (error) {
        if (!isMounted) return;
        const message = error.response?.data?.message || 'Failed to load data.';
        setFetchError(message);
        setFetchedPayrolls([]);
        setFetchedPositions([]);
      } finally {
        if (isMounted) {
          setIsFetching(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [payrolls.length, positions.length]);

  const resolvedPayrolls = payrolls.length > 0 ? payrolls : fetchedPayrolls;
  const resolvedPositions = positions.length > 0 ? positions : fetchedPositions;

  const noopHandlers = useMemo(() => ({
    updatePayrollRecord: () => {},
    saveEmployee: () => {},
    markRunAsPaid: () => {},
    deletePayrollRun: () => {},
  }), []);

  const resolvedHandlers = handlers ?? noopHandlers;

  const processedPayrolls = useMemo(() => {
    return resolvedPayrolls.map(run => {
      // Use backend-provided totals if available (new API)
      if (run.totalNet !== undefined && run.isPaid !== undefined) {
        return run;
      }
      
      // Fallback for old API format with records array
      if (run.records && Array.isArray(run.records)) {
        const { totalNet } = run.records.reduce((acc, rec) => {
            const totalEarnings = (rec.earnings || []).reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
            const totalStatutory = Object.values(rec.deductions || {}).reduce((sum, val) => sum + val, 0);
            const totalOther = (rec.otherDeductions || []).reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
            acc.totalNet += totalEarnings - totalStatutory - totalOther;
            return acc;
        }, { totalNet: 0 });

        const isPaid = run.records.every(r => r.status === 'Paid');
        return { ...run, totalNet, isPaid };
      }
      
      // Default fallback
      return { ...run, totalNet: 0, isPaid: false };
    });
  }, [resolvedPayrolls]);

  const filteredAndSortedPayrolls = useMemo(() => { 
    let results = [...processedPayrolls];
    if (statusFilter !== 'All') {
        results = results.filter(p => statusFilter === 'Paid' ? p.isPaid : !p.isPaid);
    }
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      results = results.filter(p => 
        p.cutOff.toLowerCase().includes(lowerSearch) ||
        p.runId.toLowerCase().includes(lowerSearch)
      );
    }

    return [...results].sort((a, b) => {
      let valA, valB;
      
      if (sortConfig.key === 'payPeriod') {
        valA = new Date(a.cutOff.split(' to ')[0]);
        valB = new Date(b.cutOff.split(' to ')[0]);
      } else {
        valA = a[sortConfig.key];
        valB = b[sortConfig.key];
      }

      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [processedPayrolls, searchTerm, statusFilter, sortConfig]);

  const handleSortChange = (e) => {
    const [key, direction] = e.target.value.split('-');
    setSortConfig({ key, direction });
  };

  const handleViewDetails = (run) => {
    setSelectedRun(run);
    setShowDetailModal(true);
  };
  
  const handleOpenAdjustmentModal = async (record, run) => {
    try {
      // Close detail modal before opening adjustment modal
      setShowDetailModal(false);
      
      // Fetch full payroll record details
      const { data } = await payrollAPI.getPayrollRecord(record.payrollId);
      
      // Use backend-provided employee details or fallback to employeeMap
      const employeeData = data.employeeDetails || employeeMap.get(record.empId);
      
      setSelectedRecord(data);
      setSelectedEmployee(employeeData);
      setShowAdjustmentModal(true);
    } catch (error) {
      console.error('Failed to load payroll record:', error);
      alert('Failed to load payroll details. Please try again.');
    }
  };
  
  const handleCloseAllModals = () => {
      setShowDetailModal(false);
      setShowAdjustmentModal(false);
      setSelectedRun(null);
      setSelectedRecord(null);
      setSelectedEmployee(null);
      setShowReportConfigModal(false);
  };

  const handleSaveAdjustments = async (payrollId, updatedData) => {
    try {
      // If handlers provided, use them (for parent component integration)
      if (handlers?.updatePayrollRecord) {
        await resolvedHandlers.updatePayrollRecord(payrollId, updatedData);
      } else {
        // Otherwise, call API directly
        await payrollAPI.update(payrollId, updatedData);
        
        // Refresh the payroll data
        if (selectedRun) {
          const response = await payrollAPI.getPeriodDetails(selectedRun.periodId);
          setSelectedRun(response.data);
        }
        
        // Refresh the payroll list
        const payrollsResponse = await payrollAPI.getAll();
        setFetchedPayrolls(payrollsResponse.data.payroll_runs || []);
        
        setToast({ message: 'Payroll updated successfully', type: 'success' });
      }
      handleCloseAllModals();
    } catch (error) {
      console.error('Error updating payroll:', error);
      setToast({ message: error.response?.data?.message || 'Failed to update payroll', type: 'error' });
    }
  };
  
  const handleSaveEmployeeInfo = (employeeId, updatedData) => {
      resolvedHandlers.saveEmployee(updatedData, employeeId);
  };
  
  // --- MODIFIED: Opens the confirmation modal instead of using window.confirm ---
  const handleMarkRunAsPaid = (run) => {
    setRunToMarkAsPaid(run);
  };
  
  // --- NEW: Handler for modal confirmation ---
  const confirmMarkAsPaid = async () => {
    if (!runToMarkAsPaid) return;
    
    try {
      // If handlers provided, use them (for parent component integration)
      if (handlers?.markRunAsPaid) {
        await resolvedHandlers.markRunAsPaid(runToMarkAsPaid.runId);
      } else {
        // Otherwise, call API directly
        await payrollAPI.markPeriodAsPaid(runToMarkAsPaid.periodId);
        
        // Refresh the payroll list
        const payrollsResponse = await payrollAPI.getAll();
        setFetchedPayrolls(payrollsResponse.data.payroll_runs || []);
        
        setToast({ message: 'Payroll run marked as paid successfully', type: 'success' });
      }
      setRunToMarkAsPaid(null);
    } catch (error) {
      console.error('Error marking as paid:', error);
      setToast({ message: error.response?.data?.message || 'Failed to mark as paid', type: 'error' });
    }
  };

  const handleConfirmDelete = async () => {
    if (!runToDelete) return;
    
    try {
      // If handlers provided, use them (for parent component integration)
      if (handlers?.deletePayrollRun) {
        await resolvedHandlers.deletePayrollRun(runToDelete.runId);
      } else {
        // Otherwise, call API directly
        await payrollAPI.deletePeriod(runToDelete.periodId);
        
        // Refresh the payroll list
        const payrollsResponse = await payrollAPI.getAll();
        setFetchedPayrolls(payrollsResponse.data.payroll_runs || []);
        
        setToast({ message: 'Payroll run deleted successfully', type: 'success' });
      }
      setRunToDelete(null);
      handleCloseAllModals();
    } catch (error) {
      console.error('Error deleting payroll run:', error);
      setToast({ message: error.response?.data?.message || 'Failed to delete payroll run', type: 'error' });
    }
  };

  const handleOpenReportConfig = () => {
    const reportConf = reportsConfig.find(r => r.id === 'payroll_run_summary');
    if (reportConf) {
      setReportToGenerate(reportConf);
      setShowReportConfigModal(true);
    }
  };
  
  const handleRunReport = (reportId, params) => {
    generateReport(reportId, params, { payrolls: resolvedPayrolls });
    setShowReportConfigModal(false);
    setShowReportPreview(true);
  };

  const handleCloseReportPreview = () => {
    setShowReportPreview(false);
    if(pdfDataUri) URL.revokeObjectURL(pdfDataUri);
    setPdfDataUri('');
  };

  return (
    <div className="payroll-history-container">
      <div className="payroll-history-controls mb-4">
        <div className="input-group">
            <span className="input-group-text"><i className="bi bi-search"></i></span>
            <input 
                type="text" 
                className="form-control" 
                placeholder="Search by pay period or Run ID..." 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
            />
        </div>
        <div className="d-flex align-items-center gap-3">
            <button className="btn btn-outline-secondary" onClick={handleOpenReportConfig}>
                <i className="bi bi-file-earmark-pdf-fill me-2"></i>Generate Report
            </button>
            <div className="d-flex align-items-center gap-2">
                <label htmlFor="payrollSort" className="form-label mb-0 small text-muted flex-shrink-0">Sort by:</label>
                <select 
                    id="payrollSort" 
                    className="form-select form-select-sm" 
                    value={`${sortConfig.key}-${sortConfig.direction}`} 
                    onChange={handleSortChange}
                >
                    <option value="payPeriod-desc">Pay Period (Newest first)</option>
                    <option value="payPeriod-asc">Pay Period (Oldest first)</option>
                    <option value="totalNet-desc">Total Payout (High to Low)</option>
                    <option value="totalNet-asc">Total Payout (Low to High)</option>
                </select>
            </div>
            <div className="btn-group" role="group">
                <button type="button" className={`btn ${statusFilter === 'All' ? 'btn-dark' : 'btn-outline-dark'}`} onClick={() => setStatusFilter('All')}>All</button>
                <button type="button" className={`btn ${statusFilter === 'Pending' ? 'btn-dark' : 'btn-outline-dark'}`} onClick={() => setStatusFilter('Pending')}>Pending</button>
                <button type="button" className={`btn ${statusFilter === 'Paid' ? 'btn-dark' : 'btn-outline-dark'}`} onClick={() => setStatusFilter('Paid')}>Paid</button>
            </div>
        </div>
      </div>
      
      {fetchError && <div className="alert alert-danger">{fetchError}</div>}

      <div className="payroll-run-grid">
        {filteredAndSortedPayrolls.map((run) => (
          <PayrollRunCard
            key={run.runId}
            run={run}
            onViewDetails={() => handleViewDetails(run)}
            onMarkAsPaid={() => handleMarkRunAsPaid(run)}
            onDelete={() => setRunToDelete(run)}
          />
        ))}
      </div>
      {isFetching && <p className="text-center text-muted mt-4">Loading payroll runs...</p>}

      {!isFetching && filteredAndSortedPayrolls.length === 0 && <p className="text-center text-muted mt-4">No payroll history matches your criteria.</p>}

      {selectedRun && (
        <PayrollRunDetailModal
            show={showDetailModal}
            onClose={handleCloseAllModals}
            run={selectedRun}
            onAdjust={handleOpenAdjustmentModal}
        />
      )}

      {selectedRecord && (
        <PayrollAdjustmentModal 
          show={showAdjustmentModal} 
          onClose={handleCloseAllModals} 
          onSave={handleSaveAdjustments}
          onSaveEmployeeInfo={handleSaveEmployeeInfo}
          payrollData={selectedRecord}
          employeeDetails={selectedEmployee}
          positions={resolvedPositions}
          allLeaveRequests={allLeaveRequests}
          employees={employees}
        />
      )}
      
      {/* --- NEW: Confirmation Modal for Marking as Paid --- */}
      <ConfirmationModal
        show={!!runToMarkAsPaid}
        onClose={() => setRunToMarkAsPaid(null)}
        onConfirm={confirmMarkAsPaid}
        title="Mark Run as Paid"
        confirmText="Yes, Mark as Paid"
        confirmVariant="success"
      >
        {runToMarkAsPaid && (
          <>
            <p>Are you sure you want to mark all {runToMarkAsPaid.employeeCount} employee records in this payroll run as 'Paid'?</p>
            <p className="text-muted small"><strong>Pay Period:</strong> {runToMarkAsPaid.cutOff}</p>
          </>
        )}
      </ConfirmationModal>

      <ConfirmationModal
        show={!!runToDelete}
        onClose={() => setRunToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Confirm Payroll Deletion"
        confirmText="Yes, Delete"
        confirmVariant="danger"
      >
        {runToDelete && (
            <p>Are you sure you want to permanently delete the entire payroll run for the period <strong>{runToDelete.cutOff}</strong>?</p>
        )}
        <p className="text-danger">This will delete records for all employees in this run and cannot be undone.</p>
      </ConfirmationModal>

      <ReportConfigurationModal
        show={showReportConfigModal}
        onClose={handleCloseAllModals}
        reportConfig={reportToGenerate}
        onRunReport={handleRunReport}
        payrolls={resolvedPayrolls}
      />

      {(isLoading || pdfDataUri) && (
        <ReportPreviewModal
            show={showReportPreview}
            onClose={handleCloseReportPreview}
            pdfDataUri={pdfDataUri}
            reportTitle="Payroll Run Summary"
        />
      )}

      {toast && (
        <ToastNotification
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default PayrollHistoryPage;
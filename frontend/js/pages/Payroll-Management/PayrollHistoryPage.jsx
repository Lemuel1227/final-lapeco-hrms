// src/components/pages/Payroll-Management/PayrollHistoryPage.jsx

import React, { useState, useMemo } from 'react';
import PayrollRunCard from './PayrollRunCard';
import PayrollRunDetailModal from './PayrollRunDetailModal';
import PayrollAdjustmentModal from '../../modals/PayrollAdjustmentModal';
import ConfirmationModal from '../../modals/ConfirmationModal';

const PayrollHistoryPage = ({ payrolls, employees, positions, handlers, allLeaveRequests }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortConfig, setSortConfig] = useState({ key: 'payPeriod', direction: 'desc' });

  // State for the Detail Modal (listing employees in a run)
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedRun, setSelectedRun] = useState(null);

  // State for the Adjustment Modal (editing a single employee's payroll)
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  
  const [runToDelete, setRunToDelete] = useState(null);

  const employeeMap = useMemo(() => new Map((employees || []).map(e => [e.id, e])), [employees]);

  const processedPayrolls = useMemo(() => {
    return (payrolls || []).map(run => {
      const { totalNet } = run.records.reduce((acc, rec) => {
          const totalEarnings = (rec.earnings || []).reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
          const totalStatutory = Object.values(rec.deductions || {}).reduce((sum, val) => sum + val, 0);
          const totalOther = (rec.otherDeductions || []).reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
          acc.totalNet += totalEarnings - totalStatutory - totalOther;
          return acc;
      }, { totalNet: 0 });

      const isPaid = run.records.every(r => r.status === 'Paid');
      return { ...run, totalNet, isPaid };
    });
  }, [payrolls]);

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

      if (valA < valB) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (valA > valB) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
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
  
  const handleOpenAdjustmentModal = (record, run) => {
    const fullRecord = run.records.find(r => r.payrollId === record.payrollId);
    const employeeData = employeeMap.get(record.empId);
    
    setSelectedRecord({ ...fullRecord, cutOff: run.cutOff });
    setSelectedEmployee(employeeData);
    setShowAdjustmentModal(true);
  };
  
  const handleCloseAllModals = () => {
      setShowDetailModal(false);
      setShowAdjustmentModal(false);
      setSelectedRun(null);
      setSelectedRecord(null);
      setSelectedEmployee(null);
  };

  const handleSaveAdjustments = (payrollId, updatedData) => {
    handlers.updatePayrollRecord(payrollId, updatedData);
    handleCloseAllModals();
  };
  
  const handleSaveEmployeeInfo = (employeeId, updatedData) => {
      handlers.saveEmployee(updatedData, employeeId);
  };

  const handleMarkRunAsPaid = (run) => {
    if(window.confirm(`Mark all ${run.records.length} pending records in this run as 'Paid'?`)) {
        run.records.forEach(rec => {
            if(rec.status !== 'Paid') {
                handlers.updatePayrollRecord(rec.payrollId, { ...rec, status: 'Paid' });
            }
        });
    }
  };

  const handleConfirmDelete = () => {
    if (runToDelete) {
      handlers.deletePayrollRun(runToDelete.runId);
      setRunToDelete(null);
      handleCloseAllModals();
    }
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
      {filteredAndSortedPayrolls.length === 0 && <p className="text-center text-muted mt-4">No payroll history matches your criteria.</p>}

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
          positions={positions}
          allLeaveRequests={allLeaveRequests}
          employees={employees}
        />
      )}

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
    </div>
  );
};

export default PayrollHistoryPage;
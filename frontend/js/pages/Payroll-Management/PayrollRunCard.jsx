import React from 'react';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

const formatCurrency = (value) => Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const PayrollRunCard = ({ run, onViewDetails, onMarkAsPaid, onDelete }) => {

  const handleExportRun = (e) => {
    e.stopPropagation();
    const headers = ["Employee ID", "Employee Name", "Gross Pay", "Total Deductions", "Net Pay", "Status"];
    const csvData = run.records.map(rec => {
        const totalEarnings = (rec.earnings || []).reduce((s, i) => s + Number(i.amount), 0);
        const totalDeductions = Object.values(rec.deductions).reduce((s, v) => s + v, 0) + (rec.otherDeductions || []).reduce((s, i) => s + Number(i.amount), 0);
        const netPay = totalEarnings - totalDeductions;
        return [ rec.empId, rec.employeeName, totalEarnings.toFixed(2), totalDeductions.toFixed(2), netPay.toFixed(2), rec.status ].join(',');
    });
    const csvContent = [headers.join(','), ...csvData].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `Payroll_${run.cutOff}.csv`);
  };

  const handleActionClick = (e, action) => {
    e.stopPropagation();
    action();
  };

  const payDate = run.records[0]?.paymentDate || format(addDays(new Date(run.cutOff.split(' to ')[1]), 5), 'yyyy-MM-dd');

  return (
    <div className="payroll-run-card" onClick={onViewDetails}>
      <div className="card-header">
        <div className="header-info">
          <h5 className="card-title">{run.cutOff}</h5>
          <span className="card-subtitle">{run.runId}</span>
        </div>
        <span className={`status-badge ${run.isPaid ? 'status-paid' : 'status-pending'}`}>
          {run.isPaid ? 'Paid' : 'Pending'}
        </span>
      </div>
      <div className="card-body">
        <dl className="stats-list">
          <div className="stat-item">
            <dt>Total Net Payout</dt>
            <dd className="net-payout">₱{formatCurrency(run.totalNet)}</dd>
          </div>
          <div className="stat-item">
            <dt>Employees</dt>
            <dd>{run.records.length}</dd>
          </div>
          <div className="stat-item">
            <dt>Pay Date</dt>
            <dd>{format(new Date(payDate + 'T00:00:00'), 'MMM dd, yyyy')}</dd>
          </div>
        </dl>
      </div>
      <div className="card-footer">
        {!run.isPaid && (
          <button className="btn btn-sm btn-success" onClick={(e) => handleActionClick(e, onMarkAsPaid)}>
            Mark All as Paid
          </button>
        )}
        <button className="btn btn-sm btn-primary" onClick={(e) => handleActionClick(e, onViewDetails)}>
          View Details
        </button>
        <div className="dropdown">
            <button className="btn btn-sm btn-outline-secondary" type="button" data-bs-toggle="dropdown" onClick={(e) => e.stopPropagation()} aria-expanded="false">
                <i className="bi bi-three-dots-vertical"></i>
            </button>
            <ul className="dropdown-menu dropdown-menu-end">
                <li><a className="dropdown-item" href="#" onClick={handleExportRun}><i className="bi bi-download me-2"></i>Export CSV</a></li>
                <li><hr className="dropdown-divider" /></li>
                <li><a className="dropdown-item text-danger" href="#" onClick={(e) => handleActionClick(e, onDelete)}><i className="bi bi-trash-fill me-2"></i>Delete Run</a></li>
            </ul>
        </div>
      </div>
    </div>
  );
};

export default PayrollRunCard;
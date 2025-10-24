import React from 'react';
import { format, addDays } from 'date-fns';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

const formatCurrency = (value) => Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const PayrollRunCard = ({ run, onViewDetails, onMarkAsPaid, onDelete }) => {

  const handleExportRun = (e) => {
    e.stopPropagation();
    // Export functionality will need to fetch full data first
    alert('Export functionality requires loading full payroll data. This feature will be implemented in the detail view.');
  };

  const handleActionClick = (e, action) => {
    e.stopPropagation();
    action();
  };

  const payDate = format(addDays(new Date(run.cutOff.split(' to ')[1]), 5), 'yyyy-MM-dd');

  // Use backend-provided totals (new API) or calculate from records (old API)
  const grossPay = run.totalGross ?? 0;
  const totalDeductions = run.totalDeductions ?? 0;
  const employeeCount = run.employeeCount ?? (run.records?.length || 0);

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
        <div className="body-column financials">
            <div className="financial-item">
                <span className="financial-label">Gross Pay</span>
                <span className="financial-value">₱{formatCurrency(grossPay)}</span>
            </div>
            <div className="financial-item">
                <span className="financial-label">Deductions</span>
                <span className="financial-value text-danger">- ₱{formatCurrency(totalDeductions)}</span>
            </div>
             <div className="financial-item net-payout">
                <span className="financial-label">Total Net Payout</span>
                <span className="financial-value">₱{formatCurrency(run.totalNet)}</span>
            </div>
        </div>
        <div className="body-column details">
            <div className="detail-item">
                <span className="detail-label">Pay Date</span>
                <span className="detail-value">{format(new Date(payDate + 'T00:00:00'), 'MMM dd, yyyy')}</span>
            </div>
            <div className="detail-item">
                <span className="detail-label">Employees</span>
                <span className="detail-value">{employeeCount}</span>
            </div>
        </div>
      </div>
      <div className="card-footer">
        {!run.isPaid && (
          <button className="btn btn-sm btn-success" onClick={(e) => handleActionClick(e, onMarkAsPaid)}>
            Mark All as Paid
          </button>
        )}
        <div className="ms-auto d-flex gap-2">
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
    </div>
  );
};

export default PayrollRunCard;
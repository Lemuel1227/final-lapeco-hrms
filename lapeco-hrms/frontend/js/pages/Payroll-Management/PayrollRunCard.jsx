import React from 'react';
import { format, addDays } from 'date-fns';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { payrollAPI } from '../../services/api';

const formatCurrency = (value) => Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const PayrollRunCard = ({ run, onViewDetails, onMarkAsPaid, onDelete }) => {

  const handleExportRun = async (e) => {
    e.stopPropagation();
    
    try {
      // Fetch full payroll details
      const response = await payrollAPI.getPeriodDetails(run.periodId);
      const { records, cutOff } = response.data;
      
      if (!records || records.length === 0) {
        alert('No payroll records found to export.');
        return;
      }
      
      // Prepare data for CSV export
      const csvData = records.map(record => ({
        'Employee ID': record.empId,
        'Employee Name': record.employeeName,
        'Net Pay': Number(record.netPay).toFixed(2),
        'Status': record.status
      }));
      
      // Create worksheet and workbook
      const worksheet = XLSX.utils.json_to_sheet(csvData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Payroll');
      
      // Generate CSV file
      const csvOutput = XLSX.write(workbook, { bookType: 'csv', type: 'string' });
      const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' });
      
      // Download file
      const fileName = `Payroll_${run.runId}_${cutOff.replace(/ to /g, '_').replace(/\s/g, '')}.csv`;
      saveAs(blob, fileName);
    } catch (error) {
      console.error('Error exporting payroll:', error);
      alert('Failed to export payroll data. Please try again.');
    }
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
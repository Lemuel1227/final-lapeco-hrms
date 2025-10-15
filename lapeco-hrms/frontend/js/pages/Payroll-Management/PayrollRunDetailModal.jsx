import React, { useState, useMemo } from 'react';

const formatCurrency = (value) => Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const PayrollRunDetailModal = ({ show, onClose, run, onAdjust }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredRecords = useMemo(() => {
    if (!searchTerm) return run.records;
    const lowerSearch = searchTerm.toLowerCase();
    return run.records.filter(rec => 
        rec.employeeName.toLowerCase().includes(lowerSearch) ||
        rec.empId.toLowerCase().includes(lowerSearch)
    );
  }, [run.records, searchTerm]);
  
  if (!show) return null;

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div className="modal-dialog modal-dialog-centered modal-xl">
        <div className="modal-content">
          <div className="modal-header">
            <div>
              <h5 className="modal-title">Payroll Details</h5>
              <p className="modal-subtitle mb-0">{run.cutOff}</p>
            </div>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            <div className="input-group mb-3">
              <span className="input-group-text"><i className="bi bi-search"></i></span>
              <input 
                type="text" 
                className="form-control" 
                placeholder="Search employees in this run..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="table-responsive" style={{ maxHeight: '60vh' }}>
              <table className="table data-table table-hover mb-0">
                <thead>
                  <tr>
                    <th>Employee ID</th>
                    <th>Employee Name</th>
                    <th className="text-end">Net Pay</th>
                    <th className="text-center">Status</th>
                    <th className="text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map(record => {
                    const totalEarnings = (record.earnings || []).reduce((s, i) => s + Number(i.amount), 0);
                    const totalDeductions = Object.values(record.deductions).reduce((s, v) => s + v, 0) + (record.otherDeductions || []).reduce((s, i) => s + Number(i.amount), 0);
                    const netPay = totalEarnings - totalDeductions;
                    return (
                      <tr key={record.payrollId}>
                        <td>{record.empId}</td>
                        <td>{record.employeeName}</td>
                        <td className="text-end fw-bold">₱{formatCurrency(netPay)}</td>
                        <td className="text-center"><span className={`status-badge status-${record.status.toLowerCase()}`}>{record.status}</span></td>
                        <td className="text-center"><button className="btn btn-sm btn-outline-primary" onClick={() => onAdjust(record, run)}>View & Adjust</button></td>
                      </tr>
                    )
                  })}
                  {filteredRecords.length === 0 && <tr><td colSpan="5" className="text-center p-4">No records found for your search.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline-secondary" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PayrollRunDetailModal;
import React from 'react';

const formatCurrency = (value) => value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const IncomeBreakdownModal = ({ show, onClose, data }) => {
  if (!show) return null;

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Income Breakdown for {data.emp.name}</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
            <table className="table table-sm table-striped">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Status</th>
                  <th className="text-right">Pay</th>
                </tr>
              </thead>
              <tbody>
                {data.breakdown.map((day, index) => (
                  <tr key={index}>
                    <td>{new Date(day.date + 'T00:00:00').toLocaleDateString()}</td>
                    <td>{day.status}</td>
                    <td className="text-right">₱{formatCurrency(day.pay)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="table-light">
                  <td colSpan="2" className="fw-bold text-right">Total Gross Income</td>
                  <td className="fw-bold text-right">₱{formatCurrency(data.totalGross)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IncomeBreakdownModal;
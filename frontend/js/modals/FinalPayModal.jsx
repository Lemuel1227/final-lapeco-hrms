import React from 'react';

const formatCurrency = (value) => (value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const FinalPayModal = ({ show, onClose, data }) => {
    if (!show || !data) return null;

    const { breakdown, employeeName } = data;

    return (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">Final Pay Calculation for {employeeName}</h5>
                        <button type="button" className="btn-close" onClick={onClose}></button>
                    </div>
                    <div className="modal-body">
                        <p className="text-muted small">This is an estimated calculation based on available data. All values are subject to final review by HR and Finance.</p>
                        
                        <h6 className="mt-4">Earnings & Payouts</h6>
                        <ul className="list-group mb-3">
                            {breakdown.earnings.map(item => (
                                <li key={item.label} className="list-group-item d-flex justify-content-between align-items-center">
                                    {item.label}
                                    <span className="text-success">+ ₱{formatCurrency(item.amount)}</span>
                                </li>
                            ))}
                            <li className="list-group-item d-flex justify-content-between align-items-center list-group-item-light fw-bold">
                                Total Earnings
                                <span>₱{formatCurrency(breakdown.totalEarnings)}</span>
                            </li>
                        </ul>

                        <h6>Deductions & Liabilities</h6>
                        <ul className="list-group">
                             {breakdown.deductions.map(item => (
                                <li key={item.label} className="list-group-item d-flex justify-content-between align-items-center">
                                    {item.label}
                                    <span className="text-danger">- ₱{formatCurrency(item.amount)}</span>
                                </li>
                            ))}
                            <li className="list-group-item d-flex justify-content-between align-items-center list-group-item-light fw-bold">
                                Total Deductions
                                <span>₱{formatCurrency(breakdown.totalDeductions)}</span>
                            </li>
                        </ul>
                    </div>
                    <div className="modal-footer d-flex justify-content-between align-items-center bg-light">
                        <h5 className="mb-0">Final Pay Total:</h5>
                        <h5 className="mb-0 text-success fw-bold">₱{formatCurrency(breakdown.finalPay)}</h5>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FinalPayModal;
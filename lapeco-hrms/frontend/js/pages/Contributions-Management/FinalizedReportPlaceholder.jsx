import React from 'react';

const FinalizedReportPlaceholder = ({ onNavigate, reportInfo }) => {
  return (
    <div className="text-center p-5 bg-light rounded mt-3 finalized-placeholder">
      <i className="bi bi-archive-fill fs-1 text-success mb-3 d-block"></i>
      <h4 className="text-success">Period Finalized</h4>
      <p className="text-muted">
        All contribution reports for the pay period <strong>{reportInfo.payPeriod}</strong> have already been finalized.
      </p>
      <p className="text-muted">
        You can view or download the archived versions from the Finalized Reports tab.
      </p>
      <button className="btn btn-success mt-3" onClick={onNavigate}>
        <i className="bi bi-folder2-open me-2"></i>View in Finalized Reports
      </button>
    </div>
  );
};

export default FinalizedReportPlaceholder;
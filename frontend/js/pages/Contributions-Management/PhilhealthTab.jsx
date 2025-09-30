import React from 'react';
import EditableContributionTable from './EditableContributionTable';

const PhilhealthTab = (props) => {
  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="mb-0 contribution-report-title">{props.reportTitle}</h4>
        <button className="btn btn-success" onClick={props.onExport} disabled={props.rows.length === 0}>
          <i className="bi bi-download me-2"></i>Export to Excel
        </button>
      </div>
      <p className="text-muted">This report generates the PhilHealth contribution summary. Click cells to edit, headers to rename, or use the controls to add/remove rows and columns.</p>
      <EditableContributionTable {...props} />
    </div>
  );
};

export default PhilhealthTab;
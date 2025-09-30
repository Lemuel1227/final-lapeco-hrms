import React from 'react';
import { format, parseISO } from 'date-fns';
import ActionsDropdown from '../../common/ActionsDropdown';

const FinalizedPeriodRow = ({ period, onDownload, onView, onDelete }) => {
  const handleActionClick = (e, action) => {
    e.stopPropagation();
    action();
  };

  const handleDownloadClick = (e, reportType) => {
    e.preventDefault();
    e.stopPropagation();
    
    const normalizedReportType = reportType.toLowerCase().replace(/[-_]/g, '');
    const reportToDownload = period.reports.find(r => r.type.toLowerCase().replace(/[-_]/g, '') === normalizedReportType);
    
    if (reportToDownload) {
      onDownload(reportToDownload);
    } else {
      alert(`Could not find the ${reportType} report for this period.`);
    }
  };

  return (
    <tr>
      <td>
        <a href="#" onClick={(e) => { e.preventDefault(); onView(); }} className="fw-bold text-decoration-none">
          {period.payPeriod}
        </a>
      </td>
      <td>{format(parseISO(period.finalizationDate), 'MMM dd, yyyy @ h:mm a')}</td>
      <td>{period.generatedBy}</td>
      <td>
        <div className="d-flex flex-wrap gap-1">
          {period.reports.map(r => (
            <span key={r.id} className="badge bg-secondary-subtle text-secondary-emphasis">
              {r.type}
            </span>
          ))}
        </div>
      </td>
      <td>
        {/* Replace the old dropdown with the new robust component */}
        <ActionsDropdown>
          <a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); onView(); }}><i className="bi bi-eye-fill me-2"></i>View Consolidated</a>
          <div className="dropdown-divider"></div>
          <h6 className="dropdown-header">Download Individual (Excel)</h6>
          <a className="dropdown-item" href="#" onClick={(e) => handleDownloadClick(e, 'sss')}><i className="bi bi-file-earmark-spreadsheet-fill me-2"></i>SSS Report</a>
          <a className="dropdown-item" href="#" onClick={(e) => handleDownloadClick(e, 'philhealth')}><i className="bi bi-file-earmark-spreadsheet-fill me-2"></i>PhilHealth Report</a>
          <a className="dropdown-item" href="#" onClick={(e) => handleDownloadClick(e, 'pag-ibig')}><i className="bi bi-file-earmark-spreadsheet-fill me-2"></i>Pag-IBIG Report</a>
          <div className="dropdown-divider"></div>
          <a className="dropdown-item text-danger" href="#" onClick={(e) => handleActionClick(e, onDelete)}><i className="bi bi-trash-fill me-2"></i>Delete Period</a>
        </ActionsDropdown>
      </td>
    </tr>
  );
};

export default FinalizedPeriodRow;
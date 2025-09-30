import React from 'react';
import { format, parseISO } from 'date-fns';

const FinalizedPeriodCard = ({ period, onDownload, onView, onDelete }) => {
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
    <div className="history-card final-period-card" onClick={onView}>
      <div className="history-card-header">
        <div className="report-type">
          <i className="bi bi-calendar-check-fill me-2"></i>
          {period.payPeriod}
        </div>
      </div>
      <div className="history-card-body">
        <div className="history-detail">
          <span className="label">Finalized On</span>
          <span className="value">{format(parseISO(period.finalizationDate), 'MMM dd, yyyy @ h:mm a')}</span>
        </div>
        <div className="history-detail">
          <span className="label">Finalized By</span>
          <span className="value">{period.generatedBy}</span>
        </div>
        <div className="history-detail">
          <span className="label">Reports Included</span>
          <div className="included-reports">
            {period.reports.map(r => (
                <span key={r.id} className="badge bg-secondary-subtle text-secondary-emphasis">
                    {r.type}
                </span>
            ))}
          </div>
        </div>
      </div>
      <div className="history-card-footer">
        <div className="dropdown">
          <button 
            className="btn btn-sm btn-outline-secondary dropdown-toggle w-100" 
            type="button" 
            data-bs-toggle="dropdown" 
            aria-expanded="false"
            onClick={(e) => e.stopPropagation()}
          >
            <i className="bi bi-gear-fill me-2"></i>Actions
          </button>
          <ul className="dropdown-menu dropdown-menu-end">
            <li><h6 className="dropdown-header">Download Excel</h6></li>
            <li><a className="dropdown-item" href="#" onClick={(e) => handleDownloadClick(e, 'sss')}><i className="bi bi-file-earmark-spreadsheet-fill me-2"></i>SSS Report</a></li>
            <li><a className="dropdown-item" href="#" onClick={(e) => handleDownloadClick(e, 'philhealth')}><i className="bi bi-file-earmark-spreadsheet-fill me-2"></i>PhilHealth Report</a></li>
            <li><a className="dropdown-item" href="#" onClick={(e) => handleDownloadClick(e, 'pag-ibig')}><i className="bi bi-file-earmark-spreadsheet-fill me-2"></i>Pag-IBIG Report</a></li>
            <li><hr className="dropdown-divider" /></li>
            <li><a className="dropdown-item text-danger" href="#" onClick={(e) => handleActionClick(e, onDelete)}><i className="bi bi-trash-fill me-2"></i>Delete Period</a></li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default FinalizedPeriodCard;
import React from 'react';

const ContributionTypeToggle = ({ activeReport, onSelectReport }) => {
  const reportTypes = [
    { key: 'sss', label: 'SSS', icon: 'bi-building-fill-check' },
    { key: 'philhealth', label: 'PhilHealth', icon: 'bi-heart-pulse-fill' },
    { key: 'pagibig', label: 'Pag-IBIG', icon: 'bi-house-heart-fill' },
  ];

  return (
    <div className="contribution-toggle-container">
      {reportTypes.map(report => (
        <button
          key={report.key}
          className={`contribution-toggle-btn ${activeReport === report.key ? 'active' : ''}`}
          onClick={() => onSelectReport(report.key)}
        >
          <i className={`bi ${report.icon} me-2`}></i>
          {report.label}
        </button>
      ))}
    </div>
  );
};

export default ContributionTypeToggle;
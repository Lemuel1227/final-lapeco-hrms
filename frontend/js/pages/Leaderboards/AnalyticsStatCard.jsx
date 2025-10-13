import React from 'react';

const AnalyticsStatCard = ({ title, value, icon, iconClass, unit = '' }) => {
  return (
    <div className="dashboard-stat-card">
      <div className={`stat-icon ${iconClass}`}>
        <i className={`bi ${icon}`}></i>
      </div>
      <div className="stat-info">
        <div className="stat-value">
          {value}
          {unit && <span className="stat-unit">{unit}</span>}
        </div>
        <div className="stat-label">{title}</div>
      </div>
    </div>
  );
};

export default AnalyticsStatCard;
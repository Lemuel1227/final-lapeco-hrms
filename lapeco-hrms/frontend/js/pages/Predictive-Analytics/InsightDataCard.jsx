import React from 'react';

const InsightDataCard = ({ title, value, icon, iconClass, valueSuffix = '' }) => {
  return (
    <div className="insight-data-card">
      <div className={`stat-icon ${iconClass}`}>
        <i className={`bi ${icon}`}></i>
      </div>
      <div className="stat-info">
        <span className="stat-value">
          {value}
          {valueSuffix && <small>{valueSuffix}</small>}
        </span>
        <span className="stat-label">{title}</span>
      </div>
    </div>
  );
};

export default InsightDataCard;
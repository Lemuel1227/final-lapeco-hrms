import React from 'react';

const RiskScoreIndicator = ({ score }) => {
  const getRiskDetails = (value) => {
    if (value >= 60) return { label: 'High', className: 'risk-high' };
    if (value >= 30) return { label: 'Medium', className: 'risk-medium' };
    return { label: 'Low', className: 'risk-low' };
  };

  const { label, className } = getRiskDetails(score);

  return (
    <div className="risk-indicator-container" title={`Risk Score: ${score.toFixed(1)}`}>
      <div className="risk-indicator-bar-bg">
        <div className={`risk-indicator-bar-fg ${className}`} style={{ width: `${score}%` }}></div>
      </div>
      <span className={`risk-indicator-label ${className}`}>{label}</span>
    </div>
  );
};

export default RiskScoreIndicator;
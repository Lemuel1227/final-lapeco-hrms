import React from 'react';

export const RiskFactorRow = ({ label, score, weight, valueText, scoreOutOf100, isNegative = false }) => {
  const barClass = isNegative ? 'bar-negative' : 'bar-positive';
  
  const segments = [
    { threshold: 30, class: 'segment-low' },
    { threshold: 60, class: 'segment-medium' },
    { threshold: 100, class: 'segment-high' }
  ];

  return (
    <div className="factor-row">
      <div className="factor-info">
        <div className="factor-label">{label} <span className="factor-weight">({weight}%)</span></div>
        <div className="factor-description">{valueText}</div>
      </div>
      <div className="factor-score-viz">
        <div className="factor-score-gauge-container">
          {segments.map(seg => <div key={seg.class} className={`gauge-segment ${seg.class}`}></div>)}
          <div className={`gauge-indicator ${barClass}`} style={{ left: `calc(${Math.min(score, 100)}% - 4px)` }}></div>
        </div>
        <div className="factor-score-value">{scoreOutOf100}</div>
      </div>
    </div>
  );
};
import React from 'react';
import './StatDonutChart.css';

const StatDonutChart = ({ 
  percentage, 
  label, 
  size = 100, 
  strokeWidth = 10, 
  color, 
  onClick, 
  isActive = false,
  isClickable = false 
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  const containerClasses = [
    'stat-donut-chart-container',
    isClickable ? 'clickable' : '',
    isActive ? 'active' : ''
  ].filter(Boolean).join(' ');

  const handleClick = () => {
    if (isClickable && onClick) {
      onClick();
    }
  };

  return (
    <div className={containerClasses} onClick={handleClick}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="stat-donut-chart">
        <circle
          className="stat-donut-chart-bg"
          cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth}
        />
        <circle
          className="stat-donut-chart-progress"
          cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth}
          stroke={color} strokeDasharray={circumference} strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <text className="stat-donut-chart-text" x="50%" y="50%" dy=".3em" textAnchor="middle">
          {`${percentage.toFixed(0)}%`}
        </text>
      </svg>
      <div className="stat-donut-chart-label">{label}</div>
    </div>
  );
};

export default StatDonutChart;
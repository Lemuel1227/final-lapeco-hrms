import React from 'react';

const ScoreDonutChart = ({ score = 0, size = 80, strokeWidth = 8 }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const getScoreColor = (value) => {
    if (value < 70) return 'var(--danger-color)';
    if (value < 90) return 'var(--warning-color)';
    return 'var(--app-success-color)';
  };

  const color = getScoreColor(score);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="score-donut-chart">
      <circle
        className="score-donut-chart-bg"
        cx={size / 2}
        cy={size / 2}
        r={radius}
        strokeWidth={strokeWidth}
      />
      <circle
        className="score-donut-chart-progress"
        cx={size / 2}
        cy={size / 2}
        r={radius}
        strokeWidth={strokeWidth}
        stroke={color}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        className="score-donut-chart-text"
        x="50%"
        y="50%"
        dy=".3em"
        textAnchor="middle"
        fill={color}
      >
        {`${score.toFixed(1)}%`}
      </text>
    </svg>
  );
};

export default ScoreDonutChart;
import React from 'react';

const ScoreIndicator = ({ score }) => {
  const getScoreColor = (value) => {
    if (value < 70) return 'score-bar-danger';
    if (value < 90) return 'score-bar-warning';
    return 'score-bar-success';
  };

  const colorClass = getScoreColor(score);

  return (
    <div className="score-indicator">
      <div className="score-bar-container">
        <div className={`score-bar ${colorClass}`} style={{ width: `${score}%` }}></div>
      </div>
      <span className="score-text">{score.toFixed(2)}%</span>
    </div>
  );
};

export default ScoreIndicator;
import React from 'react';

const ScoreIndicator = ({ score }) => {
  // Handle null or undefined scores
  if (score === null || score === undefined) {
    return (
      <div className="score-indicator">
        <span className="text-muted fst-italic">Not yet rated</span>
      </div>
    );
  }

  // Convert 1-5 scale to percentage (0-100)
  // If score is <= 5, assume it's on 1-5 scale and convert to percentage
  const percentageScore = score <= 5 ? (score / 5) * 100 : score;

  const getScoreColor = (value) => {
    if (value < 70) return 'score-bar-danger';
    if (value < 90) return 'score-bar-warning';
    return 'score-bar-success';
  };

  const colorClass = getScoreColor(percentageScore);

  return (
    <div className="score-indicator">
      <div className="score-bar-container">
        <div className={`score-bar ${colorClass}`} style={{ width: `${percentageScore}%` }}></div>
      </div>
      <span className="score-text">{percentageScore.toFixed(2)}%</span>
    </div>
  );
};

export default ScoreIndicator;
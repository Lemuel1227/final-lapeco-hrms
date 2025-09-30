import React from 'react';
import StarRating from './StarRating';

const KpiScoringRow = ({ kpi, scoreData, onScoreChange }) => {
  const handleScoreChange = (field, value) => {
    onScoreChange(kpi.id, field, value);
  };
  
  return (
    <div className="kpi-scoring-row">
      <div className="kpi-info">
        <p className="kpi-title">{kpi.title} <span className="kpi-weight-display">({kpi.weight}%)</span></p>
        <p className="kpi-description">{kpi.description}</p>
      </div>
      <div className="kpi-scoring">
        <StarRating 
          score={scoreData?.score || 0} 
          onRate={(newScore) => handleScoreChange('score', newScore)} 
        />
      </div>
      <div className="kpi-comments">
        <input
            type="text"
            className="form-control form-control-sm"
            placeholder="Comments (optional)..."
            value={scoreData?.comments || ''}
            onChange={(e) => handleScoreChange('comments', e.target.value)}
        />
      </div>
    </div>
  );
};

export default KpiScoringRow;
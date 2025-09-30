import React from 'react';
import StarRating from './StarRating';

const RatingScaleRow = ({ competency, scoreData, onScoreChange }) => {
  return (
    <div className="rating-scale-row">
      <div className="competency-info">
        <p className="competency-name">{competency.name}</p>
        <p className="competency-description">{competency.description}</p>
      </div>
      <div className="rating-stars">
        <StarRating 
          score={scoreData?.score || 0}
          onRate={(newScore) => onScoreChange(competency.id, 'score', newScore)}
        />
      </div>
      <div className="rating-comment">
        <input 
          type="text" 
          className="form-control form-control-sm"
          placeholder="Add specific comments (optional)..."
          value={scoreData?.comments || ''}
          onChange={(e) => onScoreChange(competency.id, 'comments', e.target.value)}
        />
      </div>
    </div>
  );
};

export default RatingScaleRow;
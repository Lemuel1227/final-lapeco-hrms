import React from 'react';
import StarRating from './StarRating';

const RatingScaleRow = ({ factor, scoreData, onScoreChange }) => {
  return (
    <div className="rating-scale-row">
      <div className="competency-info">
        <p className="competency-name">{factor.title}</p>
        {factor.description && <p className="competency-description">{factor.description}</p>}
      </div>
      <div className="rating-stars">
        <StarRating 
          score={scoreData?.score || 0}
          onRate={(newScore) => onScoreChange(factor.id, 'score', newScore)}
        />
      </div>
      <div className="rating-comment">
        <input 
          type="text" 
          className="form-control form-control-sm"
          placeholder="Add specific comments (optional)..."
          value={scoreData?.comments || ''}
          onChange={(e) => onScoreChange(factor.id, 'comments', e.target.value)}
        />
      </div>
    </div>
  );
};

export default RatingScaleRow;
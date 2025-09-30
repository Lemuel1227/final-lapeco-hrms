import React from 'react';

const StarRating = ({ score, onRate }) => {
  return (
    <div className="star-rating">
      {[1, 2, 3, 4, 5].map(star => (
        <i
          key={star}
          className={`bi ${score >= star ? 'bi-star-fill' : 'bi-star'}`}
          onClick={() => onRate(star)}
          title={`${star} out of 5`}
        />
      ))}
    </div>
  );
};

export default StarRating;
import React from 'react';

const RatingScaleGuide = () => {
  return (
    <div className="rating-scale-guide card mb-4">
      <div className="card-body">
        <h6 className="card-title mb-3">Rating Scale Guide</h6>
        <div className="guide-grid">
          <div><strong>1</strong> - Needs Improvement</div>
          <div><strong>2</strong> - Below Expectations</div>
          <div><strong>3</strong> - Meets Expectations</div>
          <div><strong>4</strong> - Exceeds Expectations</div>
          <div><strong>5</strong> - Outstanding</div>
        </div>
      </div>
    </div>
  );
};

export default RatingScaleGuide;
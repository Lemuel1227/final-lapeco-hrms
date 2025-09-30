import React from 'react';
import placeholderAvatar from '../../assets/placeholder-profile.jpg';

const PerformanceInsightsCard = ({ title, icon, data, className }) => {
  const visibleAvatars = data.slice(0, 5);
  const hiddenCount = data.length - visibleAvatars.length;

  return (
    <div className={`card ${className}`}>
      <div className="card-body">
        <h6 className="card-title d-flex justify-content-between">
          <span><i className={`bi ${icon} me-2`}></i>{title}</span>
          <span className="badge bg-light text-dark">{data.length}</span>
        </h6>
        <div className="insight-avatar-list">
          {visibleAvatars.map(emp => (
            <img 
              key={emp.id} 
              src={emp.imageUrl || placeholderAvatar} 
              alt={emp.name} 
              className="insight-avatar" 
              title={`${emp.name} (${emp.score.toFixed(1)}%)`}
            />
          ))}
          {hiddenCount > 0 && (
            <div className="avatar-more-count" title={`${hiddenCount} more`}>
              +{hiddenCount}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PerformanceInsightsCard;
import React from 'react';
import placeholderAvatar from '../../../assets/placeholder-profile.jpg';

const PerformanceInsightsCard = ({ title, icon, data, className, onAvatarClick, renderDetail }) => {
  const visibleAvatars = data.slice(0, 7);
  const hiddenCount = data.length - visibleAvatars.length;

  return (
    <div className={`card insight-card ${className}`}>
      <div className="card-body">
        <h6 className="card-title d-flex justify-content-between">
          <span><i className={`bi ${icon} me-2`}></i>{title}</span>
          <span className="badge bg-light text-dark">{data.length} Total</span>
        </h6>
        {data.length > 0 ? (
          <div className="insight-avatar-list">
            {visibleAvatars.map(emp => (
              <div key={emp.evaluationId || emp.id} className="insight-avatar-container" onClick={() => onAvatarClick(emp)}>
                <img 
                  src={emp.imageUrl || placeholderAvatar} 
                  alt={emp.name} 
                  className="insight-avatar" 
                  title={emp.name}
                />
                {renderDetail && renderDetail(emp)}
              </div>
            ))}
            {hiddenCount > 0 && (
              <div className="avatar-more-count" title={`${hiddenCount} more`}>
                +{hiddenCount}
              </div>
            )}
          </div>
        ) : (
          <p className="text-muted mt-3">No employees currently fall into this category.</p>
        )}
      </div>
    </div>
  );
};

export default PerformanceInsightsCard;
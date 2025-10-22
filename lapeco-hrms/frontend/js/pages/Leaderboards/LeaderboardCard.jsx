import React from 'react';

const LeaderboardCard = ({ title, icon, data, valueKey, valueFormatter, valueBar = true, isNegativeMetric = false, rankOneLabel = "Top Rank", actions = null }) => {
  const getProgressBarVariant = (value) => {
    if (value >= 85) return 'bg-success';
    if (value >= 70) return 'bg-warning';
    return 'bg-danger';
  };

  const getRankBadgeClass = (index, rankOverride) => {
    const rank = rankOverride ?? index + 1;
    if (isNegativeMetric) {
      if (rank === 1) return 'rank-negative-1';
      if (rank === 2) return 'rank-negative-2';
      if (rank === 3) return 'rank-negative-3';
      return '';
    }
    if (rank === 1) return 'rank-1';
    if (rank === 2) return 'rank-2';
    if (rank === 3) return 'rank-3';
    return '';
  };

  const isSearching = data.length > 0 && data[0].rank_override != null;

  return (
    <div className="dashboard-card leaderboard-card">
      <div className="card-header">
        <div className="leaderboard-header-left">
          <h6><i className={`bi ${icon} me-2 ${isNegativeMetric ? 'text-danger' : ''}`}></i>{title}</h6>
          {actions}
        </div>
        <span className="badge results-badge bg-body-secondary text-body-secondary">
          {isSearching ? `${data.length} Match Found` : `${data.length} Results`}
        </span>
      </div>
      <div className="card-body">
        {data.length > 0 ? (
          <ul className="leaderboard-list">
            {data.map((item, index) => {
              const rank = item.rank_override ?? index + 1;
              const isRankOne = rank === 1;

              return (
              <li key={item.id} className={`leaderboard-item ${isRankOne ? 'rank-one' : ''}`}>
                <div className="leaderboard-rank">
                  <span className={`rank-badge ${getRankBadgeClass(index, rank)}`}>{rank}</span>
                </div>
                <img
                  src={item.imageUrl}
                  alt={`${item.name || 'Employee'} avatar`}
                  className="leaderboard-avatar"
                />
                
                <div className="leaderboard-info-main">
                  <div className="leaderboard-name-section">
                    <span className="leaderboard-name">{item.name}</span>
                    {isRankOne && <span className={`rank-one-label ${isNegativeMetric ? 'negative' : 'positive'}`}>{rankOneLabel}</span>}
                  </div>
                  {valueBar ? (
                    <div className="progress" style={{ height: '8px' }}>
                      <div
                        className={`progress-bar ${getProgressBarVariant(item[valueKey])}`}
                        role="progressbar"
                        style={{ width: `${item[valueKey]}%` }}
                        aria-valuenow={item[valueKey]}
                        aria-valuemin="0"
                        aria-valuemax="100"
                      ></div>
                    </div>
                  ) : (
                    <span className="leaderboard-position text-muted">{item.positionTitle}</span>
                  )}
                </div>

                <div className="leaderboard-value">
                  {valueFormatter(item[valueKey])}
                </div>
              </li>
            )})}
          </ul>
        ) : (
          <div className="leaderboard-empty-state">
            <i className="bi bi-info-circle"></i>
            <span>{isSearching ? 'No match found for your search.' : 'No data available for the selected filters.'}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeaderboardCard;
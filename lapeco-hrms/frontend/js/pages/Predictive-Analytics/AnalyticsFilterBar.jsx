import React from 'react';

const AnalyticsFilterBar = ({
  // State values
  searchTerm,
  positionFilter,
  riskFilter,
  trendFilter,
  startDate,
  endDate,
  activePreset,
  uniquePositions,
  // Handlers
  onSearchTermChange,
  onPositionFilterChange,
  onRiskFilterChange,
  onTrendFilterChange,
  onDateChange,
  onDatePreset,
  onClearFilters,
}) => {
  return (
    <div className="analytics-filter-bar">
      <div className="row g-3">
        {/* --- Top Row Filters --- */}
        <div className="col-lg-3 col-md-6">
          <div className="filter-group">
            <label htmlFor="search-name">Search by Name</label>
            <div className="input-group">
              <span className="input-group-text"><i className="bi bi-search"></i></span>
              <input
                type="text"
                id="search-name"
                className="form-control"
                placeholder="Employee name..."
                value={searchTerm}
                onChange={(e) => onSearchTermChange(e.target.value)}
              />
            </div>
          </div>
        </div>
        <div className="col-lg-3 col-md-6">
          <div className="filter-group">
            <label htmlFor="filter-position">Position</label>
            <select
              id="filter-position"
              className="form-select"
              value={positionFilter}
              onChange={(e) => onPositionFilterChange(e.target.value)}
            >
              {uniquePositions.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>
        <div className="col-lg-3 col-md-6">
          <div className="filter-group">
            <label htmlFor="filter-classification">Classification</label>
            <select
              id="filter-classification"
              className="form-select"
              value={riskFilter}
              onChange={(e) => onRiskFilterChange(e.target.value)}
            >
              <option value="All">All Classifications</option>
              <option value="High Potential">High Potential</option>
              <option value="Meets Expectations">Meets Expectations</option>
              <option value="Turnover Risk">Turnover Risk</option>
            </select>
          </div>
        </div>
        <div className="col-lg-3 col-md-6">
          <div className="filter-group">
            <label htmlFor="filter-trend">Performance Trend</label>
            <select
              id="filter-trend"
              className="form-select"
              value={trendFilter}
              onChange={(e) => onTrendFilterChange(e.target.value)}
            >
              <option value="All">All Trends</option>
              <option value="Improving">Improving</option>
              <option value="Stable">Stable</option>
              <option value="Declining">Declining</option>
            </select>
          </div>
        </div>

        {/* --- Bottom Row Filters --- */}
        <div className="col-lg-6">
          <div className="filter-group">
            <label>Evaluation Period</label>
            <div className="input-group date-range-group">
              <input
                type="date"
                className="form-control"
                value={startDate || ''}
                onChange={(e) => onDateChange(e.target.value, 'start')}
              />
              <span className="input-group-text">to</span>
              <input
                type="date"
                className="form-control"
                value={endDate || ''}
                onChange={(e) => onDateChange(e.target.value, 'end')}
              />
            </div>
          </div>
        </div>
        <div className="col-lg-6 d-flex align-items-end">
           <div className="filter-group w-100">
             <label>Quick Presets</label>
             <div className="d-flex w-100 gap-2">
                <div className="btn-group w-100">
                    <button className={`btn ${activePreset === '90d' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => onDatePreset('90d')}>90 Days</button>
                    <button className={`btn ${activePreset === 'lastYear' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => onDatePreset('lastYear')}>Last Year</button>
                    <button className={`btn ${activePreset === 'all' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => onDatePreset('all')}>All Time</button>
                </div>
                <button className="btn btn-outline-secondary flex-shrink-0" onClick={onClearFilters}>
                  <i className="bi bi-x-lg"></i> Clear All
                </button>
             </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsFilterBar;
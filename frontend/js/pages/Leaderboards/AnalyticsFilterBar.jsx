import React from 'react';

const AnalyticsFilterBar = ({ filters, handlers, positions }) => {
  const { startDate, endDate, positionFilter, activePreset, displayLimit } = filters;
  const { onDateChange, onPositionChange, onPresetChange, onClearFilters, onDisplayLimitChange } = handlers;

  const uniquePositions = ['All Positions', ...new Set(positions.map(p => p.title).sort())];

  return (
    <div className="card performance-controls-card shadow-sm">
      <div className="performance-controls-bar">
        <div className="filter-group">
          <label>Date Range</label>
          <div className="input-group">
            <input type="date" className="form-control" value={startDate || ''} onChange={(e) => onDateChange(e.target.value, 'start')} />
            <span className="input-group-text">to</span>
            <input type="date" className="form-control" value={endDate || ''} onChange={(e) => onDateChange(e.target.value, 'end')} />
          </div>
        </div>
        <div className="filter-group">
          <label>Quick Presets</label>
          <div className="btn-group w-100">
            <button className={`btn btn-sm ${activePreset === '30d' ? 'btn-dark' : 'btn-outline-secondary'}`} onClick={() => onPresetChange('30d')}>30 Days</button>
            <button className={`btn btn-sm ${activePreset === '90d' ? 'btn-dark' : 'btn-outline-secondary'}`} onClick={() => onPresetChange('90d')}>90 Days</button>
            <button className={`btn btn-sm ${activePreset === 'thisYear' ? 'btn-dark' : 'btn-outline-secondary'}`} onClick={() => onPresetChange('thisYear')}>This Year</button>
          </div>
        </div>
        <div className="filter-group">
          <label>Position</label>
          <select className="form-select" value={positionFilter} onChange={onPositionChange}>
            {uniquePositions.map(pos => <option key={pos} value={pos === 'All Positions' ? '' : pos}>{pos}</option>)}
          </select>
        </div>
        <div className="filter-group show-filter-group">
          <label>Show</label>
          <select 
            className="form-select" 
            value={displayLimit === Infinity ? 'all' : displayLimit}
            onChange={(e) => onDisplayLimitChange(e.target.value)}
          >
            <option value="5">Top 5</option>
            <option value="10">Top 10</option>
            <option value="15">Top 15</option>
            <option value="20">Top 20</option>
            <option value="all">All</option>
          </select>
        </div>
        <button className="btn btn-light" onClick={onClearFilters}>Clear</button>
      </div>
    </div>
  );
};

export default AnalyticsFilterBar;
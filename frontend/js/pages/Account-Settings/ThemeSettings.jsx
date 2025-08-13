import React from 'react';

const ThemeSettings = ({ currentTheme, onToggleTheme }) => {
  return (
    <div className="card settings-card">
      <div className="card-header">
        <h5 className="mb-0">Appearance</h5>
      </div>
      <div className="card-body">
        <p className="card-text text-muted">Customize the look and feel of your workspace.</p>
        <div className="theme-selector-grid">
          <div className="theme-selector-card" onClick={() => currentTheme !== 'light' && onToggleTheme()}>
            <div className={`theme-preview light-preview ${currentTheme === 'light' ? 'active' : ''}`}>
              <span>Light</span>
            </div>
            <div className="form-check">
              <input className="form-check-input" type="radio" name="theme" id="lightTheme" checked={currentTheme === 'light'} onChange={onToggleTheme} />
              <label className="form-check-label" htmlFor="lightTheme">Light Mode</label>
            </div>
          </div>
          <div className="theme-selector-card" onClick={() => currentTheme !== 'dark' && onToggleTheme()}>
            <div className={`theme-preview dark-preview ${currentTheme === 'dark' ? 'active' : ''}`}>
              <span>Dark</span>
            </div>
            <div className="form-check">
              <input className="form-check-input" type="radio" name="theme" id="darkTheme" checked={currentTheme === 'dark'} onChange={onToggleTheme} />
              <label className="form-check-label" htmlFor="darkTheme">Dark Mode</label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThemeSettings;
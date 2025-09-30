import React from 'react';
import { updateThemePreference } from '../../services/accountService';

const ThemeSettings = ({ theme, onToggleTheme }) => {
  const handleThemeChange = async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    try {
      await updateThemePreference(newTheme);
      onToggleTheme();
    } catch (error) {
      console.error('Failed to update theme preference:', error);
      alert('Failed to save theme preference. Please try again.');
    }
  };

  return (
    <div className="card settings-card">
      <div className="card-header">
        <h5 className="mb-0">Appearance</h5>
      </div>
      <div className="card-body">
        <p className="card-text text-muted">Customize the look and feel of your workspace.</p>
        <div className="theme-selector-grid">
          <div className="theme-selector-card" onClick={() => theme !== 'light' && handleThemeChange()}>
            <div className={`theme-preview light-preview ${theme === 'light' ? 'active' : ''}`}>
              <span>Light</span>
            </div>
            <div className="form-check">
              <input className="form-check-input" type="radio" name="theme" id="lightTheme" checked={theme === 'light'} onChange={handleThemeChange} />
              <label className="form-check-label" htmlFor="lightTheme">Light Mode</label>
            </div>
          </div>
          <div className="theme-selector-card" onClick={() => theme !== 'dark' && handleThemeChange()}>
            <div className={`theme-preview dark-preview ${theme === 'dark' ? 'active' : ''}`}>
              <span>Dark</span>
            </div>
            <div className="form-check">
              <input className="form-check-input" type="radio" name="theme" id="darkTheme" checked={theme === 'dark'} onChange={handleThemeChange} />
              <label className="form-check-label" htmlFor="darkTheme">Dark Mode</label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThemeSettings;
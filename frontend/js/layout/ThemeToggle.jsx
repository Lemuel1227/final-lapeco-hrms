import React from 'react';
import './ThemeToggle.css';

const ThemeToggle = ({ theme, onToggle }) => {
  const isDark = theme === 'dark';

  return (
    <div className="theme-toggle-container">
      <button
        className={`theme-toggle-btn ${isDark ? 'dark' : 'light'}`}
        onClick={onToggle}
        title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      >
        <span className="toggle-slider">
          <i className={`bi ${isDark ? 'bi-moon-stars-fill' : 'bi-sun-fill'}`}></i>
        </span>
      </button>
    </div>
  );
};

export default ThemeToggle;
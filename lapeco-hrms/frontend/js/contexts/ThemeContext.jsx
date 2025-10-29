import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState('light');

  // Initialize theme from localStorage first (immediate)
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const initializeTheme = () => {
      // 1. First check localStorage for theme preference (fastest)
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme === 'light' || savedTheme === 'dark') {
        setTheme(savedTheme);
      }

      // 2. Then check user data (might be async)
      try {
        const userData = localStorage.getItem('user');
        if (userData) {
          const user = JSON.parse(userData);
          if (user.theme_preference === 'light' || user.theme_preference === 'dark') {
            // Only update if different from current theme
            if (savedTheme !== user.theme_preference) {
              setTheme(user.theme_preference);
              localStorage.setItem('theme', user.theme_preference);
            }
          }
        }
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
      
      setInitialized(true);
    };
    
    if (!initialized) {
      initializeTheme();
    }
  }, [initialized]);

  // Save theme to localStorage when it changes
  useEffect(() => {
    if (initialized) {
      localStorage.setItem('theme', theme);
    }
  }, [theme, initialized]);

  // Apply theme to body
  useEffect(() => {
    const body = document.body;
    if (theme === 'dark') {
      body.classList.add('dark-theme');
      body.classList.remove('light-theme');
    } else {
      body.classList.add('light-theme');
      body.classList.remove('dark-theme');
    }
    return () => {
      body.classList.remove('light-theme', 'dark-theme');
    };
  }, [theme]);

  const toggleTheme = async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    
    try {
      // Update backend
       await authAPI.updateThemePreference(newTheme);
      
      // Update local user data
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        user.theme_preference = newTheme;
        localStorage.setItem('user', JSON.stringify(user));
      }
    } catch (error) {
      console.error('Error updating theme preference:', error);
      // Fallback to localStorage
      localStorage.setItem('theme', newTheme);
    }
  };

  const value = {
    theme,
    toggleTheme
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
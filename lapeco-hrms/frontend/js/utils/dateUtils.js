/**
 * Date utility functions for formatting and manipulating dates
 */

/**
 * Format a date to a readable string
 * @param {string|Date} date - The date to format
 * @param {string} format - The format type ('short', 'long', 'medium')
 * @returns {string} Formatted date string
 */
export const formatDate = (date, format = 'medium') => {
  if (!date) return 'N/A';
  
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return 'Invalid Date';
  
  const options = {
    short: { month: 'short', day: 'numeric', year: 'numeric' },
    medium: { month: 'short', day: 'numeric', year: 'numeric' },
    long: { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
  };
  
  return dateObj.toLocaleDateString('en-US', options[format] || options.medium);
};

/**
 * Format a date range from start to end date
 * @param {string|Date} startDate - The start date
 * @param {string|Date} endDate - The end date
 * @returns {string} Formatted date range string
 */
export const formatDateRange = (startDate, endDate) => {
  if (!startDate || !endDate) return 'N/A';
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 'Invalid Date Range';
  
  // If same date, return single date
  if (start.toDateString() === end.toDateString()) {
    return formatDate(start, 'short');
  }
  
  // If same month and year, show abbreviated format
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    const monthYear = start.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    return `${monthYear} ${start.getDate()}-${end.getDate()}`;
  }
  
  // Different months or years
  return `${formatDate(start, 'short')} - ${formatDate(end, 'short')}`;
};

/**
 * Get abbreviated month name
 * @param {string|Date} date - The date
 * @returns {string} Abbreviated month name (e.g., 'Jan', 'Feb')
 */
export const getMonthAbbr = (date) => {
  if (!date) return '';
  
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return '';
  
  return dateObj.toLocaleDateString('en-US', { month: 'short' });
};

/**
 * Get day of the month
 * @param {string|Date} date - The date
 * @returns {string} Day of the month (e.g., '1', '15', '31')
 */
export const getDay = (date) => {
  if (!date) return '';
  
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return '';
  
  return dateObj.getDate().toString();
};

/**
 * Get day of the week
 * @param {string|Date} date - The date
 * @returns {string} Day of the week (e.g., 'Monday', 'Tuesday')
 */
export const getDayOfWeek = (date) => {
  if (!date) return '';
  
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return '';
  
  return dateObj.toLocaleDateString('en-US', { weekday: 'long' });
};

/**
 * Check if a date is today
 * @param {string|Date} date - The date to check
 * @returns {boolean} True if the date is today
 */
export const isToday = (date) => {
  if (!date) return false;
  
  const dateObj = new Date(date);
  const today = new Date();
  
  return dateObj.toDateString() === today.toDateString();
};

/**
 * Check if a date is in the past
 * @param {string|Date} date - The date to check
 * @returns {boolean} True if the date is in the past
 */
export const isPast = (date) => {
  if (!date) return false;
  
  const dateObj = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time to start of day
  
  return dateObj < today;
};

/**
 * Calculate days between two dates
 * @param {string|Date} startDate - The start date
 * @param {string|Date} endDate - The end date
 * @returns {number} Number of days between dates
 */
export const daysBetween = (startDate, endDate) => {
  if (!startDate || !endDate) return 0;
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
  
  const timeDiff = end.getTime() - start.getTime();
  return Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1; // +1 to include both start and end dates
};

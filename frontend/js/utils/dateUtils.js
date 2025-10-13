/**
 * Date utility functions for consistent formatting across the application
 */

/**
 * Format a date string to a readable format (MMM DD, YYYY)
 * @param {string} dateString - ISO date string or date string
 * @returns {string} Formatted date string
 */
export const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (error) {
    return 'Invalid Date';
  }
};

/**
 * Format a date range for display
 * @param {string} startDate - Start date string
 * @param {string} endDate - End date string
 * @returns {string} Formatted date range
 */
export const formatDateRange = (startDate, endDate) => {
  if (!startDate || !endDate) return 'N/A';
  
  const formattedStart = formatDate(startDate);
  const formattedEnd = formatDate(endDate);
  
  if (formattedStart === 'Invalid Date' || formattedEnd === 'Invalid Date') {
    return 'Invalid Date';
  }
  
  return `${formattedStart} to ${formattedEnd}`;
};

/**
 * Format date for input fields (YYYY-MM-DD)
 * @param {string} dateString - Date string
 * @returns {string} Formatted date for input
 */
export const formatDateForInput = (dateString) => {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    
    return date.toISOString().split('T')[0];
  } catch (error) {
    return '';
  }
};

/**
 * Get month abbreviation from date
 * @param {string} dateString - Date string
 * @returns {string} Month abbreviation
 */
export const getMonthAbbr = (dateString) => {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    
    return date.toLocaleDateString('en-US', { month: 'short' });
  } catch (error) {
    return '';
  }
};

/**
 * Get day from date
 * @param {string} dateString - Date string
 * @returns {number} Day of month
 */
export const getDay = (dateString) => {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    
    return date.getDate();
  } catch (error) {
    return '';
  }
};
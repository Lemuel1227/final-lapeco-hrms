import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// API methods for applicants
export const applicantApi = {
  // Submit new application
  submitApplication: (applicationData) => 
    api.post('/applicants', applicationData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),
  
  // Get available positions
  getPositions: () => api.get('/positions'),
  
  // Get application status (if you implement this endpoint)
  getApplicationStatus: (applicationId) => 
    api.get(`/applicants/${applicationId}/status`),
};

export default api;

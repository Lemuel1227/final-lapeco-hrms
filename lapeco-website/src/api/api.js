import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json'
  }
});

export const applicantApi = {
  getPositions: (config = {}) => api.get('/positions', config),
  submitApplication: (applicationData, config = {}) =>
    api.post('/applicants', applicationData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      ...config
    })
};

export default api;

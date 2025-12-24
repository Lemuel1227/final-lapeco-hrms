import axios from 'axios';

const API_BASE_URL = (import.meta.env.VITE_API_URL?.replace(/\/$/, '') || '') + '/api';

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

export const chatbotApi = {
  getPublicQAs: (type, config = {}) => {
    const params = type ? { params: { type } } : {};
    return api.get('/chatbot-qas/public', { ...config, ...params });
  },
  getRecruitmentQAs: (config = {}) => chatbotApi.getPublicQAs('recruitment', config),
  getFAQs: (config = {}) => chatbotApi.getPublicQAs('faq', config)
};

export default api;

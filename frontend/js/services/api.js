import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API calls
export const authAPI = {
  login: (credentials) => api.post('/login', credentials),
  register: (userData) => api.post('/register', userData),
  logout: () => api.post('/logout'),
  getUser: () => api.get('/user'),
  updateThemePreference: (theme) => api.put('/user/theme-preference', { theme_preference: theme }),
};

// Dashboard API calls
export const dashboardAPI = {
  getDashboard: () => api.get('/dashboard'),
};

// Employee API calls
export const employeeAPI = {
  getAll: () => api.get('/employees'),
  getById: (id) => api.get(`/employees/${id}`),
  create: (data) => api.post('/employees', data),
  update: (id, data) => api.put(`/employees/${id}`, data),
  delete: (id) => api.delete(`/employees/${id}`),
};

// Position API calls
export const positionAPI = {
  getAll: () => api.get('/positions'),
  getById: (id) => api.get(`/positions/${id}`),
  create: (data) => api.post('/positions', data),
  update: (id, data) => api.put(`/positions/${id}`, data),
  delete: (id) => api.delete(`/positions/${id}`),
  getEmployees: (id) => api.get(`/positions/${id}/employees`),
};

// Schedule API calls
export const scheduleAPI = {
  getAll: () => api.get('/schedules'),
  getAllBasic: () => api.get('/schedules/basic'),
  getById: (id) => api.get(`/schedules/${id}`),
  create: (data) => api.post('/schedules', data),
  update: (id, data) => api.put(`/schedules/${id}`, data),
  delete: (id) => api.delete(`/schedules/${id}`),
  getCreateData: (params) => api.get('/schedules/create', { params }),
};

// Leave API calls
export const leaveAPI = {
  getAll: () => api.get('/leaves'),
  create: (data) => api.post('/leaves', data),
  update: (id, data) => api.put(`/leaves/${id}`, data),
  delete: (id) => api.delete(`/leaves/${id}`),
};

// Payroll API calls
export const payrollAPI = {
  getAll: () => api.get('/payroll'),
  generate: (data) => api.post('/payroll/generate', data),
  update: (id, data) => api.put(`/payroll/${id}`, data),
};

// Holiday API calls
export const holidayAPI = {
  getAll: (params) => api.get('/holidays', { params }),
  create: (data) => api.post('/holidays', data),
  update: (id, data) => api.put(`/holidays/${id}`, data),
  delete: (id) => api.delete(`/holidays/${id}`),
};

// Recruitment API calls
export const recruitmentAPI = {
  getAll: () => api.get('/recruitment'),
  createApplicant: (data) => api.post('/recruitment/applicants', data),
  updateApplicant: (id, data) => api.put(`/recruitment/applicants/${id}`, data),
  deleteApplicant: (id) => api.delete(`/recruitment/applicants/${id}`),
};

// Performance API calls
export const performanceAPI = {
  getAll: () => api.get('/performance'),
  createEvaluation: (data) => api.post('/performance/evaluations', data),
  updateEvaluation: (id, data) => api.put(`/performance/evaluations/${id}`, data),
};

// Training API calls
export const trainingAPI = {
  getAll: () => api.get('/training'),
  getPrograms: () => api.get('/training/programs'),
  createProgram: (data) => api.post('/training/programs', data),
  updateProgram: (id, data) => api.put(`/training/programs/${id}`, data),
  deleteProgram: (id) => api.delete(`/training/programs/${id}`),
};

// Disciplinary Cases API calls
export const disciplinaryCaseAPI = {
  getAll: () => api.get('/disciplinary-cases'),
  getById: (id) => api.get(`/disciplinary-cases/${id}`),
  create: (data) => api.post('/disciplinary-cases', data),
  update: (id, data) => api.put(`/disciplinary-cases/${id}`, data),
  delete: (id) => api.delete(`/disciplinary-cases/${id}`),
  getByEmployee: (employeeId) => api.get(`/disciplinary-cases/employee/${employeeId}`),
  getByStatus: (status) => api.get(`/disciplinary-cases/status/${status}`),
  getStatistics: () => api.get('/disciplinary-cases-statistics'),
};

// Reports API calls
export const reportsAPI = {
  getAll: () => api.get('/reports'),
};

export default api;

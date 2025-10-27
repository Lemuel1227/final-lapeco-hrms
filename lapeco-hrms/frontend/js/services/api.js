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

// Request interceptor to add auth token and CSRF token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // If the data is FormData, remove the Content-Type header to let the browser set it
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors and sanitize error messages
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle authentication errors
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    
    // Sanitize error messages to prevent exposing technical details
    if (error.response?.data?.message) {
      // Check if the error message contains SQL or database-specific information
      const sensitivePatterns = [
        /SQLSTATE\[.*?\]/i,
        /SQL:/i,
        /Connection:/i,
        /mysql/i,
        /database/i,
        /table/i,
        /column/i
      ];
      
      const containsSensitiveInfo = sensitivePatterns.some(pattern => 
        pattern.test(error.response.data.message)
      );
      
      if (containsSensitiveInfo) {
        // Replace with a generic error message
        if (error.response.status >= 500) {
          error.response.data.message = 'Server error. Please try again later.';
        } else {
          error.response.data.message = 'An error occurred. Please try again.';
        }
      }
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
  updateThemePreference: (theme) => api.put('/user/theme-preference', { theme: theme }),
  changePassword: (passwordData) => api.put('/password', passwordData),
  sendPasswordResetLink: (payload) => api.post('/forgot-password', payload),
  resetPassword: (payload) => api.post('/reset-password', payload),
};

// Dashboard API calls
export const dashboardAPI = {
  getDashboard: () => api.get('/dashboard'),
  getTeamLeaderSummary: () => api.get('/dashboard/team-leader/summary'),
  getEmployeeSummary: () => api.get('/dashboard/employee/summary'),
};

// Leaderboard API calls
export const leaderboardAPI = {
  getAll: (params = {}) => api.get('/leaderboards', { params }),
};

// Employee API calls
export const employeeAPI = {
  getAll: () => api.get('/employees'),
  getList: () => api.get('/employees/list'), // Optimized endpoint for list view
  getAllIncludingTerminated: () => api.get('/employees/all'),
  getById: (id) => api.get(`/employees/${id}`),
  create: (data) => api.post('/employees', data),
  update: (id, data) => api.put(`/employees/${id}`, data),
  delete: (id) => api.delete(`/employees/${id}`),
  resetPassword: (id, data) => api.post(`/employees/${id}/reset-password`, data),
  deactivateAccount: (id) => api.post(`/employees/${id}/deactivate`),
  activateAccount: (id) => api.post(`/employees/${id}/activate`),
  rehireEmployee: (id) => api.post(`/employees/${id}/rehire`),
  toggleTeamLeader: (id) => api.post(`/employees/${id}/toggle-team-leader`),
};

// Position API calls
export const positionAPI = {
  getAll: () => api.get('/positions/authenticated'),
  getAllPublic: () => api.get('/positions'),
  getById: (id) => api.get(`/positions/${id}`),
  create: (data) => api.post('/positions', data),
  update: (id, data) => api.put(`/positions/${id}`, data),
  delete: (id) => api.delete(`/positions/${id}`),
  getEmployees: (id) => api.get(`/positions/${id}/employees`),
  removeEmployee: (positionId, employeeId) => api.post(`/positions/${positionId}/employees/${employeeId}/remove`),
};

// Schedule API calls
export const scheduleAPI = {
  getAll: () => api.get('/schedules'),
  getAllBasic: () => api.get('/schedules/basic'),
  getByDate: (date) => api.get('/schedules/by-date', { params: { date } }),
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
  getAllLeaveCredits: () => api.get('/leave-credits/all'),
  getLeaveCredits: (userId) => api.get(`/leave-credits/${userId}`),
  updateLeaveCredits: (userId, data) => api.put(`/leave-credits/${userId}`, data),
  bulkAddCredits: (data) => api.post('/leave-credits/bulk-add', data),
  resetUsedCredits: (data) => api.post('/leave-credits/reset', data),
};

// Payroll API calls
export const payrollAPI = {
  getAll: () => api.get('/payroll'),
  getPeriodDetails: (periodId) => api.get(`/payroll/periods/${periodId}/details`),
  getPayrollRecord: (payrollId) => api.get(`/payroll/records/${payrollId}`),
  compute: (params) => api.get('/payroll/compute', { params }),
  myProjection: (params) => api.get('/payroll/my-projection', { params }),
  generate: (data) => api.post('/payroll/generate', data),
  update: (id, data) => api.put(`/payroll/${id}`, data),
  markPeriodAsPaid: (periodId) => api.post(`/payroll/periods/${periodId}/mark-as-paid`),
  deletePeriod: (periodId) => api.delete(`/payroll/periods/${periodId}`),
};

// Contributions API calls
export const contributionAPI = {
  getMonthlyContributions: (params) => api.get('/contributions/monthly', { params }),
  getFinalizedContributions: (params) => api.get('/contributions/finalized', { params }),
  finalizeContribution: (data) => api.post('/contributions/finalize', data),
  deleteFinalizedContribution: (id) => api.delete(`/contributions/finalized/${id}`),
};

// Holiday API calls
export const holidayAPI = {
  getAll: (params) => api.get('/holidays', { params }),
  create: (data) => api.post('/holidays', data),
  update: (id, data) => api.put(`/holidays/${id}`, data),
  delete: (id) => api.delete(`/holidays/${id}`),
};

// Template API calls
export const templateAPI = {
  getAll: () => api.get('/schedule-templates'),
  getById: (id) => api.get(`/schedule-templates/${id}`),
  create: (data) => api.post('/schedule-templates', data),
  update: (id, data) => api.put(`/schedule-templates/${id}`, data),
  delete: (id) => api.delete(`/schedule-templates/${id}`),
};

// Applicant API calls
export const applicantAPI = {
  getAll: (summary = false) => api.get('/applicants', { params: { summary: summary ? 'true' : 'false' } }),
  getById: (id) => api.get(`/applicants/${id}`),
  create: (data) => {
    // Convert to FormData if files are present
    const formData = new FormData();
    Object.keys(data).forEach(key => {
      if (data[key] !== null && data[key] !== undefined && data[key] !== '') {
        formData.append(key, data[key]);
      }
    });
    return api.post('/applicants', formData);
  },
  update: (id, data) => api.put(`/applicants/${id}`, data),
  delete: (id) => api.delete(`/applicants/${id}`),
  updateStatus: (id, data) => api.put(`/applicants/${id}/status`, data),
  scheduleInterview: (id, data) => {
    return api.post(`/applicants/${id}/interview`, data);
  },
  hire: (id, data) => api.post(`/applicants/${id}/hire`, data),
  getStats: () => api.get('/applicants/statistics'),
  viewResume: async (id) => {
    const response = await api.get(`/applicants/${id}/resume/view`, { responseType: 'blob' });
    return response.data;
  },
  downloadResume: async (id, filename) => {
    const response = await api.get(`/applicants/${id}/resume/download`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(response.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },
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
  getOverview: () => api.get('/performance/overview'),
  getEmployeeHistory: (employeeId) => api.get(`/performance/employees/${employeeId}/history`),
  getPeriodicEvaluations: (periodId) => api.get(`/performance/periods/${periodId}`),
  getEvaluationResponses: (evaluationId) => api.get(`/performance/evaluations/${evaluationId}/responses`),
  getEvaluationResponseDetail: (responseId) => api.get(`/performance/evaluation-responses/${responseId}`),
  getEvaluationPeriods: () => api.get('/performance'),
  getEvaluationTrackerData: () => api.get('/performance/tracker'),
  createPeriod: (data) => api.post('/performance/periods', data),
  updatePeriod: (id, data) => api.put(`/performance/periods/${id}`, data),
  submitResponse: (evaluationId, data) => api.post(`/performance/evaluations/${evaluationId}/responses`, data),
  updateResponse: (responseId, data) => api.put(`/performance/evaluation-responses/${responseId}`, data),
  getTeamMembersToEvaluate: () => api.get('/performance/team-members-to-evaluate'),
  getLeaderToEvaluate: () => api.get('/performance/leader-to-evaluate'),
  sendReminders: () => api.post('/performance/reminders'),
};

// Training API calls
export const trainingAPI = {
  getAll: () => api.get('/training'),
  getPrograms: () => api.get('/training/programs'),
  getProgram: (id) => api.get(`/training/programs/${id}`),
  createProgram: (data) => api.post('/training/programs', data),
  updateProgram: (id, data) => api.put(`/training/programs/${id}`, data),
  deleteProgram: (id) => api.delete(`/training/programs/${id}`),
  forceDeleteProgram: (id) => api.delete(`/training/programs/${id}/force`),
  
  // Enrollment methods
  getEnrollments: () => api.get('/training/enrollments'),
  enroll: (data) => api.post('/training/enroll', data),
  updateEnrollment: (id, data) => api.put(`/training/enrollments/${id}`, data),
  unenroll: (id) => api.delete(`/training/enrollments/${id}`),
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
  getGroupedByEmployee: () => api.get('/disciplinary-cases-grouped-by-employee'),
  deleteActionLog: (id) => api.delete(`/action-logs/${id}`),
  // Attachment operations
  uploadAttachment: (caseId, file) => {
    const formData = new FormData();
    formData.append('attachment', file);
    return api.post(`/disciplinary-cases/${caseId}/attachments`, formData);
  },
  downloadAttachment: (caseId, filename) => api.get(`/disciplinary-cases/${caseId}/attachments/${filename}`),
  deleteAttachment: (caseId, filename) => api.delete(`/disciplinary-cases/${caseId}/attachments/${filename}`),
};

// Resignation API calls
export const resignationAPI = {
  getAll: () => api.get('/resignations'),
  getById: (id) => api.get(`/resignations/${id}`),
  create: (data) => api.post('/resignations', data),
  update: (id, data) => api.put(`/resignations/${id}`, data),
  delete: (id) => api.delete(`/resignations/${id}`),
  updateStatus: (id, data) => api.put(`/resignations/${id}/status`, data),
  updateEffectiveDate: (id, data) => api.put(`/resignations/${id}/effective-date`, data),
};

// Termination API calls
export const terminationAPI = {
  getAll: () => api.get('/terminations'),
  getById: (id) => api.get(`/terminations/${id}`),
  create: (data) => api.post('/terminations', data),
  update: (id, data) => api.put(`/terminations/${id}`, data),
  delete: (id) => api.delete(`/terminations/${id}`),
  getByEmployee: (employeeId) => api.get(`/terminations/employee/${employeeId}`),
};

// Reports API calls
export const reportsAPI = {
  getAll: () => api.get('/reports'),
  getEmployeeReport: () => api.get('/reports/employees'),
  getAttendanceReport: () => api.get('/reports/attendance'),
};

export const notificationAPI = {
  getAll: () => api.get('/notifications'),
  getUnread: () => api.get('/notifications/unread'),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markAsRead: (id) => api.put(`/notifications/${id}/mark-as-read`),
  markAllAsRead: () => api.put('/notifications/mark-all-as-read'),
  delete: (id) => api.delete(`/notifications/${id}`),
  create: (data) => api.post('/notifications', data),
};

export default api;

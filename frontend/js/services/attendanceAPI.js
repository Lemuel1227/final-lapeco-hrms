import api from './api';

const attendanceAPI = {
  // Get all attendance records
  getAll: (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    return api.get(`/attendance${queryParams ? `?${queryParams}` : ''}`);
  },

  // Get attendance logs in the format expected by frontend
  getLogs: (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    return api.get(`/attendance-logs${queryParams ? `?${queryParams}` : ''}`);
  },

  // Create new attendance record
  create: (data) => {
    return api.post('/attendance', data);
  },

  // Update attendance record
  update: (id, data) => {
    return api.put(`/attendance/${id}`, data);
  },

  // Delete attendance record
  delete: (id) => {
    return api.delete(`/attendance/${id}`);
  },

  // Clock in/out actions
  clockAction: (data) => {
    return api.post('/attendance/clock', data);
  },

  // Get single attendance record
  getById: (id) => {
    return api.get(`/attendance/${id}`);
  }
};

export default attendanceAPI;
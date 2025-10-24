import api from './api';

const attendanceAPI = {
    // Get all attendance records
    getAll: (params = {}) => {
        return api.get('/attendance', { params });
    },

    // Get attendance logs
    getLogs: (params = {}) => {
        return api.get('/attendance-logs', { params });
    },

    // Get attendance history with statistics
    getHistory: (params = {}) => {
        return api.get('/attendance-history', { params });
    },

    // Get daily attendance data
    getDaily: (params = {}) => {
        return api.get('/attendance-daily', { params });
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

    // Get attendance record by ID
    getById: (id) => {
        return api.get(`/attendance/${id}`);
    },

    // Clock in/out action
    clockAction: (data) => {
        return api.post('/attendance/clock', data);
    },

    // Get all employees (name and ID only) for attendance management
    getEmployeeNameID: (params = {}) => {
        return api.get('/attendance/employees', { params });
    },

    // Get all attendance records for a specific employee (including scheduled/absent)
    getEmployeeAttendance: (employeeId, params = {}) => {
        return api.get(`/attendance/employee/${employeeId}`, { params });
    },

    // Import attendance records from Excel/CSV
    import: (data) => {
        return api.post('/attendance/import', data);
    }
};

export default attendanceAPI;
// Account Settings API Service
const API_BASE_URL = '/api';

// Get authentication token from localStorage or wherever it's stored
const getAuthToken = () => {
    return localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
};

// Common headers for API requests
const getHeaders = () => {
    const token = getAuthToken();
    return {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
    };
};

// Handle API response
const handleResponse = async (response) => {
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Network error' }));
        const error = new Error(errorData.message || `HTTP error! status: ${response.status}`);
        error.response = { data: errorData, status: response.status };
        throw error;
    }
    return response.json();
};

// Change user password
export const changePassword = async (currentPassword, newPassword, confirmPassword) => {
    try {
        const response = await fetch(`${API_BASE_URL}/password`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify({
                current_password: currentPassword,
                password: newPassword,
                password_confirmation: confirmPassword
            })
        });
        
        return await handleResponse(response);
    } catch (error) {
        throw error;
    }
};

// Update theme preference
export const updateThemePreference = async (theme) => {
    try {
        const response = await fetch(`${API_BASE_URL}/user/theme-preference`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify({
                theme: theme
            })
        });
        
        return await handleResponse(response);
    } catch (error) {
        throw error;
    }
};

// Get user profile
export const getUserProfile = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/user`, {
            method: 'GET',
            headers: getHeaders()
        });
        
        return await handleResponse(response);
    } catch (error) {
        throw error;
    }
};

// Update user profile
export const updateUserProfile = async (profileData) => {
    try {
        const response = await fetch(`${API_BASE_URL}/profile`, {
            method: 'PATCH',
            headers: getHeaders(),
            body: JSON.stringify(profileData)
        });
        
        return await handleResponse(response);
    } catch (error) {
        throw error;
    }
};

// Get user login sessions
export const getLoginSessions = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/sessions`, {
            method: 'GET',
            headers: getHeaders()
        });
        
        return await handleResponse(response);
    } catch (error) {
        throw error;
    }
};

// Check email verification status
export const checkEmailVerificationStatus = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/user`, {
            method: 'GET',
            headers: getHeaders()
        });
        
        return await handleResponse(response);
    } catch (error) {
        throw error;
    }
};

// Resend email verification
export const resendEmailVerification = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/email/verification-notification`, {
            method: 'POST',
            headers: getHeaders()
        });
        
        return await handleResponse(response);
    } catch (error) {
        throw error;
    }
};

// Revoke login session
export const revokeSession = async (sessionId) => {
    try {
        const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        
        return await handleResponse(response);
    } catch (error) {
        throw error;
    }
};

// Get user's activity logs
export const getActivityLogs = async (params = {}) => {
    try {
        const queryParams = new URLSearchParams();
        if (params.action_type) queryParams.append('action_type', params.action_type);
        if (params.entity_type) queryParams.append('entity_type', params.entity_type);
        if (params.from_date) queryParams.append('from_date', params.from_date);
        if (params.to_date) queryParams.append('to_date', params.to_date);
        if (params.page) queryParams.append('page', params.page);
        if (params.per_page) queryParams.append('per_page', params.per_page);
        
        const queryString = queryParams.toString();
        const url = `${API_BASE_URL}/activity-logs${queryString ? '?' + queryString : ''}`;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: getHeaders()
        });
        
        return await handleResponse(response);
    } catch (error) {
        throw error;
    }
};

// Get all users' activity logs (HR/Admin only)
export const getAllActivityLogs = async (params = {}) => {
    try {
        const queryParams = new URLSearchParams();
        if (params.user_id) queryParams.append('user_id', params.user_id);
        if (params.action_type) queryParams.append('action_type', params.action_type);
        if (params.entity_type) queryParams.append('entity_type', params.entity_type);
        if (params.from_date) queryParams.append('from_date', params.from_date);
        if (params.to_date) queryParams.append('to_date', params.to_date);
        if (params.page) queryParams.append('page', params.page);
        if (params.per_page) queryParams.append('per_page', params.per_page);
        
        const queryString = queryParams.toString();
        const url = `${API_BASE_URL}/activity-logs/all${queryString ? '?' + queryString : ''}`;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: getHeaders()
        });
        
        return await handleResponse(response);
    } catch (error) {
        throw error;
    }
};

// Get available action types
export const getActionTypes = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/activity-logs/action-types`, {
            method: 'GET',
            headers: getHeaders()
        });
        
        return await handleResponse(response);
    } catch (error) {
        throw error;
    }
};

// Get available entity types
export const getEntityTypes = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/activity-logs/entity-types`, {
            method: 'GET',
            headers: getHeaders()
        });
        
        return await handleResponse(response);
    } catch (error) {
        throw error;
    }
};
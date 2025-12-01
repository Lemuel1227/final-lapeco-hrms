// Account Settings API Service
const API_BASE_URL = (import.meta.env?.VITE_API_BASE_URL || window?.APP_API_BASE_URL || 'http://localhost:8000/api').replace(/\/$/, '');

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
    const rawBody = await response.text();
    let data = null;

    if (rawBody) {
        try {
            data = JSON.parse(rawBody);
        } catch (parseError) {
            data = rawBody;
        }
    }

    if (!response.ok) {
        const errorPayload = typeof data === 'string' ? { message: data } : (data ?? {});
        const error = new Error(errorPayload.message || `HTTP error! status: ${response.status}`);
        error.response = { data: errorPayload, status: response.status };
        throw error;
    }

    return data;
};

// Change user password
export const changePassword = async (currentPassword, newPassword, confirmPassword) => {
    try {
        const response = await fetch(`${API_BASE_URL}/password`, {
            method: 'PUT',
            headers: getHeaders(),
            credentials: 'include',
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
            credentials: 'include',
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
            headers: getHeaders(),
            credentials: 'include'
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
            credentials: 'include',
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
            headers: getHeaders(),
            credentials: 'include'
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
            headers: getHeaders(),
            credentials: 'include'
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
            headers: getHeaders(),
            credentials: 'include'
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
            headers: getHeaders(),
            credentials: 'include'
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
            headers: getHeaders(),
            credentials: 'include'
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
            headers: getHeaders(),
            credentials: 'include'
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
            headers: getHeaders(),
            credentials: 'include'
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
            headers: getHeaders(),
            credentials: 'include'
        });
        
        return await handleResponse(response);
    } catch (error) {
        throw error;
    }
};
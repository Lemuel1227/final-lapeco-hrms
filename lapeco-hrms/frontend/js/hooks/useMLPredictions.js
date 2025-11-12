/**
 * useMLPredictions Hook
 * 
 * Custom React hook for fetching and managing ML predictions
 * for employee performance and resignation risk.
 * 
 * Features:
 * - Fetches predictions from the ML API
 * - Handles loading and error states
 * - Caches predictions to avoid redundant API calls
 * - Provides refresh functionality
 * - Maps predictions to employee data
 */

import { useState, useEffect, useCallback } from 'react';
import { mlAPI } from '../services/api';

/**
 * Custom hook for ML predictions
 * 
 * @param {boolean} autoFetch - Whether to automatically fetch predictions on mount
 * @returns {Object} Object containing predictions data and control functions
 */
export const useMLPredictions = (autoFetch = true) => {
    // State management
    const [predictions, setPredictions] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);

    /**
     * Fetch ML predictions from the API
     * 
     * @param {boolean} forceRefresh - Force refresh predictions ignoring cache
     */
    const fetchPredictions = useCallback(async (forceRefresh = false) => {
        setLoading(true);
        setError(null);

        try {
            const response = await mlAPI.getPredictions(forceRefresh);

            if (response.data.success) {
                setPredictions(response.data.data || []);
                setLastUpdated(response.data.timestamp);
            } else {
                throw new Error(response.data.error || 'Failed to fetch predictions');
            }
        } catch (err) {
            console.error('Error fetching ML predictions:', err);
            setError(err.response?.data?.error || err.message || 'Failed to fetch ML predictions');
            setPredictions([]);
        } finally {
            setLoading(false);
        }
    }, []);

    /**
     * Fetch ML model statistics
     */
    const fetchStats = useCallback(async () => {
        try {
            const response = await mlAPI.getStats();

            if (response.data.success) {
                setStats(response.data.data);
            }
        } catch (err) {
            console.error('Error fetching ML stats:', err);
        }
    }, []);

    /**
     * Get prediction for a specific employee
     * 
     * @param {number} employeeId - Employee ID
     * @returns {Object|null} Employee prediction or null if not found
     */
    const getPredictionByEmployeeId = useCallback((employeeId) => {
        return predictions.find(p => p.employee_id === employeeId) || null;
    }, [predictions]);

    /**
     * Clear ML predictions cache and refresh
     */
    const clearCacheAndRefresh = useCallback(async () => {
        setLoading(true);
        try {
            await mlAPI.clearCache();
            await fetchPredictions(true);
        } catch (err) {
            console.error('Error clearing cache:', err);
            setError('Failed to clear cache');
        } finally {
            setLoading(false);
        }
    }, [fetchPredictions]);

    /**
     * Retrain the ML model
     */
    const retrainModel = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await mlAPI.retrainModel();
            
            if (response.data.success) {
                // Fetch fresh predictions after retraining
                await fetchPredictions(true);
                return { success: true, message: 'Model retrained successfully' };
            } else {
                throw new Error(response.data.error || 'Failed to retrain model');
            }
        } catch (err) {
            console.error('Error retraining model:', err);
            const errorMsg = err.response?.data?.error || err.message || 'Failed to retrain model';
            setError(errorMsg);
            return { success: false, error: errorMsg };
        } finally {
            setLoading(false);
        }
    }, [fetchPredictions]);

    /**
     * Map ML predictions to employee data
     * Enriches employee objects with ML-based insights
     * 
     * @param {Array} employees - Array of employee objects
     * @returns {Array} Employees with ML predictions merged
     */
    const enrichEmployeesWithPredictions = useCallback((employees) => {
        if (!predictions || predictions.length === 0) {
            return employees;
        }

        return employees.map(employee => {
            const prediction = getPredictionByEmployeeId(employee.id);
            
            if (!prediction) {
                return employee;
            }

            // Map ML predictions to employee object
            return {
                ...employee,
                mlPrediction: {
                    potential: prediction.potential,
                    resignationProbability: prediction.resignation_probability,
                    resignationStatus: prediction.resignation_status,
                    performanceScore: prediction.performance_score,
                    attendanceRate: prediction.attendance_rate,
                    lateCount: prediction.late_count,
                    absentCount: prediction.absent_count,
                    tenureMonths: prediction.tenure_months,
                    overallScore: prediction.overall_score,
                    avgEvaluation: prediction.avg_evaluation
                },
                // Override classification flags with ML predictions if available
                isHighPotential: prediction.potential === 'High Potential',
                isTurnoverRisk: prediction.resignation_status === 'At Risk of Resigning',
                // Add ML-based risk score (resignation probability as percentage)
                mlRiskScore: prediction.resignation_probability * 100
            };
        });
    }, [predictions, getPredictionByEmployeeId]);

    // Auto-fetch predictions on mount if enabled
    useEffect(() => {
        if (autoFetch) {
            fetchPredictions();
            fetchStats();
        }
    }, [autoFetch]); // Only run once on mount

    return {
        // Data
        predictions,
        stats,
        lastUpdated,
        
        // State
        loading,
        error,
        
        // Functions
        fetchPredictions,
        fetchStats,
        getPredictionByEmployeeId,
        clearCacheAndRefresh,
        retrainModel,
        enrichEmployeesWithPredictions
    };
};

export default useMLPredictions;

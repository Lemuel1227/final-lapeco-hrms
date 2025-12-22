<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;
use App\Services\MLDataService;

/**
 * MLPredictionController (Refactored)
 * 
 * Handles Machine Learning predictions by communicating with a standalone
 * Python ML API service. This controller prepares employee data and sends
 * HTTP requests to the Python API instead of executing scripts directly.
 * 
 * Features:
 * - Fetches employee data from Laravel database
 * - Sends data to Python ML API via HTTP requests
 * - Handles API responses and error scenarios
 * - Caches predictions to reduce API calls
 * - Returns formatted predictions for frontend consumption
 */
class MLPredictionController extends Controller
{
    /**
     * ML API service URL
     */
    private $mlApiUrl;

    /**
     * Cache duration for predictions (in seconds)
     * Default: 1 hour (3600 seconds)
     */
    private $cacheDuration = 3600;

    /**
     * ML Data Service for preparing employee data
     */
    private $mlDataService;

    public function __construct(MLDataService $mlDataService)
    {
        $this->mlApiUrl = config('services.ml_api.url', 'http://localhost:8010');
        $this->mlDataService = $mlDataService;
    }

    /**
     * Get ML predictions for all active employees
     * 
     * This method prepares employee data and sends it to the Python ML API
     * to generate predictions for employee potential and resignation risk.
     * 
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function getPredictions(Request $request)
    {
        try {
            // Check if predictions are cached
            $cacheKey = 'ml_predictions_' . date('Y-m-d-H');
            
            // Check if force refresh is requested
            $forceRefresh = $request->query('refresh', false);
            
            if (!$forceRefresh && cache()->has($cacheKey)) {
                // Return cached predictions
                $cachedData = cache()->get($cacheKey);
                return response()->json([
                    'success' => true,
                    'data' => $cachedData['data'],
                    'timestamp' => $cachedData['timestamp'],
                    'cached' => true
                ]);
            }

            // Call ML API to get predictions
            $predictions = $this->callMLAPI();

            // Cache the predictions
            cache()->put($cacheKey, [
                'data' => $predictions,
                'timestamp' => now()->toISOString()
            ], $this->cacheDuration);

            return response()->json([
                'success' => true,
                'data' => $predictions,
                'timestamp' => now()->toISOString(),
                'cached' => false
            ]);

        } catch (\Exception $e) {
            Log::error('ML Prediction Error: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'error' => 'Failed to generate predictions: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Call the Python ML API to get predictions
     * 
     * Prepares employee data and sends HTTP request to the ML API service.
     * 
     * @return array Predictions from ML API
     * @throws \Exception If API call fails
     */
    private function callMLAPI()
    {
        try {
            // Prepare employee data for the API
            $employeeData = $this->mlDataService->prepareEmployeeData();
            
            Log::info('Sending ML API request for ' . count($employeeData) . ' employees');
            
            // Send request to Python ML API
            $response = Http::timeout(300) // 5 minute timeout for ML processing
                ->retry(3, 1000) // Retry 3 times with 1 second delay
                ->post($this->mlApiUrl . '/predict', [
                    'employees' => $employeeData
                ]);
            
            if (!$response->successful()) {
                $errorMessage = 'ML API request failed with status: ' . $response->status();
                if ($response->json('error')) {
                    $errorMessage .= ' - ' . $response->json('error');
                }
                throw new \Exception($errorMessage);
            }
            
            $result = $response->json();
            
            if (!isset($result['success']) || !$result['success']) {
                throw new \Exception($result['error'] ?? 'Unknown error from ML API');
            }
            
            Log::info('ML API request successful, received ' . count($result['data'] ?? []) . ' predictions');
            
            return $result['data'] ?? [];
            
        } catch (\Exception $e) {
            Log::error('ML API call failed: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Get prediction for a specific employee
     * 
     * @param Request $request
     * @param int $employeeId
     * @return \Illuminate\Http\JsonResponse
     */
    public function getEmployeePrediction(Request $request, $employeeId)
    {
        try {
            // Get all predictions
            $allPredictions = $this->getPredictions($request);
            $data = $allPredictions->getData(true);

            if (!$data['success']) {
                return response()->json($data, 500);
            }

            // Find prediction for specific employee
            $predictions = $data['data'];
            $employeePrediction = collect($predictions)->firstWhere('employee_id', $employeeId);

            if (!$employeePrediction) {
                return response()->json([
                    'success' => false,
                    'error' => 'No prediction found for employee ID: ' . $employeeId
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => $employeePrediction,
                'timestamp' => $data['timestamp']
            ]);

        } catch (\Exception $e) {
            Log::error('Get Employee Prediction Error: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'error' => 'Failed to get employee prediction: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Clear predictions cache
     * 
     * Useful when new performance evaluations or attendance data is added
     * 
     * @return \Illuminate\Http\JsonResponse
     */
    public function clearCache()
    {
        try {
            // Clear all ML prediction caches
            $pattern = 'ml_predictions_*';
            
            // Get all cache keys matching the pattern
            $keys = cache()->getStore()->getRedis()->keys($pattern);
            
            foreach ($keys as $key) {
                cache()->forget($key);
            }

            return response()->json([
                'success' => true,
                'message' => 'ML predictions cache cleared successfully'
            ]);

        } catch (\Exception $e) {
            // Fallback: just forget today's cache
            cache()->forget('ml_predictions_' . date('Y-m-d-H'));
            
            return response()->json([
                'success' => true,
                'message' => 'Cache cleared (fallback method)'
            ]);
        }
    }

    /**
     * Get ML model statistics
     * 
     * Returns information about the ML model and prediction statistics
     * 
     * @return \Illuminate\Http\JsonResponse
     */
    public function getModelStats()
    {
        try {
            // Get predictions
            $predictions = $this->getPredictions(request());
            $data = $predictions->getData(true);

            if (!$data['success']) {
                return response()->json($data, 500);
            }

            $predictions = collect($data['data']);

            // Calculate statistics
            $stats = [
                'total_employees' => $predictions->count(),
                'high_potential_count' => $predictions->where('potential', 'High Potential')->count(),
                'meets_expectation_count' => $predictions->where('potential', 'Meets Expectation')->count(),
                'below_expectation_count' => $predictions->where('potential', 'Below Expectation')->count(),
                'at_risk_count' => $predictions->where('resignation_status', 'At Risk of Resigning')->count(),
                'not_at_risk_count' => $predictions->where('resignation_status', 'Not at Risk')->count(),
                'avg_performance_score' => round($predictions->avg('performance_score'), 2),
                'avg_resignation_probability' => round($predictions->avg('resignation_probability') * 100, 2),
                'avg_attendance_rate' => round($predictions->avg('attendance_rate'), 2),
                'last_updated' => $data['timestamp']
            ];

            return response()->json([
                'success' => true,
                'data' => $stats
            ]);

        } catch (\Exception $e) {
            Log::error('Get Model Stats Error: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'error' => 'Failed to get model statistics: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Retrain the ML model
     * 
     * Sends training data to the ML API to retrain the model
     * This is useful when significant new data has been added
     * 
     * @return \Illuminate\Http\JsonResponse
     */
    public function retrainModel()
    {
        try {
            // Prepare training data
            $trainingData = $this->mlDataService->prepareEmployeeData();
            
            if (count($trainingData) < 10) {
                return response()->json([
                    'success' => false,
                    'error' => 'Minimum 10 employee records required for training'
                ], 400);
            }
            
            Log::info('Sending model training request with ' . count($trainingData) . ' records');
            
            // Send training request to ML API
            $response = Http::timeout(600) // 10 minute timeout for training
                ->post($this->mlApiUrl . '/train', [
                    'employees' => $trainingData
                ]);
            
            if (!$response->successful()) {
                throw new \Exception('Training request failed with status: ' . $response->status());
            }
            
            $result = $response->json();
            
            // Clear cache after training
            $this->clearCache();
            
            return response()->json([
                'success' => true,
                'message' => $result['message'] ?? 'Model training initiated successfully',
                'training_data_size' => count($trainingData)
            ]);

        } catch (\Exception $e) {
            Log::error('Retrain Model Error: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'error' => 'Failed to initiate model training: ' . $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Get ML API health status
     * 
     * @return \Illuminate\Http\JsonResponse
     */
    public function getAPIHealth()
    {
        try {
            $response = Http::timeout(10)
                ->get($this->mlApiUrl . '/health');
            
            if ($response->successful()) {
                return response()->json([
                    'success' => true,
                    'api_status' => 'healthy',
                    'data' => $response->json()
                ]);
            } else {
                return response()->json([
                    'success' => false,
                    'api_status' => 'unhealthy',
                    'error' => 'API returned status: ' . $response->status()
                ], 503);
            }
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'api_status' => 'unreachable',
                'error' => 'Cannot reach ML API: ' . $e->getMessage()
            ], 503);
        }
    }
}

<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Symfony\Component\Process\Process;
use Symfony\Component\Process\Exception\ProcessFailedException;

/**
 * MLPredictionController
 * 
 * Handles Machine Learning predictions for employee analytics.
 * This controller interfaces with Python ML scripts to generate predictions
 * for employee potential and resignation risk.
 * 
 * Features:
 * - Executes Python ML script with database credentials
 * - Retrieves predictions for all active employees
 * - Caches predictions to reduce computation overhead
 * - Returns formatted predictions for frontend consumption
 */
class MLPredictionController extends Controller
{
    /**
     * Path to the Python executable
     * Adjust this based on your Python installation
     */
    private $pythonPath = 'python';

    /**
     * Path to the ML prediction script
     */
    private $scriptPath;

    /**
     * Cache duration for predictions (in seconds)
     * Default: 1 hour (3600 seconds)
     */
    private $cacheDuration = 3600;

    public function __construct()
    {
        // Set the path to the ML script
        $this->scriptPath = base_path('ml_scripts/employee_ml_predictor.py');
        
        // Adjust Python path based on environment
        // For Windows with Anaconda/Python installed globally
        if (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
            // Try common Python installation paths
            $possiblePaths = [
                'python',  // If Python is in PATH
                'C:\\Python311\\python.exe',
                'C:\\Python310\\python.exe',
                'C:\\Python39\\python.exe',
                'C:\\ProgramData\\Anaconda3\\python.exe',
                'C:\\Users\\' . get_current_user() . '\\Anaconda3\\python.exe',
            ];
            
            foreach ($possiblePaths as $path) {
                if (file_exists($path) || $path === 'python') {
                    $this->pythonPath = $path;
                    break;
                }
            }
        }
    }

    /**
     * Get ML predictions for all active employees
     * 
     * This method executes the Python ML script and returns predictions
     * including employee potential classification and resignation risk.
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

            // Execute Python script to get predictions
            $predictions = $this->executePythonScript();

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
     * Execute the Python ML script
     * 
     * Runs the Python script with database credentials as arguments
     * and parses the JSON output.
     * 
     * @return array Parsed predictions from Python script
     * @throws \Exception If script execution fails
     */
    private function executePythonScript()
    {
        // Verify script exists
        if (!file_exists($this->scriptPath)) {
            throw new \Exception('ML prediction script not found at: ' . $this->scriptPath);
        }

        // Get database configuration
        $dbHost = env('DB_HOST', '127.0.0.1');
        $dbPort = env('DB_PORT', '3306');
        $dbDatabase = env('DB_DATABASE', 'lapeco_hrms');
        $dbUsername = env('DB_USERNAME', 'root');
        $dbPassword = env('DB_PASSWORD', '');

        // Prepare command arguments
        $arguments = [
            $this->pythonPath,
            $this->scriptPath,
            $dbHost,
            $dbPort,
            $dbDatabase,
            $dbUsername
        ];
        
        // Only add password if it's not empty
        if (!empty($dbPassword)) {
            $arguments[] = $dbPassword;
        }

        // Create process
        $process = new Process($arguments);
        
        // Set timeout to 5 minutes (ML training can take time)
        $process->setTimeout(300);
        
        // Set working directory
        $process->setWorkingDirectory(base_path('ml_scripts'));
        
        // Set environment variables to help with Windows asyncio issues
        $env = $_SERVER;  // Start with current environment
        $env['PYTHONIOENCODING'] = 'utf-8';
        $env['PYTHONUNBUFFERED'] = '1';
        $env['PYTHONASYNCIODebug'] = '0';
        // Critical: Force Python to not use overlapped I/O on Windows
        $env['PYTHONASYNCIODEBUG'] = '0';
        $env['SYSTEMROOT'] = env('SYSTEMROOT', 'C:\\Windows');
        
        $process->setEnv($env);

        try {
            // Run the process
            $process->run();

            // Check if process was successful
            if (!$process->isSuccessful()) {
                throw new ProcessFailedException($process);
            }

            // Get output
            $output = $process->getOutput();
            
            // Parse JSON output
            $result = json_decode($output, true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                throw new \Exception('Invalid JSON output from Python script: ' . json_last_error_msg());
            }

            if (!isset($result['success']) || !$result['success']) {
                throw new \Exception($result['error'] ?? 'Unknown error from Python script');
            }

            return $result['data'] ?? [];

        } catch (ProcessFailedException $e) {
            Log::error('Python Process Failed: ' . $e->getMessage());
            Log::error('Output: ' . $process->getOutput());
            Log::error('Error Output: ' . $process->getErrorOutput());
            
            throw new \Exception('Python script execution failed: ' . $process->getErrorOutput());
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
     * Forces a retraining of the ML model with current data
     * This is useful when significant new data has been added
     * 
     * @return \Illuminate\Http\JsonResponse
     */
    public function retrainModel()
    {
        try {
            // Delete existing model file to force retraining
            $modelPath = base_path('ml_scripts/employee_resignation_model.pkl');
            
            if (file_exists($modelPath)) {
                unlink($modelPath);
            }

            // Clear cache
            $this->clearCache();

            // Execute script to retrain
            $this->executePythonScript();

            return response()->json([
                'success' => true,
                'message' => 'ML model retrained successfully'
            ]);

        } catch (\Exception $e) {
            Log::error('Retrain Model Error: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'error' => 'Failed to retrain model: ' . $e->getMessage()
            ], 500);
        }
    }
}

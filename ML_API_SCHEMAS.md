# ML API JSON Schemas

This document defines the JSON request/response formats for communication between the Laravel application and the Python ML API.

## Table of Contents
- [Request Schemas](#request-schemas)
- [Response Schemas](#response-schemas)
- [Error Handling](#error-handling)
- [Examples](#examples)

## Request Schemas

### 1. Employee Data Schema (Input)

Used in prediction and training requests:

```json
{
  "employee_id": 123,                              // Required: Integer
  "employee_name": "John Doe",                     // Required: String
  "position_id": 5,                               // Optional: Integer
  "joining_date": "2020-01-15",                   // Optional: String (YYYY-MM-DD)
  "birthday": "1990-05-20",                       // Optional: String (YYYY-MM-DD)
  "gender": "Male",                               // Optional: String (Male/Female/Other)
  
  // Performance Evaluation Scores (0-5 scale, optional)
  "attendance_score": 4.5,                        // Float
  "dedication_score": 4.2,                        // Float
  "performance_job_knowledge": 3.8,               // Float
  "performance_work_efficiency": 4.0,             // Float
  "cooperation_task_acceptance": 4.1,             // Float
  "cooperation_adaptability": 3.9,                // Float
  "initiative_autonomy": 4.3,                     // Float
  "initiative_under_pressure": 3.7,               // Float
  "communication": 4.0,                           // Float
  "teamwork": 4.2,                               // Float
  "character": 4.5,                              // Float
  "responsiveness": 3.8,                         // Float
  "personality": 4.0,                            // Float
  "appearance": 4.1,                             // Float
  "work_habits": 4.3,                            // Float
  "overall_score": 4.1,                          // Float
  
  // Attendance Statistics (last 30 days, optional)
  "total_days": 22,                              // Integer
  "late_count": 2,                               // Integer
  "absent_count": 1,                             // Integer
  "present_count": 19                            // Integer
}
```

### 2. Prediction Request Schema

```json
{
  "employees": [
    // Array of Employee Data objects (see above)
    {
      "employee_id": 123,
      "employee_name": "John Doe",
      // ... other employee fields
    }
  ]
}
```

### 3. Training Request Schema

Same as prediction request but typically requires more data:

```json
{
  "employees": [
    // Array of Employee Data objects
    // Minimum 10 employees required for training
  ]
}
```

## Response Schemas

### 1. Prediction Result Schema (Single Employee)

```json
{
  "employee_id": 123,                             // Integer
  "employee_name": "John Doe",                    // String
  "performance_score": 4.05,                      // Float (calculated)
  "potential": "High Potential",                  // String: "High Potential" | "Meets Expectation" | "Below Expectation" | "Insufficient Data"
  "resignation_probability": 0.15,                // Float (0.0 - 1.0)
  "resignation_status": "Not at Risk",            // String: "At Risk of Resigning" | "Not at Risk" | "Insufficient Data"
  "attendance_rate": 86.36,                       // Float (percentage)
  "late_count": 2,                               // Integer
  "absent_count": 1,                             // Integer
  "tenure_months": 48,                           // Integer
  "overall_score": 4.1,                          // Float
  "avg_evaluation": 4.05                         // Float
}
```

### 2. Prediction Response Schema

```json
{
  "success": true,                                // Boolean
  "data": [
    // Array of Prediction Result objects (see above)
  ],
  "timestamp": "2024-01-15T10:30:45.123Z",       // ISO 8601 timestamp
  "total_employees": 50,                          // Integer
  "model_version": "1.0.1704447045",             // String
  "error": null                                  // String (only present if success is false)
}
```

### 3. Training Response Schema

```json
{
  "success": true,                                // Boolean
  "message": "Model training started in background", // String
  "timestamp": "2024-01-15T10:30:45.123Z",       // ISO 8601 timestamp
  "training_data_size": 100,                      // Integer
  "error": null                                  // String (only present if success is false)
}
```

### 4. Health Check Response Schema

```json
{
  "status": "healthy",                            // String: "healthy" | "unhealthy"
  "message": "All systems operational",           // String
  "timestamp": "2024-01-15T10:30:45.123Z",       // ISO 8601 timestamp
  "version": "1.0.0",                            // String
  "details": {                                   // Object (optional)
    "model_loaded": true,                        // Boolean
    "model_trained": true,                       // Boolean
    "last_training": "2024-01-14T15:20:30.123Z", // ISO 8601 timestamp
    "total_predictions": 1500                    // Integer
  }
}
```

### 5. Model Statistics Response Schema

```json
{
  "total_employees": 150,                         // Integer
  "high_potential_count": 38,                     // Integer
  "meets_expectation_count": 75,                  // Integer
  "below_expectation_count": 25,                  // Integer
  "at_risk_count": 12,                           // Integer
  "not_at_risk_count": 125,                     // Integer
  "avg_performance_score": 3.85,                 // Float
  "avg_resignation_probability": 0.23,            // Float
  "avg_attendance_rate": 88.5,                   // Float
  "model_version": "1.0.1704447045",             // String
  "last_training": "2024-01-14T15:20:30.123Z",   // ISO 8601 timestamp
  "last_updated": "2024-01-15T10:30:45.123Z"     // ISO 8601 timestamp
}
```

## Error Handling

### Error Response Schema

```json
{
  "success": false,                               // Boolean (always false for errors)
  "error": "Error message description",           // String
  "timestamp": "2024-01-15T10:30:45.123Z",       // ISO 8601 timestamp
  "details": {                                   // Object (optional)
    "code": "VALIDATION_ERROR",                  // String (error code)
    "field": "employee_id",                      // String (problematic field)
    "value": "invalid"                          // Any (problematic value)
  }
}
```

### HTTP Status Codes

- `200` - Success
- `400` - Bad Request (validation error)
- `404` - Not Found
- `422` - Unprocessable Entity (invalid data)
- `500` - Internal Server Error
- `503` - Service Unavailable

### Common Error Messages

- `"No employee data provided"`
- `"Minimum 10 employee records required for training"`
- `"Invalid employee data format"`
- `"Model training in progress, please wait"`
- `"ML API service unavailable"`

## Examples

### 1. Complete Prediction Request

```json
POST /predict
Content-Type: application/json

{
  "employees": [
    {
      "employee_id": 123,
      "employee_name": "John Doe",
      "position_id": 5,
      "joining_date": "2020-01-15",
      "birthday": "1990-05-20",
      "gender": "Male",
      "attendance_score": 4.5,
      "dedication_score": 4.2,
      "performance_job_knowledge": 3.8,
      "performance_work_efficiency": 4.0,
      "cooperation_task_acceptance": 4.1,
      "cooperation_adaptability": 3.9,
      "initiative_autonomy": 4.3,
      "initiative_under_pressure": 3.7,
      "communication": 4.0,
      "teamwork": 4.2,
      "character": 4.5,
      "responsiveness": 3.8,
      "personality": 4.0,
      "appearance": 4.1,
      "work_habits": 4.3,
      "overall_score": 4.1,
      "total_days": 22,
      "late_count": 2,
      "absent_count": 1,
      "present_count": 19
    }
  ]
}
```

### 2. Complete Prediction Response

```json
{
  "success": true,
  "data": [
    {
      "employee_id": 123,
      "employee_name": "John Doe",
      "performance_score": 4.05,
      "potential": "High Potential",
      "resignation_probability": 0.15,
      "resignation_status": "Not at Risk",
      "attendance_rate": 86.36,
      "late_count": 2,
      "absent_count": 1,
      "tenure_months": 48,
      "overall_score": 4.1,
      "avg_evaluation": 4.05
    }
  ],
  "timestamp": "2024-01-15T10:30:45.123Z",
  "total_employees": 1,
  "model_version": "1.0.1704447045"
}
```

### 3. Error Response Example

```json
{
  "success": false,
  "error": "Validation error: employee_id is required",
  "timestamp": "2024-01-15T10:30:45.123Z",
  "details": {
    "code": "VALIDATION_ERROR",
    "field": "employee_id",
    "message": "Field is required but not provided"
  }
}
```

### 4. Laravel HTTP Client Example

```php
use Illuminate\Support\Facades\Http;

// Send prediction request
$response = Http::timeout(300)
    ->retry(3, 1000)
    ->post('http://ml-api-server:8000/predict', [
        'employees' => [
            [
                'employee_id' => 123,
                'employee_name' => 'John Doe',
                'attendance_score' => 4.5,
                // ... other fields
            ]
        ]
    ]);

if ($response->successful()) {
    $result = $response->json();
    $predictions = $result['data'];
} else {
    $error = $response->json('error', 'Unknown error');
    Log::error('ML API Error: ' . $error);
}
```

### 5. JavaScript/Axios Example

```javascript
// Frontend example (if needed)
const response = await axios.post('/api/ml/predictions', {
  refresh: false  // Use cached if available
});

if (response.data.success) {
  const predictions = response.data.data;
  console.log('Predictions received:', predictions.length);
} else {
  console.error('Prediction error:', response.data.error);
}
```

## Field Validation Rules

### Employee Data Validation

- `employee_id`: Required, positive integer
- `employee_name`: Required, string, max 255 characters
- `position_id`: Optional, positive integer
- `joining_date`: Optional, valid date in YYYY-MM-DD format
- `birthday`: Optional, valid date in YYYY-MM-DD format
- `gender`: Optional, one of: "Male", "Female", "Other"
- Performance scores: Optional, float between 0 and 5
- Attendance counts: Optional, non-negative integers

### Request Validation

- Minimum 1 employee for predictions
- Minimum 10 employees for training
- Maximum 1000 employees per request
- All employee objects must have valid structure

## Rate Limiting

- Prediction endpoint: 10 requests per minute per IP
- Training endpoint: 1 request per hour per IP
- Health endpoint: No rate limiting

## Best Practices

1. **Always validate data on Laravel side before sending to API**
2. **Handle network timeouts gracefully**
3. **Implement retry logic for transient failures**
4. **Cache predictions when possible**
5. **Monitor API health regularly**
6. **Use structured logging for debugging**
7. **Implement proper error handling**
8. **Keep API keys secure**

This schema ensures consistent communication between Laravel and the Python ML API while providing flexibility for future enhancements.

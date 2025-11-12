# Employee ML Predictor - Machine Learning Integration

This directory contains Python-based machine learning scripts for employee performance and resignation prediction.

## Overview

The ML system uses **Random Forest Classifier** to predict:
1. **Employee Potential Classification**
   - High Potential
   - Meets Expectation
   - Below Expectation

2. **Resignation Risk Analysis**
   - Resignation Probability (0-100%)
   - Resignation Status (At Risk / Not at Risk)

## Features

- ✅ Real-time predictions for all active employees
- ✅ Integrates with existing database (no CSV files needed)
- ✅ Uses past 30 days of attendance data
- ✅ Considers performance evaluations
- ✅ Automatic model training and caching
- ✅ RESTful API integration with Laravel backend
- ✅ Seamless frontend dashboard integration

## Installation

### Prerequisites

- Python 3.8 or higher
- pip (Python package manager)
- MySQL database with employee, performance, and attendance data

### Step 1: Install Python Dependencies

```bash
cd ml_scripts
pip install -r requirements.txt
```

Or install packages individually:

```bash
pip install pandas numpy scikit-learn joblib mysql-connector-python
```

### Step 2: Verify Python Installation

Make sure Python is accessible from your command line:

```bash
python --version
```

On some systems, you might need to use `python3`:

```bash
python3 --version
```

### Step 3: Test the ML Script

```bash
python employee_ml_predictor.py localhost 3307 lapeco_hrms root ""
```

Replace the parameters with your database configuration:
- **localhost**: Database host
- **3307**: Database port
- **lapeco_hrms**: Database name
- **root**: Database username
- **""**: Database password (empty string if no password)

## How It Works

### Data Flow

```
┌─────────────────┐
│   MySQL DB      │
│  - users        │
│  - performance  │
│  - attendance   │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│  Python ML Script       │
│  - Fetches data         │
│  - Engineers features   │
│  - Trains/loads model   │
│  - Generates predictions│
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  Laravel Controller     │
│  - Executes Python      │
│  - Caches results       │
│  - Serves API           │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  React Frontend         │
│  - Displays dashboard   │
│  - Shows predictions    │
│  - Enables refresh      │
└─────────────────────────┘
```

### Feature Engineering

The ML model uses these features:

**Performance Metrics:**
- Attendance score
- Dedication score
- Performance (job knowledge & work efficiency)
- Cooperation (task acceptance & adaptability)
- Initiative (autonomy & under pressure)
- Communication, Teamwork, Character
- Responsiveness, Personality, Appearance, Work habits
- Overall score & average evaluation
- Count of low scores

**Employee Attributes:**
- Age (calculated from birthday)
- Gender (encoded)
- Tenure (months since joining)

**Attendance Data (Past 30 Days):**
- Late count
- Absent count
- Present count
- Attendance rate (%)

### Model Training

The model automatically trains when:
1. No existing model file is found
2. You explicitly trigger a retrain via API

**Training Process:**
- Uses Random Forest with 300 trees
- Balanced class weights
- Calculates optimal prediction threshold via ROC curve
- Saves model as `employee_resignation_model.pkl`

## API Endpoints

### Get All Predictions

```http
GET /api/ml/predictions
```

**Query Parameters:**
- `refresh=true` - Force refresh predictions (bypass cache)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "employee_id": 1,
      "employee_name": "John Doe",
      "performance_score": 4.2,
      "potential": "High Potential",
      "resignation_probability": 0.15,
      "resignation_status": "Not at Risk",
      "attendance_rate": 95.5,
      "late_count": 2,
      "absent_count": 1,
      "tenure_months": 24
    }
  ],
  "timestamp": "2025-11-12T07:30:00.000Z",
  "cached": false
}
```

### Get Prediction for Specific Employee

```http
GET /api/ml/predictions/{employeeId}
```

### Get Model Statistics

```http
GET /api/ml/stats
```

### Clear Predictions Cache

```http
POST /api/ml/clear-cache
```

### Retrain Model

```http
POST /api/ml/retrain
```

## Frontend Integration

The predictions are automatically integrated into the **Predictive Analytics Dashboard**.

### Features:

- **ML Enhanced Badge** - Shows when ML predictions are active
- **Refresh Button** - Manually refresh predictions
- **Status Indicators** - Loading/Error states
- **Seamless Integration** - Falls back to rule-based predictions if ML is unavailable

### Usage:

1. Navigate to **Predictive Analytics** page
2. Look for "ML Enhanced" badge in the header
3. Click refresh icon to update predictions
4. ML predictions override rule-based classifications

## Troubleshooting

### Python Not Found

**Error:** `'python' is not recognized as an internal or external command`

**Solution:** 
- Install Python from [python.org](https://www.python.org/downloads/)
- Make sure to check "Add Python to PATH" during installation
- Restart your terminal/command prompt

### MySQL Connection Error

**Error:** `Failed to connect to MySQL`

**Solution:**
- Verify database credentials in `.env` file
- Ensure MySQL server is running
- Check firewall settings

### Insufficient Data

**Error:** `Insufficient Data` in predictions

**Solution:**
- Ensure employees have performance evaluations
- Add attendance records for the past 30 days
- Check that employee records are complete

### Model Training Failed

**Error:** `Not enough data to train`

**Solution:**
- Need at least 10 employees with complete evaluation data
- Add more performance evaluations
- Check data quality in database

## Configuration

### Laravel Controller Configuration

Edit `app/Http/Controllers/MLPredictionController.php`:

```php
// Python path (auto-detected on Windows)
private $pythonPath = 'python';

// Cache duration (in seconds)
private $cacheDuration = 3600; // 1 hour
```

### Python Script Configuration

Edit `ml_scripts/employee_ml_predictor.py`:

```python
# Days of attendance to consider
days = 30

# Quantile thresholds for potential classification
high_threshold = 0.75  # Top 25%
low_threshold = 0.25   # Bottom 25%
```

## Performance Optimization

### Caching

Predictions are cached for 1 hour by default. Adjust cache duration in `MLPredictionController.php`.

### Database Indexing

For better performance, add indexes:

```sql
CREATE INDEX idx_employee_id ON performance_evaluations(employee_id);
CREATE INDEX idx_user_id ON schedule_assignments(user_id);
CREATE INDEX idx_date ON schedules(date);
```

## Model Accuracy

The model performance depends on:
- **Data Quality** - Complete and accurate employee records
- **Data Quantity** - More historical data = better predictions
- **Feature Relevance** - Current features capture key indicators

**Recommended:** Retrain the model quarterly or after major organizational changes.

## Future Enhancements

Potential improvements:
- [ ] Add more features (promotions, salary changes, surveys)
- [ ] Implement deep learning models
- [ ] Real-time model updates
- [ ] A/B testing different algorithms
- [ ] Explainable AI (SHAP values)
- [ ] Predictive analytics for hiring success

## Support

For issues or questions:
1. Check logs in Laravel: `storage/logs/laravel.log`
2. Check Python errors in console output
3. Enable debug mode in Laravel `.env`: `APP_DEBUG=true`

## License

Part of LAPECO HRMS - All rights reserved.

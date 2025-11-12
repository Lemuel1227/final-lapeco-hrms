# ML Predictive Analytics - Setup Guide

## Overview

Successfully implemented a complete Machine Learning system for employee performance and resignation prediction that integrates with your existing Laravel + React + MySQL stack.

## What Was Created

### 1. Python ML Script (`ml_scripts/employee_ml_predictor.py`)
- **Random Forest Classifier** for resignation prediction
- Fetches data directly from MySQL database (no CSV files)
- Uses past 30 days of attendance data
- Analyzes performance evaluations
- Generates predictions for all active employees
- Auto-trains and caches model

### 2. Laravel Controller (`app/Http/Controllers/MLPredictionController.php`)
- Executes Python script with database credentials
- Implements caching (1 hour default)
- Provides RESTful API endpoints
- Handles errors gracefully
- Auto-detects Python installation path

### 3. API Routes (`routes/api.php`)
Added 5 new endpoints:
- `GET /api/ml/predictions` - Get all predictions
- `GET /api/ml/predictions/{id}` - Get specific employee prediction
- `GET /api/ml/stats` - Get model statistics
- `POST /api/ml/clear-cache` - Clear prediction cache
- `POST /api/ml/retrain` - Retrain ML model

### 4. React Hook (`frontend/js/hooks/useMLPredictions.js`)
- Custom hook for managing ML predictions
- Handles loading, error states
- Provides refresh functionality
- Enriches employee data with ML insights

### 5. Updated Dashboard (`frontend/js/pages/Predictive-Analytics/PredictiveAnalyticsPage.jsx`)
- Integrated ML predictions seamlessly
- ML Enhanced badge when active
- Refresh button for on-demand updates
- Status indicators (loading, error, success)
- Falls back to rule-based if ML unavailable

### 6. Supporting Files
- `ml_scripts/requirements.txt` - Python dependencies
- `ml_scripts/README.md` - Comprehensive documentation
- `ml_scripts/.gitignore` - Ignore ML models and cache files

## Installation Steps

### Step 1: Install Python Dependencies

```bash
# Navigate to ml_scripts directory
cd ml_scripts

# Install required packages
pip install -r requirements.txt
```

**Required packages:**
- pandas (data processing)
- numpy (numerical operations)
- scikit-learn (machine learning)
- joblib (model persistence)
- mysql-connector-python (database access)

### Step 2: Verify Python Installation

```bash
# Check Python version (should be 3.8+)
python --version

# Test the ML script manually
python employee_ml_predictor.py localhost 3307 lapeco_hrms root ""
```

**Note:** Replace database parameters with your actual configuration from `.env` file.

### Step 3: Configure Laravel Controller (Optional)

The controller auto-detects Python installation. If needed, manually configure in:
`app/Http/Controllers/MLPredictionController.php`

```php
// Line 28: Set Python path
private $pythonPath = 'python';

// Line 35: Adjust cache duration (seconds)
private $cacheDuration = 3600; // 1 hour
```

### Step 4: Test API Endpoints

Start your Laravel server and test:

```bash
# Get predictions (authenticated request)
GET http://localhost:8000/api/ml/predictions

# Force refresh
GET http://localhost:8000/api/ml/predictions?refresh=true

# Get statistics
GET http://localhost:8000/api/ml/stats
```

### Step 5: Verify Frontend Integration

1. Navigate to **Predictive Analytics** page
2. Look for **"ML Enhanced"** badge in header
3. Should see predictions loading automatically
4. Click refresh icon to manually update

## How It Works

### Data Flow

```
MySQL Database
    ↓
Python ML Script
    ↓ (JSON output)
Laravel Controller
    ↓ (REST API)
React Frontend
    ↓
Dashboard Display
```

### Features Used

**From Database:**
- Employee information (users table)
- Performance evaluations (performance_evaluations, performance_evaluator_responses)
- Attendance logs - past 30 days (attendances, schedule_assignments, schedules)

**ML Features:**
- 21 engineered features including:
  - Performance scores (16 evaluation criteria)
  - Attendance metrics (late, absent, present counts)
  - Demographics (age, gender, tenure)
  - Derived metrics (avg evaluation, low score count, attendance rate)

### Predictions Generated

**For Each Employee:**
1. **Potential Classification**
   - High Potential (top 25%)
   - Meets Expectation (middle 50%)
   - Below Expectation (bottom 25%)

2. **Resignation Risk**
   - Probability: 0-100%
   - Status: "At Risk of Resigning" or "Not at Risk"

3. **Supporting Metrics**
   - Performance score
   - Attendance rate
   - Late/absent counts
   - Tenure months

## Usage

### In the Dashboard

The Predictive Analytics page now automatically:
- ✅ Fetches ML predictions on load
- ✅ Shows "ML Enhanced" badge when active
- ✅ Uses ML predictions to classify employees
- ✅ Displays ML-based risk scores
- ✅ Falls back to rule-based if ML unavailable

### Manual Refresh

Click the refresh icon (🔄) in the header to:
- Force new predictions
- Update after adding new data
- Clear cache and retrain if needed

### When to Refresh

Refresh predictions when:
- New performance evaluations are added
- Attendance data changes significantly
- After major organizational changes
- Periodically (weekly/monthly)

## Troubleshooting

### Issue: "Python not found"

**Solution:**
1. Install Python from [python.org](https://www.python.org/downloads/)
2. During installation, check "Add Python to PATH"
3. Restart terminal/IDE
4. Verify: `python --version`

### Issue: "Module not found"

**Solution:**
```bash
cd ml_scripts
pip install -r requirements.txt
```

### Issue: "Database connection failed"

**Solution:**
1. Check database credentials in `.env`
2. Ensure MySQL server is running
3. Verify port (default: 3307 in your setup)
4. Test connection manually

### Issue: "Insufficient Data"

**Solution:**
- Ensure employees have performance evaluations
- Add attendance records for past 30 days
- Check that at least 10 employees have complete data
- Verify data quality in database

### Issue: "Predictions not showing"

**Solution:**
1. Check browser console for errors
2. Verify API endpoint is accessible
3. Check Laravel logs: `storage/logs/laravel.log`
4. Ensure you have permission (role-based access)

### Issue: "Model training failed"

**Solution:**
- Need minimum 10 employees with complete evaluation data
- Check database has sufficient historical data
- Review Python script error output
- Manually test Python script

## Performance Considerations

### Caching
- Predictions cached for 1 hour by default
- Reduces computation overhead
- Adjust cache duration in controller

### Database Optimization
Add indexes for better performance:

```sql
-- Recommended indexes
CREATE INDEX idx_employee_id ON performance_evaluations(employee_id);
CREATE INDEX idx_user_id ON schedule_assignments(user_id);
CREATE INDEX idx_schedule_date ON schedules(date);
CREATE INDEX idx_completed ON performance_evaluations(completed_at);
```

### Model Size
- Random Forest model file: ~1-5 MB
- Stored in `ml_scripts/employee_resignation_model.pkl`
- Automatically created on first run
- Persists across restarts

## API Reference

### Get Predictions
```http
GET /api/ml/predictions
Authorization: Bearer {token}
Query: ?refresh=true (optional)
```

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
      "tenure_months": 24,
      "overall_score": 85.5,
      "avg_evaluation": 4.1
    }
  ],
  "timestamp": "2025-11-12T07:30:00.000Z",
  "cached": false
}
```

### Get Model Stats
```http
GET /api/ml/stats
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total_employees": 50,
    "high_potential_count": 12,
    "meets_expectation_count": 30,
    "below_expectation_count": 8,
    "at_risk_count": 5,
    "not_at_risk_count": 45,
    "avg_performance_score": 3.8,
    "avg_resignation_probability": 15.2,
    "avg_attendance_rate": 92.3,
    "last_updated": "2025-11-12T07:30:00.000Z"
  }
}
```

## Security

- ✅ Protected by authentication middleware
- ✅ Role-based access control (performance module)
- ✅ Database credentials never exposed to frontend
- ✅ Python script runs server-side only
- ✅ API responses validated and sanitized

## Maintenance

### Regular Tasks

**Weekly:**
- Monitor prediction accuracy
- Check for errors in logs
- Verify data quality

**Monthly:**
- Review model performance
- Consider retraining if needed
- Update Python dependencies

**Quarterly:**
- Retrain model with new data
- Evaluate feature importance
- Optimize thresholds

### Updating the Model

To retrain with fresh data:

```http
POST /api/ml/retrain
Authorization: Bearer {token}
```

Or delete model file and restart:

```bash
rm ml_scripts/employee_resignation_model.pkl
# Next API call will retrain automatically
```

## Future Enhancements

Potential improvements:
- [ ] Add explainability (SHAP values)
- [ ] Include more features (surveys, projects)
- [ ] Real-time predictions
- [ ] Email alerts for at-risk employees
- [ ] Advanced visualizations
- [ ] A/B testing different models
- [ ] Batch prediction scheduling

## Technical Stack

- **Backend:** Laravel 10+ (PHP 8.1+)
- **Frontend:** React 18+
- **Database:** MySQL 8.0+
- **ML Framework:** Python 3.8+ with scikit-learn
- **Communication:** REST API (JSON)

## Key Files Reference

```
lapeco-hrms/
├── ml_scripts/
│   ├── employee_ml_predictor.py      # Main ML script
│   ├── requirements.txt               # Python dependencies
│   ├── README.md                      # Detailed documentation
│   ├── .gitignore                     # Git ignore patterns
│   └── employee_resignation_model.pkl # Trained model (auto-generated)
│
├── app/Http/Controllers/
│   └── MLPredictionController.php     # Laravel API controller
│
├── routes/
│   └── api.php                        # API route definitions
│
└── frontend/js/
    ├── hooks/
    │   └── useMLPredictions.js        # React hook for ML data
    └── pages/Predictive-Analytics/
        ├── PredictiveAnalyticsPage.jsx    # Main dashboard (updated)
        ├── PredictiveAnalyticsDashboard.jsx # Charts component (fixed)
        └── PredictiveAnalyticsPage.css    # Styles (updated)
```

## Success Criteria

✅ Python dependencies installed
✅ ML script runs successfully
✅ API endpoints respond correctly
✅ Frontend displays "ML Enhanced" badge
✅ Predictions visible in dashboard
✅ Refresh button works
✅ No errors in console/logs

## Need Help?

1. **Check logs:** `storage/logs/laravel.log`
2. **Browser console:** F12 → Console tab
3. **Test Python:** Run script manually with test parameters
4. **Verify database:** Check data exists in required tables
5. **Review documentation:** `ml_scripts/README.md`

## Summary

You now have a fully integrated ML system that:
- Predicts employee potential and resignation risk
- Updates based on real database data (past 30 days attendance + performance)
- Integrates seamlessly with existing Predictive Analytics dashboard
- Provides automatic and manual refresh capabilities
- Falls back gracefully if ML is unavailable
- Scales with your employee data

The system is production-ready and will improve over time as more data accumulates.

# Employee ML Prediction API

A standalone FastAPI service for machine learning predictions on employee data.

## Quick Start

### 1. Installation

```bash
# Clone or copy the python-ml-api folder to your server

# Install dependencies
cd python-ml-api
pip install -r requirements.txt

# Copy environment configuration
cp .env.example .env
# Edit .env with your settings
```

### 2. Configuration

Edit `.env` file:
```bash
API_HOST=0.0.0.0
API_PORT=8000
ALLOWED_ORIGINS=https://your-laravel-domain.com
ML_API_KEY=your-secure-api-key
```

### 3. Run the API

```bash
# Development
python start.py

# Production with Gunicorn
pip install gunicorn
gunicorn -w 4 -k uvicorn.workers.UvicornWorker app.main:app --bind 0.0.0.0:8000
```

### 4. Test the API

```bash
# Health check
curl http://localhost:8000/health

# API documentation
# Open browser: http://localhost:8000/docs
```

## API Endpoints

- `GET /` - Root health check
- `GET /health` - Detailed health check
- `POST /predict` - Generate predictions
- `POST /train` - Train model
- `GET /model/stats` - Model statistics
- `DELETE /model/cache` - Clear model cache
- `POST /model/reload` - Reload model

## Features

- **Standalone Operation**: No database dependencies
- **JSON Communication**: All data via HTTP requests
- **Model Caching**: In-memory model storage
- **Background Training**: Non-blocking model training
- **Health Monitoring**: Comprehensive health checks
- **Auto-scaling Ready**: Stateless design
- **Docker Support**: Container deployment ready

## Integration with Laravel

The Laravel application sends employee data via HTTP requests to this API service. See the deployment guide for complete setup instructions.

## Model Storage

Models are saved to the `models/` directory:
- `employee_resignation_model.pkl` - Trained ML model
- `model_metadata.pkl` - Model metadata and settings

## Monitoring

- Check `/health` endpoint for service status
- Monitor logs for prediction accuracy
- Track model performance over time
- Set up alerts for service availability

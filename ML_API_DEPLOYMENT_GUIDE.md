# ML API Deployment Guide

## Overview

This guide covers deploying the refactored Employee ML Prediction system as a standalone Python API service separate from your Laravel application on Hostinger.

## Architecture

```
┌─────────────────┐    HTTP Requests    ┌──────────────────┐
│                 │ ──────────────────► │                  │
│  Laravel App    │                     │   Python ML API  │
│  (Hostinger)    │ ◄────────────────── │   (Separate      │
│                 │    JSON Response    │    Server)       │
└─────────────────┘                     └──────────────────┘
        │                                         │
        │                                         │
        ▼                                         ▼
┌─────────────────┐                     ┌──────────────────┐
│   MySQL DB      │                     │   ML Models      │
│   (Employee     │                     │   (Local Files)  │
│    Data)        │                     │                  │
└─────────────────┘                     └──────────────────┘
```

## Folder Structure

```
lapeco-hrms/
├── lapeco-hrms/                     # Laravel Application (stays on Hostinger)
│   ├── app/
│   │   ├── Http/Controllers/
│   │   │   └── MLPredictionController.php  # Updated controller
│   │   └── Services/
│   │       └── MLDataService.php           # New service
│   ├── config/
│   │   └── services.php                    # Updated config
│   └── ml_scripts/                         # Can be removed after migration
└── python-ml-api/                         # New standalone API (separate server)
    ├── app/
    │   ├── __init__.py
    │   ├── main.py                         # FastAPI application
    │   ├── config.py                       # Configuration
    │   ├── models/
    │   │   ├── __init__.py
    │   │   └── schemas.py                  # Pydantic models
    │   └── services/
    │       ├── __init__.py
    │       └── ml_predictor.py             # Refactored ML service
    ├── models/                             # ML model storage
    ├── requirements.txt
    ├── start.py
    ├── Dockerfile
    └── .env.example
```

## Part 1: Laravel Setup (Hostinger)

### 1. Update Environment Variables

Add to your `.env` file on Hostinger:

```bash
# ML API Configuration
ML_API_URL=http://your-python-server-ip:8000
ML_API_KEY=your-secure-api-key
ML_API_TIMEOUT=300
```

### 2. Deploy Updated Laravel Files

Upload the updated files to your Hostinger account:

- `app/Http/Controllers/MLPredictionController.php` (updated)
- `app/Services/MLDataService.php` (new)
- `config/services.php` (updated)

### 3. Register the Service (if using dependency injection)

Add to `app/Providers/AppServiceProvider.php`:

```php
public function register()
{
    $this->app->singleton(MLDataService::class, function ($app) {
        return new MLDataService();
    });
}
```

## Part 2: Python API Setup (Separate Server)

### Option A: VPS/Cloud Server Deployment

#### Requirements
- Ubuntu 20.04+ or CentOS 7+
- Python 3.9+
- 2GB+ RAM
- 10GB+ storage

#### Installation Steps

1. **Server Setup**
   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y
   
   # Install Python and dependencies
   sudo apt install python3 python3-pip python3-venv nginx -y
   
   # Create application user
   sudo adduser mlapi
   sudo usermod -aG sudo mlapi
   ```

2. **Deploy Application**
   ```bash
   # Switch to mlapi user
   su - mlapi
   
   # Upload the python-ml-api folder to /home/mlapi/
   # You can use scp, rsync, or git
   
   # Create virtual environment
   cd /home/mlapi/python-ml-api
   python3 -m venv venv
   source venv/bin/activate
   
   # Install dependencies
   pip install -r requirements.txt
   
   # Copy environment file
   cp .env.example .env
   
   # Edit configuration
   nano .env
   ```

3. **Configure Environment**
   ```bash
   # .env file contents
   API_HOST=0.0.0.0
   API_PORT=8000
   API_DEBUG=False
   ALLOWED_ORIGINS=https://your-laravel-domain.com,http://localhost
   MODEL_PATH=models
   LOG_LEVEL=INFO
   ML_API_KEY=your-secure-api-key-here
   ```

4. **Create Systemd Service**
   ```bash
   sudo nano /etc/systemd/system/mlapi.service
   ```
   
   ```ini
   [Unit]
   Description=ML Prediction API
   After=network.target
   
   [Service]
   Type=simple
   User=mlapi
   WorkingDirectory=/home/mlapi/python-ml-api
   Environment=PATH=/home/mlapi/python-ml-api/venv/bin
   ExecStart=/home/mlapi/python-ml-api/venv/bin/python start.py
   Restart=always
   RestartSec=10
   
   [Install]
   WantedBy=multi-user.target
   ```

5. **Start Service**
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable mlapi
   sudo systemctl start mlapi
   sudo systemctl status mlapi
   ```

6. **Configure Nginx (Optional)**
   ```bash
   sudo nano /etc/nginx/sites-available/mlapi
   ```
   
   ```nginx
   server {
       listen 80;
       server_name your-ml-api-domain.com;
   
       location / {
           proxy_pass http://127.0.0.1:8000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```
   
   ```bash
   sudo ln -s /etc/nginx/sites-available/mlapi /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

### Option B: Docker Deployment

1. **Build and Run with Docker**
   ```bash
   # Build the image
   cd python-ml-api
   docker build -t ml-prediction-api .
   
   # Run the container
   docker run -d \
     --name ml-api \
     -p 8000:8000 \
     -v $(pwd)/models:/app/models \
     -e ML_API_KEY=your-secure-api-key \
     -e ALLOWED_ORIGINS=https://your-laravel-domain.com \
     ml-prediction-api
   ```

2. **Docker Compose (Recommended)**
   
   Create `docker-compose.yml`:
   ```yaml
   version: '3.8'
   
   services:
     ml-api:
       build: .
       ports:
         - "8000:8000"
       volumes:
         - ./models:/app/models
         - ./logs:/app/logs
       environment:
         - ML_API_KEY=your-secure-api-key
         - ALLOWED_ORIGINS=https://your-laravel-domain.com
         - LOG_LEVEL=INFO
       restart: unless-stopped
       healthcheck:
         test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
         interval: 30s
         timeout: 10s
         retries: 3
   ```
   
   Run:
   ```bash
   docker-compose up -d
   ```

### Option C: Cloud Platform Deployment

#### Railway
1. Connect your GitHub repository
2. Add environment variables
3. Deploy automatically

#### Heroku
1. Create `Procfile`:
   ```
   web: python start.py
   ```
2. Deploy via Git or GitHub integration

#### DigitalOcean App Platform
1. Connect repository
2. Configure environment variables
3. Deploy with auto-scaling

## Part 3: Testing and Validation

### 1. Test Python API Directly

```bash
# Health check
curl http://your-server:8000/health

# Test prediction endpoint
curl -X POST http://your-server:8000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "employees": [
      {
        "employee_id": 1,
        "employee_name": "John Doe",
        "attendance_score": 4.5,
        "dedication_score": 4.0,
        "performance_job_knowledge": 3.8
      }
    ]
  }'
```

### 2. Test Laravel Integration

```bash
# Test from Laravel
curl https://your-laravel-domain.com/api/ml/predictions

# Check health
curl https://your-laravel-domain.com/api/ml/health
```

## Part 4: Security and Best Practices

### 1. Security Configuration

- Use HTTPS for production
- Implement API key authentication
- Configure proper CORS origins
- Use firewall rules to restrict access
- Regular security updates

### 2. Monitoring and Logging

```bash
# Check API logs
sudo journalctl -u mlapi -f

# Check application logs
tail -f /home/mlapi/python-ml-api/logs/app.log

# Monitor resource usage
htop
```

### 3. Backup and Recovery

```bash
# Backup ML models
rsync -av /home/mlapi/python-ml-api/models/ /backup/ml-models/

# Database backup (for training data)
# This should be handled by your Laravel application
```

## Part 5: Performance Optimization

### 1. Caching Strategy

- Laravel caches predictions for 1 hour
- Python API keeps models in memory
- Consider Redis for shared caching

### 2. Scaling Options

- **Horizontal**: Multiple API instances behind load balancer
- **Vertical**: Increase server resources
- **Auto-scaling**: Use cloud platform auto-scaling

### 3. Model Updates

```bash
# Retrain model via API
curl -X POST http://your-server:8000/train \
  -H "Content-Type: application/json" \
  -d '{"employees": [...]}'

# Clear model cache
curl -X DELETE http://your-server:8000/model/cache
```

## Part 6: Maintenance and Updates

### 1. Regular Updates

```bash
# Update Python packages
source venv/bin/activate
pip install -r requirements.txt --upgrade

# Restart service
sudo systemctl restart mlapi
```

### 2. Model Management

- Monitor model performance
- Retrain periodically with new data
- Version control for models
- A/B testing for model updates

## Troubleshooting

### Common Issues

1. **Connection Refused**
   - Check if service is running
   - Verify firewall rules
   - Check port configuration

2. **Slow Predictions**
   - Monitor server resources
   - Consider model optimization
   - Check network latency

3. **Model Training Fails**
   - Verify minimum data requirements
   - Check data format
   - Review error logs

### Debugging Commands

```bash
# Check service status
sudo systemctl status mlapi

# View logs
sudo journalctl -u mlapi -n 100

# Test API endpoints
curl -v http://localhost:8000/health

# Check resource usage
free -h
df -h
```

## Migration Checklist

- [ ] Set up Python API server
- [ ] Deploy Python ML API code
- [ ] Configure environment variables
- [ ] Update Laravel controller
- [ ] Add MLDataService to Laravel
- [ ] Test API connectivity
- [ ] Test end-to-end predictions
- [ ] Monitor performance
- [ ] Set up logging and monitoring
- [ ] Configure backups
- [ ] Document API endpoints
- [ ] Train team on new architecture

## Support and Monitoring

### Health Endpoints

- `GET /health` - API health check
- `GET /model/stats` - Model statistics
- `POST /predict` - Generate predictions
- `POST /train` - Train model
- `DELETE /model/cache` - Clear cache

### Monitoring Metrics

- Response time
- Error rate
- Prediction accuracy
- Resource usage
- Model performance

This architecture provides better scalability, maintainability, and separation of concerns while working within Hostinger's limitations.

"""
Employee ML Prediction API Service
==================================

Standalone FastAPI service for machine learning predictions.
This service processes employee data received via JSON and returns
predictions without accessing any external databases.

Features:
- Employee potential classification
- Resignation risk prediction
- Model training and management
- Health checks and monitoring
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import logging
import os
from datetime import datetime

from .models.schemas import (
    EmployeeData, 
    PredictionRequest, 
    PredictionResponse,
    ModelStatsResponse,
    HealthResponse
)
from .services.ml_predictor import MLPredictorService
from .config import settings

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Employee ML Prediction API",
    description="Standalone ML API for employee analytics and predictions",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize ML service
ml_service = MLPredictorService()

@app.on_event("startup")
async def startup_event():
    """Initialize the ML service on startup"""
    logger.info("Starting ML Prediction API service...")
    await ml_service.initialize()
    logger.info("ML Prediction API service started successfully")

@app.get("/", response_model=HealthResponse)
async def root():
    """Root endpoint for health check"""
    return HealthResponse(
        status="healthy",
        message="Employee ML Prediction API is running",
        timestamp=datetime.now(),
        version="1.0.0"
    )

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Detailed health check endpoint"""
    try:
        model_status = ml_service.get_model_status()
        return HealthResponse(
            status="healthy",
            message="All systems operational",
            timestamp=datetime.now(),
            version="1.0.0",
            details={
                "model_loaded": model_status["loaded"],
                "model_trained": model_status["trained"],
                "last_training": model_status.get("last_training"),
                "total_predictions": model_status.get("total_predictions", 0)
            }
        )
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Health check failed: {str(e)}")

@app.post("/predict", response_model=PredictionResponse)
async def predict_employees(request: PredictionRequest):
    """
    Generate ML predictions for employees
    
    This endpoint receives employee data and returns predictions for:
    - Employee potential classification
    - Resignation risk probability and status
    """
    try:
        logger.info(f"Received prediction request for {len(request.employees)} employees")
        
        # Validate request
        if not request.employees:
            raise HTTPException(status_code=400, detail="No employee data provided")
        
        # Generate predictions
        predictions = await ml_service.predict(request.employees)
        
        # Prepare response
        response = PredictionResponse(
            success=True,
            data=predictions,
            timestamp=datetime.now(),
            total_employees=len(predictions),
            model_version=ml_service.get_model_version()
        )
        
        logger.info(f"Successfully generated predictions for {len(predictions)} employees")
        return response
        
    except ValueError as e:
        logger.error(f"Validation error in prediction request: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Prediction error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

@app.post("/train")
async def train_model(request: PredictionRequest, background_tasks: BackgroundTasks):
    """
    Train or retrain the ML model with provided data
    
    This endpoint accepts training data and retrains the model.
    Training happens in the background to avoid blocking the API.
    """
    try:
        logger.info(f"Received training request with {len(request.employees)} employee records")
        
        if len(request.employees) < 10:
            raise HTTPException(
                status_code=400, 
                detail="Minimum 10 employee records required for training"
            )
        
        # Start training in background
        background_tasks.add_task(ml_service.train_model, request.employees)
        
        return {
            "success": True,
            "message": "Model training started in background",
            "timestamp": datetime.now(),
            "training_data_size": len(request.employees)
        }
        
    except Exception as e:
        logger.error(f"Training initiation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to start training: {str(e)}")

@app.get("/model/stats", response_model=ModelStatsResponse)
async def get_model_stats():
    """Get ML model statistics and information"""
    try:
        stats = ml_service.get_model_statistics()
        return ModelStatsResponse(**stats)
    except Exception as e:
        logger.error(f"Error getting model stats: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get model stats: {str(e)}")

@app.delete("/model/cache")
async def clear_model_cache():
    """Clear model cache and force reload"""
    try:
        ml_service.clear_cache()
        return {
            "success": True,
            "message": "Model cache cleared successfully",
            "timestamp": datetime.now()
        }
    except Exception as e:
        logger.error(f"Error clearing cache: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to clear cache: {str(e)}")

@app.post("/model/reload")
async def reload_model():
    """Reload the ML model from disk"""
    try:
        success = await ml_service.reload_model()
        if success:
            return {
                "success": True,
                "message": "Model reloaded successfully",
                "timestamp": datetime.now()
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to reload model")
    except Exception as e:
        logger.error(f"Error reloading model: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to reload model: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )

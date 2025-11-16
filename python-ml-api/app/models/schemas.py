"""
Pydantic schemas for API request/response validation
"""

from pydantic import BaseModel, Field, validator, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime

class BaseSchema(BaseModel):
    """Common base schema with relaxed protected namespaces."""

    model_config = ConfigDict(protected_namespaces=())


class EmployeeData(BaseSchema):
    """Schema for employee data input"""
    employee_id: int = Field(..., description="Unique employee identifier")
    employee_name: str = Field(..., description="Employee full name")
    position_id: Optional[int] = Field(None, description="Position ID")
    joining_date: Optional[str] = Field(None, description="Employee joining date (YYYY-MM-DD)")
    birthday: Optional[str] = Field(None, description="Employee birthday (YYYY-MM-DD)")
    gender: Optional[str] = Field(None, description="Employee gender")
    
    # Performance Evaluation Data
    attendance_score: Optional[float] = Field(None, ge=0, le=5, description="Attendance evaluation score (0-5)")
    dedication_score: Optional[float] = Field(None, ge=0, le=5, description="Dedication score (0-5)")
    performance_job_knowledge: Optional[float] = Field(None, ge=0, le=5, description="Job knowledge score (0-5)")
    performance_work_efficiency: Optional[float] = Field(None, ge=0, le=5, description="Work efficiency score (0-5)")
    cooperation_task_acceptance: Optional[float] = Field(None, ge=0, le=5, description="Task acceptance score (0-5)")
    cooperation_adaptability: Optional[float] = Field(None, ge=0, le=5, description="Adaptability score (0-5)")
    initiative_autonomy: Optional[float] = Field(None, ge=0, le=5, description="Autonomy score (0-5)")
    initiative_under_pressure: Optional[float] = Field(None, ge=0, le=5, description="Under pressure score (0-5)")
    communication: Optional[float] = Field(None, ge=0, le=5, description="Communication score (0-5)")
    teamwork: Optional[float] = Field(None, ge=0, le=5, description="Teamwork score (0-5)")
    character: Optional[float] = Field(None, ge=0, le=5, description="Character score (0-5)")
    responsiveness: Optional[float] = Field(None, ge=0, le=5, description="Responsiveness score (0-5)")
    personality: Optional[float] = Field(None, ge=0, le=5, description="Personality score (0-5)")
    appearance: Optional[float] = Field(None, ge=0, le=5, description="Appearance score (0-5)")
    work_habits: Optional[float] = Field(None, ge=0, le=5, description="Work habits score (0-5)")
    overall_score: Optional[float] = Field(None, ge=0, le=5, description="Overall evaluation score (0-5)")
    
    # Attendance Statistics (last 30 days)
    total_days: Optional[int] = Field(0, ge=0, description="Total scheduled days")
    late_count: Optional[int] = Field(0, ge=0, description="Number of late arrivals")
    absent_count: Optional[int] = Field(0, ge=0, description="Number of absences")
    present_count: Optional[int] = Field(0, ge=0, description="Number of present days")

class PredictionResult(BaseSchema):
    """Schema for individual employee prediction result"""
    employee_id: int = Field(..., description="Employee identifier")
    employee_name: str = Field(..., description="Employee name")
    performance_score: float = Field(..., description="Calculated performance score")
    potential: str = Field(..., description="Employee potential classification")
    resignation_probability: float = Field(..., ge=0, le=1, description="Resignation risk probability")
    resignation_status: str = Field(..., description="Resignation risk status")
    attendance_rate: float = Field(..., ge=0, le=100, description="Attendance rate percentage")
    late_count: int = Field(..., ge=0, description="Late arrivals count")
    absent_count: int = Field(..., ge=0, description="Absence count")
    tenure_months: int = Field(..., ge=0, description="Employee tenure in months")
    overall_score: float = Field(..., description="Overall evaluation score")
    avg_evaluation: float = Field(..., description="Average evaluation score")

class PredictionRequest(BaseSchema):
    """Schema for prediction request"""
    employees: List[EmployeeData] = Field(..., description="List of employee data for prediction")
    
    @validator('employees')
    def validate_employees(cls, v):
        if not v:
            raise ValueError("At least one employee record is required")
        if len(v) > 1000:
            raise ValueError("Maximum 1000 employee records allowed per request")
        return v

class PredictionResponse(BaseSchema):
    """Schema for prediction response"""
    success: bool = Field(..., description="Request success status")
    data: List[PredictionResult] = Field(..., description="Prediction results")
    timestamp: datetime = Field(..., description="Response timestamp")
    total_employees: int = Field(..., description="Total number of employees processed")
    model_version: str = Field(..., description="ML model version used")
    error: Optional[str] = Field(None, description="Error message if any")

class ModelStatsResponse(BaseSchema):
    """Schema for model statistics response"""
    total_employees: int = Field(..., description="Total employees analyzed")
    high_potential_count: int = Field(..., description="High potential employees count")
    meets_expectation_count: int = Field(..., description="Meets expectation employees count")
    below_expectation_count: int = Field(..., description="Below expectation employees count")
    at_risk_count: int = Field(..., description="At-risk employees count")
    not_at_risk_count: int = Field(..., description="Not at-risk employees count")
    avg_performance_score: float = Field(..., description="Average performance score")
    avg_resignation_probability: float = Field(..., description="Average resignation probability")
    avg_attendance_rate: float = Field(..., description="Average attendance rate")
    model_version: str = Field(..., description="Model version")
    last_training: Optional[datetime] = Field(None, description="Last training timestamp")
    last_updated: datetime = Field(..., description="Last update timestamp")

class HealthResponse(BaseSchema):
    """Schema for health check response"""
    status: str = Field(..., description="Service status")
    message: str = Field(..., description="Status message")
    timestamp: datetime = Field(..., description="Response timestamp")
    version: str = Field(..., description="API version")
    details: Optional[Dict[str, Any]] = Field(None, description="Additional details")

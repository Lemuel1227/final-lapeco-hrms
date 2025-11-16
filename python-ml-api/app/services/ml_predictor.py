"""
Refactored ML Predictor Service
===============================

This service processes employee data received via JSON instead of
accessing databases directly. It maintains the same ML logic but
works as a standalone service.
"""

import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import roc_curve, auc
import joblib
import warnings
import os
import asyncio
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple
import logging

from ..models.schemas import EmployeeData, PredictionResult
from ..config import settings

warnings.filterwarnings('ignore')

class MLPredictorService:
    """
    Refactored ML prediction service that works with JSON data
    instead of direct database access.
    """
    
    def __init__(self):
        """Initialize the ML predictor service"""
        self.model: Optional[RandomForestClassifier] = None
        self.threshold: float = 0.5
        self.model_version: str = "1.0.0"
        self.last_training: Optional[datetime] = None
        self.total_predictions: int = 0
        self.logger = logging.getLogger(__name__)
        
        # Ensure models directory exists
        self.models_dir = settings.MODEL_PATH
        os.makedirs(self.models_dir, exist_ok=True)
        
        self.model_path = os.path.join(self.models_dir, 'employee_resignation_model.pkl')
        self.metadata_path = os.path.join(self.models_dir, 'model_metadata.pkl')
        
    async def initialize(self):
        """Initialize the service and load existing model if available"""
        try:
            self.load_model()
            self.logger.info("ML Predictor Service initialized successfully")
        except Exception as e:
            self.logger.warning(f"Could not load existing model: {e}")
            self.logger.info("Service initialized without pre-trained model")
    
    def load_model(self) -> bool:
        """Load the trained model from disk"""
        try:
            if os.path.exists(self.model_path):
                self.model = joblib.load(self.model_path)
                
                # Load metadata if available
                if os.path.exists(self.metadata_path):
                    metadata = joblib.load(self.metadata_path)
                    self.threshold = metadata.get('threshold', 0.5)
                    self.model_version = metadata.get('version', '1.0.0')
                    self.last_training = metadata.get('last_training')
                    
                self.logger.info("Model loaded successfully")
                return True
        except Exception as e:
            self.logger.error(f"Error loading model: {e}")
        
        return False
    
    def save_model(self):
        """Save the trained model and metadata to disk"""
        try:
            if self.model is not None:
                joblib.dump(self.model, self.model_path)
                
                # Save metadata
                metadata = {
                    'threshold': self.threshold,
                    'version': self.model_version,
                    'last_training': datetime.now(),
                    'total_predictions': self.total_predictions
                }
                joblib.dump(metadata, self.metadata_path)
                
                self.last_training = metadata['last_training']
                self.logger.info("Model saved successfully")
        except Exception as e:
            self.logger.error(f"Error saving model: {e}")
    
    def calculate_age(self, birthday: Optional[str]) -> int:
        """Calculate age from birthday string"""
        if not birthday:
            return 30  # Default age
        
        try:
            birthday_date = pd.to_datetime(birthday)
            today = datetime.now()
            age = today.year - birthday_date.year - ((today.month, today.day) < (birthday_date.month, birthday_date.day))
            return max(18, age)  # Minimum age of 18
        except:
            return 30  # Default age if parsing fails
    
    def calculate_tenure(self, joining_date: Optional[str]) -> int:
        """Calculate tenure in months"""
        if not joining_date:
            return 12  # Default tenure
        
        try:
            joining_date_dt = pd.to_datetime(joining_date)
            today = datetime.now()
            months = (today.year - joining_date_dt.year) * 12 + (today.month - joining_date_dt.month)
            return max(0, months)
        except:
            return 12  # Default tenure if parsing fails
    
    def process_employee_data(self, employees: List[EmployeeData]) -> pd.DataFrame:
        """Convert employee data to DataFrame and engineer features"""
        
        # Convert to DataFrame
        data = []
        for emp in employees:
            row = {
                'id': emp.employee_id,
                'name': emp.employee_name,
                'position_id': emp.position_id,
                'joining_date': emp.joining_date,
                'birthday': emp.birthday,
                'gender': emp.gender or 'Male',
                
                # Performance scores
                'attendance': emp.attendance_score or 3.0,
                'dedication': emp.dedication_score or 3.0,
                'performance_job_knowledge': emp.performance_job_knowledge or 3.0,
                'performance_work_efficiency': emp.performance_work_efficiency or 3.0,
                'cooperation_task_acceptance': emp.cooperation_task_acceptance or 3.0,
                'cooperation_adaptability': emp.cooperation_adaptability or 3.0,
                'initiative_autonomy': emp.initiative_autonomy or 3.0,
                'initiative_under_pressure': emp.initiative_under_pressure or 3.0,
                'communication': emp.communication or 3.0,
                'teamwork': emp.teamwork or 3.0,
                'character': emp.character or 3.0,
                'responsiveness': emp.responsiveness or 3.0,
                'personality': emp.personality or 3.0,
                'appearance': emp.appearance or 3.0,
                'work_habits': emp.work_habits or 3.0,
                'overall_score': emp.overall_score or 3.0,
                
                # Attendance statistics
                'total_days': emp.total_days or 0,
                'late_count': emp.late_count or 0,
                'absent_count': emp.absent_count or 0,
                'present_count': emp.present_count or 0,
            }
            data.append(row)
        
        df = pd.DataFrame(data)
        
        # Engineer features
        return self.engineer_features(df)
    
    def engineer_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Engineer features from the employee data"""
        
        # Calculate age and tenure
        df['age'] = df['birthday'].apply(self.calculate_age)
        df['tenure'] = df['joining_date'].apply(self.calculate_tenure)
        
        # Encode gender
        gender_encoder = LabelEncoder()
        df['gender_encoded'] = gender_encoder.fit_transform(df['gender'].fillna('Male'))
        
        # Ensure all evaluation scores are within valid range
        eval_cols = [
            'attendance', 'dedication', 'performance_job_knowledge',
            'performance_work_efficiency', 'cooperation_task_acceptance',
            'cooperation_adaptability', 'initiative_autonomy', 'initiative_under_pressure',
            'communication', 'teamwork', 'character', 'responsiveness',
            'personality', 'appearance', 'work_habits', 'overall_score'
        ]
        
        for col in eval_cols:
            if col in df.columns:
                df[col] = df[col].fillna(3.0)  # Default to middle score
                df[col] = df[col].clip(1, 5)   # Ensure 1-5 range
        
        # Create derived performance features
        df['performance'] = df[['performance_job_knowledge', 'performance_work_efficiency']].mean(axis=1)
        df['cooperation'] = df[['cooperation_task_acceptance', 'cooperation_adaptability']].mean(axis=1)
        df['initiative'] = df[['initiative_autonomy', 'initiative_under_pressure']].mean(axis=1)
        
        # Calculate average evaluation score
        df['avg_evaluation'] = df[[
            'attendance', 'dedication', 'performance', 'cooperation',
            'initiative', 'communication', 'teamwork', 'character',
            'responsiveness', 'personality', 'appearance', 'work_habits'
        ]].mean(axis=1)
        
        # Count low scores (indicators of poor performance)
        df['low_score_count'] = df[['attendance', 'performance', 'initiative']].apply(
            lambda x: sum(x <= 2), axis=1
        )
        
        # Calculate attendance rate
        df['attendance_rate'] = df.apply(
            lambda row: (row['present_count'] / row['total_days'] * 100) if row['total_days'] > 0 else 100,
            axis=1
        )
        
        return df
    
    async def train_model(self, employees: List[EmployeeData]) -> bool:
        """Train the ML model with provided employee data"""
        try:
            self.logger.info(f"Starting model training with {len(employees)} employee records")
            
            if len(employees) < settings.MIN_TRAINING_SAMPLES:
                raise ValueError(f"Minimum {settings.MIN_TRAINING_SAMPLES} employees required for training")
            
            # Process employee data
            df = self.process_employee_data(employees)
            
            # Define features for the model
            feature_cols = [
                'attendance', 'dedication', 'performance', 'cooperation',
                'initiative', 'communication', 'teamwork', 'character',
                'responsiveness', 'personality', 'appearance', 'work_habits',
                'overall_score', 'avg_evaluation', 'low_score_count',
                'age', 'gender_encoded', 'tenure', 'late_count', 'absent_count',
                'attendance_rate'
            ]
            
            # Filter rows with complete feature data
            df_train = df.dropna(subset=feature_cols)
            
            if len(df_train) < settings.MIN_TRAINING_SAMPLES:
                raise ValueError(f"Not enough complete records for training. Got {len(df_train)}, need {settings.MIN_TRAINING_SAMPLES}")
            
            # Create synthetic resignation target based on performance indicators
            # In production, replace this with actual resignation data
            df_train['resigned'] = (
                (df_train['performance'] < 2.5) |
                (df_train['attendance_rate'] < 70) |
                (df_train['low_score_count'] >= 2)
            ).astype(int)
            
            X = df_train[feature_cols]
            y = df_train['resigned']
            
            # Train Random Forest model
            self.model = RandomForestClassifier(
                n_estimators=300,
                min_samples_leaf=2,
                class_weight='balanced',
                random_state=42,
                n_jobs=-1
            )
            
            # Run training in executor to avoid blocking
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, self.model.fit, X, y)
            
            # Calculate optimal threshold using ROC curve
            y_prob = self.model.predict_proba(X)[:, 1]
            
            if len(set(y)) > 1:  # Only calculate ROC if we have both classes
                fpr, tpr, thresholds = roc_curve(y, y_prob)
                optimal_idx = np.argmax(tpr - fpr)
                self.threshold = thresholds[optimal_idx]
            else:
                self.threshold = 0.5
            
            # Update model version
            self.model_version = f"1.0.{int(datetime.now().timestamp())}"
            
            # Save the model
            self.save_model()
            
            self.logger.info(f"Model training completed successfully. Version: {self.model_version}")
            return True
            
        except Exception as e:
            self.logger.error(f"Model training failed: {e}")
            return False
    
    def predict_potential(self, df: pd.DataFrame) -> pd.Series:
        """Classify employee potential based on performance scores"""
        
        # Calculate performance percentiles
        performance_scores = df['performance'].dropna()
        
        if len(performance_scores) == 0:
            return pd.Series(["Insufficient Data"] * len(df), index=df.index)
        
        high_threshold = performance_scores.quantile(0.75)
        low_threshold = performance_scores.quantile(0.25)
        
        def classify(score):
            if pd.isna(score):
                return "Insufficient Data"
            if score >= high_threshold:
                return "High Potential"
            elif score >= low_threshold:
                return "Meets Expectation"
            else:
                return "Below Expectation"
        
        return df['performance'].apply(classify)
    
    def predict_resignation(self, df: pd.DataFrame) -> Tuple[pd.Series, pd.Series]:
        """Predict resignation probability and status"""
        
        # Initialize with default values
        resignation_prob = pd.Series(0.0, index=df.index)
        resignation_status = pd.Series("Not at Risk", index=df.index)
        
        if self.model is None:
            return resignation_prob, resignation_status
        
        performance_scores = df['performance'].dropna()
        if len(performance_scores) == 0:
            return resignation_prob, resignation_status
            
        high_threshold = performance_scores.quantile(0.75)
        
        # Define features for prediction
        feature_cols = [
            'attendance', 'dedication', 'performance', 'cooperation',
            'initiative', 'communication', 'teamwork', 'character',
            'responsiveness', 'personality', 'appearance', 'work_habits',
            'overall_score', 'avg_evaluation', 'low_score_count',
            'age', 'gender_encoded', 'tenure', 'late_count', 'absent_count',
            'attendance_rate'
        ]
        
        # Identify employees with complete data and not high performers
        mask = (df['performance'] < high_threshold) & df[feature_cols].notna().all(axis=1)
        
        if mask.sum() > 0:
            X_predict = df.loc[mask, feature_cols]
            
            # Predict probabilities
            probs = self.model.predict_proba(X_predict)[:, 1]
            
            resignation_prob.loc[mask] = probs
            resignation_status.loc[mask] = np.where(
                probs > self.threshold,
                "At Risk of Resigning",
                "Not at Risk"
            )
        
        return resignation_prob, resignation_status
    
    async def predict(self, employees: List[EmployeeData]) -> List[PredictionResult]:
        """Generate predictions for a list of employees"""
        
        if not employees:
            return []
        
        try:
            # Process employee data
            df = self.process_employee_data(employees)
            
            # If no model is available, return basic predictions
            if self.model is None:
                self.logger.warning("No trained model available, returning basic predictions")
                return self._generate_basic_predictions(df)
            
            # Generate predictions
            df['potential'] = self.predict_potential(df)
            df['resignation_probability'], df['resignation_status'] = self.predict_resignation(df)
            
            # Convert to response format
            results = []
            for _, row in df.iterrows():
                result = PredictionResult(
                    employee_id=int(row['id']),
                    employee_name=str(row['name']),
                    performance_score=float(row.get('performance', 0)),
                    potential=str(row['potential']),
                    resignation_probability=float(row['resignation_probability']),
                    resignation_status=str(row['resignation_status']),
                    attendance_rate=float(row.get('attendance_rate', 100)),
                    late_count=int(row.get('late_count', 0)),
                    absent_count=int(row.get('absent_count', 0)),
                    tenure_months=int(row.get('tenure', 0)),
                    overall_score=float(row.get('overall_score', 0)),
                    avg_evaluation=float(row.get('avg_evaluation', 0))
                )
                results.append(result)
            
            # Update prediction counter
            self.total_predictions += len(results)
            
            return results
            
        except Exception as e:
            self.logger.error(f"Prediction error: {e}")
            raise
    
    def _generate_basic_predictions(self, df: pd.DataFrame) -> List[PredictionResult]:
        """Generate basic predictions without ML model"""
        
        results = []
        for _, row in df.iterrows():
            result = PredictionResult(
                employee_id=int(row['id']),
                employee_name=str(row['name']),
                performance_score=float(row.get('performance', 0)),
                potential="Insufficient Data",
                resignation_probability=0.0,
                resignation_status="Insufficient Data",
                attendance_rate=float(row.get('attendance_rate', 100)),
                late_count=int(row.get('late_count', 0)),
                absent_count=int(row.get('absent_count', 0)),
                tenure_months=int(row.get('tenure', 0)),
                overall_score=float(row.get('overall_score', 0)),
                avg_evaluation=float(row.get('avg_evaluation', 0))
            )
            results.append(result)
        
        return results
    
    def get_model_status(self) -> Dict[str, Any]:
        """Get current model status"""
        return {
            'loaded': self.model is not None,
            'trained': self.model is not None,
            'version': self.model_version,
            'last_training': self.last_training,
            'total_predictions': self.total_predictions,
            'threshold': self.threshold
        }
    
    def get_model_version(self) -> str:
        """Get current model version"""
        return self.model_version
    
    def get_model_statistics(self) -> Dict[str, Any]:
        """Get model statistics (placeholder - implement based on last predictions)"""
        return {
            'total_employees': 0,
            'high_potential_count': 0,
            'meets_expectation_count': 0,
            'below_expectation_count': 0,
            'at_risk_count': 0,
            'not_at_risk_count': 0,
            'avg_performance_score': 0.0,
            'avg_resignation_probability': 0.0,
            'avg_attendance_rate': 0.0,
            'model_version': self.model_version,
            'last_training': self.last_training,
            'last_updated': datetime.now()
        }
    
    def clear_cache(self):
        """Clear model cache (reload from disk)"""
        self.load_model()
    
    async def reload_model(self) -> bool:
        """Reload model from disk"""
        return self.load_model()

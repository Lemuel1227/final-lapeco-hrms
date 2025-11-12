"""
Employee Performance & Resignation Prediction System
=====================================================

This module uses Machine Learning (Random Forest) to predict:
1. Employee Potential Classification (High Potential, Meets Expectation, Below Expectation)
2. Resignation Risk (probability and status)

Data Sources:
- Performance evaluations (from performance_evaluations & performance_evaluator_responses tables)
- Attendance logs (past 30 days from attendances & schedule_assignments tables)
- Employee information (from users table)

The model trains on historical data and makes predictions for all active employees.
Predictions update dynamically as new performance evaluations and attendance data are added.
"""

import sys
import json
import os
from datetime import datetime, timedelta

# Fix Windows asyncio issues before importing sklearn
import platform
if platform.system() == 'Windows':
    try:
        import asyncio
        # Set the event loop policy for Windows
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
    except Exception:
        # If asyncio fails to import or set policy, continue anyway
        pass

import mysql.connector
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import roc_curve, auc
import joblib
import warnings

warnings.filterwarnings('ignore')


class EmployeeMLPredictor:
    """
    Main class for employee performance and resignation prediction.
    Handles database connection, feature engineering, model training, and predictions.
    """
    
    def __init__(self, db_config):
        """
        Initialize the predictor with database configuration.
        
        Args:
            db_config (dict): Database connection parameters (host, port, database, user, password)
        """
        self.db_config = db_config
        self.model = None
        self.threshold = 0.5  # Default threshold for resignation prediction
        self.model_path = os.path.join(os.path.dirname(__file__), 'employee_resignation_model.pkl')
        
    def connect_db(self):
        """
        Establish connection to MySQL database.
        
        Returns:
            mysql.connector.connection: Database connection object
        """
        return mysql.connector.connect(**self.db_config)
    
    def fetch_active_employees(self):
        """
        Fetch all active employees from the database.
        
        Returns:
            pd.DataFrame: DataFrame containing employee information
        """
        conn = self.connect_db()
        query = """
            SELECT 
                id,
                CONCAT(first_name, ' ', last_name) as name,
                position_id,
                joining_date,
                birthday,
                gender,
                employment_status
            FROM users
            WHERE employment_status = 'active'
        """
        df = pd.read_sql(query, conn)
        conn.close()
        return df
    
    def fetch_performance_data(self, employee_ids):
        """
        Fetch performance evaluation data for specified employees.
        Gets the average scores from all evaluators for each evaluation period.
        
        Args:
            employee_ids (list): List of employee IDs
            
        Returns:
            pd.DataFrame: DataFrame containing performance evaluation data
        """
        if not employee_ids:
            return pd.DataFrame()
        
        conn = self.connect_db()
        
        # Convert list to comma-separated string for SQL IN clause
        ids_str = ','.join(map(str, employee_ids))
        
        query = f"""
            SELECT 
                pe.employee_id,
                pep.evaluation_end as period_end,
                AVG(per.attendance) as attendance,
                AVG(per.dedication) as dedication,
                AVG(per.performance_job_knowledge) as performance_job_knowledge,
                AVG(per.performance_work_efficiency_professionalism) as performance_work_efficiency,
                AVG(per.cooperation_task_acceptance) as cooperation_task_acceptance,
                AVG(per.cooperation_adaptability) as cooperation_adaptability,
                AVG(per.initiative_autonomy) as initiative_autonomy,
                AVG(per.initiative_under_pressure) as initiative_under_pressure,
                AVG(per.communication) as communication,
                AVG(per.teamwork) as teamwork,
                AVG(per.character) as `character`,
                AVG(per.responsiveness) as responsiveness,
                AVG(per.personality) as personality,
                AVG(per.appearance) as appearance,
                AVG(per.work_habits) as work_habits,
                pe.average_score as overall_score
            FROM performance_evaluations pe
            JOIN performance_evaluation_periods pep ON pe.period_id = pep.id
            LEFT JOIN performance_evaluator_responses per ON pe.id = per.evaluation_id
            WHERE pe.employee_id IN ({ids_str})
                AND pe.completed_at IS NOT NULL
            GROUP BY pe.id, pe.employee_id, pep.evaluation_end, pe.average_score
            ORDER BY pe.employee_id, pep.evaluation_end
        """
        
        df = pd.read_sql(query, conn)
        conn.close()
        return df
    
    def fetch_attendance_data(self, employee_ids, days=30):
        """
        Fetch attendance data for the past N days (default 30 days).
        
        Args:
            employee_ids (list): List of employee IDs
            days (int): Number of days to look back for attendance data
            
        Returns:
            pd.DataFrame: DataFrame containing attendance statistics per employee
        """
        if not employee_ids:
            return pd.DataFrame()
        
        conn = self.connect_db()
        
        # Calculate date threshold (30 days ago)
        date_threshold = (datetime.now() - timedelta(days=days)).strftime('%Y-%m-%d')
        
        ids_str = ','.join(map(str, employee_ids))
        
        query = f"""
            SELECT 
                sa.user_id as employee_id,
                COUNT(*) as total_days,
                SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as late_count,
                SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent_count,
                SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_count
            FROM schedule_assignments sa
            JOIN schedules s ON sa.schedule_id = s.id
            LEFT JOIN attendances a ON sa.id = a.schedule_assignment_id
            WHERE sa.user_id IN ({ids_str})
                AND s.date >= '{date_threshold}'
            GROUP BY sa.user_id
        """
        
        df = pd.read_sql(query, conn)
        conn.close()
        return df
    
    def calculate_age(self, birthday):
        """
        Calculate age from birthday.
        
        Args:
            birthday (str or datetime): Employee's birthday
            
        Returns:
            int: Age in years
        """
        if pd.isna(birthday):
            return 30  # Default age if birthday is not available
        
        birthday = pd.to_datetime(birthday)
        today = datetime.now()
        age = today.year - birthday.year - ((today.month, today.day) < (birthday.month, birthday.day))
        return age
    
    def calculate_tenure(self, joining_date):
        """
        Calculate tenure in months.
        
        Args:
            joining_date (str or datetime): Employee's joining date
            
        Returns:
            int: Tenure in months
        """
        if pd.isna(joining_date):
            return 12  # Default tenure if joining date is not available
        
        joining_date = pd.to_datetime(joining_date)
        today = datetime.now()
        months = (today.year - joining_date.year) * 12 + (today.month - joining_date.month)
        return max(0, months)
    
    def engineer_features(self, employees_df, performance_df, attendance_df):
        """
        Combine all data sources and engineer features for machine learning.
        
        Args:
            employees_df (pd.DataFrame): Employee information
            performance_df (pd.DataFrame): Performance evaluation data
            attendance_df (pd.DataFrame): Attendance statistics
            
        Returns:
            pd.DataFrame: DataFrame with engineered features ready for ML
        """
        # Get the latest performance evaluation for each employee
        latest_performance = performance_df.sort_values('period_end').groupby('employee_id').last().reset_index()
        
        # Merge employee data with performance data
        df = employees_df.merge(latest_performance, left_on='id', right_on='employee_id', how='left')
        
        # Merge with attendance data
        df = df.merge(attendance_df, left_on='id', right_on='employee_id', how='left')
        
        # Fill missing attendance data with 0s
        df['late_count'] = df['late_count'].fillna(0)
        df['absent_count'] = df['absent_count'].fillna(0)
        df['present_count'] = df['present_count'].fillna(0)
        df['total_days'] = df['total_days'].fillna(0)
        
        # Calculate age and tenure
        df['age'] = df['birthday'].apply(self.calculate_age)
        df['tenure'] = df['joining_date'].apply(self.calculate_tenure)
        
        # Encode gender (Male=1, Female=0, Others=2)
        gender_encoder = LabelEncoder()
        df['gender_encoded'] = gender_encoder.fit_transform(df['gender'].fillna('Male'))
        
        # Standardize evaluation scores (1-5 scale)
        eval_cols = [
            'attendance', 'dedication', 'performance_job_knowledge',
            'performance_work_efficiency', 'cooperation_task_acceptance',
            'cooperation_adaptability', 'initiative_autonomy', 'initiative_under_pressure',
            'communication', 'teamwork', 'character', 'responsiveness',
            'personality', 'appearance', 'work_habits', 'overall_score'
        ]
        
        for col in eval_cols:
            if col in df.columns:
                df[col] = df[col].fillna(df[col].median())
                df[col] = df[col].clip(1, 5)
        
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
        
        # Calculate attendance rate (0-100%)
        df['attendance_rate'] = df.apply(
            lambda row: (row['present_count'] / row['total_days'] * 100) if row['total_days'] > 0 else 100,
            axis=1
        )
        
        return df
    
    def train_model(self, df):
        """
        Train a Random Forest classifier to predict employee resignation.
        Uses historical data where employees have resigned.
        
        Args:
            df (pd.DataFrame): DataFrame with features and target variable
            
        Returns:
            tuple: (trained_model, optimal_threshold)
        """
        # For initial training, we need historical resignation data
        # In a real scenario, you would have a 'resigned' column in your data
        # For now, we'll create synthetic targets based on performance indicators
        
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
        
        if len(df_train) < 10:
            # Not enough data to train, return None
            return None, 0.5
        
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
        model = RandomForestClassifier(
            n_estimators=300,
            min_samples_leaf=2,
            class_weight='balanced',
            random_state=42,
            n_jobs=-1
        )
        model.fit(X, y)
        
        # Calculate optimal threshold using ROC curve
        y_prob = model.predict_proba(X)[:, 1]
        
        if len(set(y)) > 1:  # Only calculate ROC if we have both classes
            fpr, tpr, thresholds = roc_curve(y, y_prob)
            optimal_idx = np.argmax(tpr - fpr)
            threshold = thresholds[optimal_idx]
        else:
            threshold = 0.5
        
        # Save the model
        joblib.dump(model, self.model_path)
        
        return model, threshold
    
    def load_or_train_model(self, df):
        """
        Load existing model if available, otherwise train a new one.
        
        Args:
            df (pd.DataFrame): DataFrame with features for training
            
        Returns:
            bool: True if model is ready, False otherwise
        """
        # Try to load existing model
        if os.path.exists(self.model_path):
            try:
                self.model = joblib.load(self.model_path)
                return True
            except:
                pass
        
        # Train new model
        model, threshold = self.train_model(df)
        
        if model is not None:
            self.model = model
            self.threshold = threshold
            return True
        
        return False
    
    def predict_potential(self, df):
        """
        Classify employee potential based on performance scores.
        
        Categories:
        - High Potential: Top 25% performers
        - Meets Expectation: Middle 50% performers
        - Below Expectation: Bottom 25% performers
        
        Args:
            df (pd.DataFrame): DataFrame with performance data
            
        Returns:
            pd.Series: Series with potential classifications
        """
        # Calculate performance percentiles
        high_threshold = df['performance'].quantile(0.75)
        low_threshold = df['performance'].quantile(0.25)
        
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
    
    def predict_resignation(self, df):
        """
        Predict resignation probability and status for each employee.
        
        High performers (top 25%) are automatically classified as low risk.
        Others are evaluated by the ML model.
        
        Args:
            df (pd.DataFrame): DataFrame with features
            
        Returns:
            tuple: (resignation_probabilities, resignation_statuses)
        """
        high_threshold = df['performance'].quantile(0.75)
        
        # Initialize with default values
        resignation_prob = pd.Series(0.0, index=df.index)
        resignation_status = pd.Series("Not at Risk", index=df.index)
        
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
        
        if mask.sum() > 0 and self.model is not None:
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
    
    def generate_predictions(self):
        """
        Main method to generate predictions for all active employees.
        
        Returns:
            list: List of dictionaries containing predictions for each employee
        """
        # Fetch data
        employees_df = self.fetch_active_employees()
        
        if employees_df.empty:
            return []
        
        employee_ids = employees_df['id'].tolist()
        performance_df = self.fetch_performance_data(employee_ids)
        attendance_df = self.fetch_attendance_data(employee_ids)
        
        # Engineer features
        df = self.engineer_features(employees_df, performance_df, attendance_df)
        
        # Load or train model
        model_ready = self.load_or_train_model(df)
        
        if not model_ready:
            # Return basic predictions without ML model
            results = []
            for _, row in df.iterrows():
                results.append({
                    'employee_id': int(row['id']),
                    'employee_name': row['name'],
                    'performance_score': float(row.get('performance', 0)) if pd.notna(row.get('performance')) else 0,
                    'potential': "Insufficient Data",
                    'resignation_probability': 0.0,
                    'resignation_status': "Insufficient Data",
                    'attendance_rate': float(row.get('attendance_rate', 100)),
                    'late_count': int(row.get('late_count', 0)),
                    'absent_count': int(row.get('absent_count', 0)),
                    'tenure_months': int(row.get('tenure', 0))
                })
            return results
        
        # Predict potential and resignation risk
        df['potential'] = self.predict_potential(df)
        df['resignation_probability'], df['resignation_status'] = self.predict_resignation(df)
        
        # Prepare results
        results = []
        for _, row in df.iterrows():
            results.append({
                'employee_id': int(row['id']),
                'employee_name': row['name'],
                'performance_score': float(row.get('performance', 0)) if pd.notna(row.get('performance')) else 0,
                'potential': str(row['potential']),
                'resignation_probability': float(row['resignation_probability']),
                'resignation_status': str(row['resignation_status']),
                'attendance_rate': float(row.get('attendance_rate', 100)),
                'late_count': int(row.get('late_count', 0)),
                'absent_count': int(row.get('absent_count', 0)),
                'tenure_months': int(row.get('tenure', 0)),
                'overall_score': float(row.get('overall_score', 0)) if pd.notna(row.get('overall_score')) else 0,
                'avg_evaluation': float(row.get('avg_evaluation', 0)) if pd.notna(row.get('avg_evaluation')) else 0
            })
        
        return results


def main():
    """
    Main entry point for the script.
    Reads database configuration from command line arguments and generates predictions.
    """
    if len(sys.argv) < 5:
        print(json.dumps({
            'success': False,
            'error': 'Insufficient arguments. Expected: host port database user [password]'
        }))
        sys.exit(1)
    
    # Parse database configuration from command line
    db_config = {
        'host': sys.argv[1],
        'port': int(sys.argv[2]),
        'database': sys.argv[3],
        'user': sys.argv[4],
        'password': sys.argv[5].strip() if len(sys.argv) > 5 else ''
    }
    
    try:
        # Initialize predictor and generate predictions
        predictor = EmployeeMLPredictor(db_config)
        predictions = predictor.generate_predictions()
        
        # Output results as JSON
        print(json.dumps({
            'success': True,
            'data': predictions,
            'timestamp': datetime.now().isoformat()
        }))
        
    except Exception as e:
        # Output error as JSON
        print(json.dumps({
            'success': False,
            'error': str(e)
        }))
        sys.exit(1)


if __name__ == '__main__':
    main()

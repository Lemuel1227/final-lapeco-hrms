"""
Configuration settings for the ML API service
"""

from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
from typing import List
import os
import json

class Settings(BaseSettings):
    """Application settings"""

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        env_file_encoding="utf-8",
    )
    
    # API Configuration
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    API_DEBUG: bool = False
    
    # CORS Configuration
    allowed_origins_raw: str = Field(
        default="http://localhost,http://localhost:3000,http://localhost:8000,https://yourdomain.com,*",
        alias="ALLOWED_ORIGINS",
    )
    
    # Model Configuration
    MODEL_PATH: str = "models"
    MODEL_CACHE_TTL: int = 3600  # 1 hour
    MIN_TRAINING_SAMPLES: int = 10
    
    # Logging Configuration
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    
    # Security (if needed)
    API_KEY: str = Field(default="", alias="ML_API_KEY")
    
    @property
    def allowed_origins(self) -> List[str]:
        value = self.allowed_origins_raw.strip()
        if not value:
            return []

        # Try JSON first
        if value.startswith("["):
            try:
                parsed = json.loads(value)
                if isinstance(parsed, list):
                    return [str(item).strip() for item in parsed if str(item).strip()]
            except json.JSONDecodeError:
                pass

        # Fallback to comma-delimited parsing
        parts = [item.strip().strip('"').strip("'") for item in value.split(",")]
        return [part for part in parts if part]

# Global settings instance
settings = Settings()

from typing import List, Optional
from pydantic_settings import BaseSettings
import os

class Settings(BaseSettings):
    # Configuración básica
    PROJECT_NAME: str = "Consultorio Dr. Ignacio Córdoba"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Entorno
    ENV: str = "development"
    DEBUG: bool = False
    
    # URLs
    FRONTEND_URL: str = ""
    BACKEND_URL: str = ""
    
    # Base de datos
    DB_HOST: str = ""
    DB_USER: str = ""
    DB_PASSWORD: str = ""
    DB_NAME: str = ""
    DB_PORT: int = 3306
    
    # SSL para DB
    DB_SSL_CA: str = ""
    
    # JWT
    SECRET_KEY: str = ""
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "https://drhernanignaciocordoba.me",
        "http://localhost:3000",
        "https://www.drhernanignaciocordoba.me"
    ]
    
    # Uploads
    UPLOAD_DIR: str = "uploads"
    
    # Propiedad calculada
    @property
    def DATABASE_URL(self) -> str:
        return f"mysql+pymysql://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
    
    class Config:
        env_file = ".env"

settings = Settings()
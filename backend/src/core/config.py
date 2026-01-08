from typing import List
from pydantic_settings import BaseSettings
import os

class Settings(BaseSettings):
    PROJECT_NAME: str = "Consultorio Dr. Ignacio Córdoba"
    VERSION: str = "1.0.0"
    API_V1_STR: str = ""
    
    ENV: str = "development"
    DEBUG: bool = False
    
    FRONTEND_URL: str = ""
    BACKEND_URL: str = ""
    
    DB_HOST: str = ""
    DB_USER: str = ""
    DB_PASSWORD: str = ""
    DB_NAME: str = ""
    DB_PORT: int = 3306
    
    DB_SSL_CA: str = ""
    
    SECRET_KEY: str = ""
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    CORS_ORIGINS: List[str] = [
        "https://drhernanignaciocordoba.me",
        "http://localhost:3000",
        "https://www.drhernanignaciocordoba.me",
        "http://localhost:8000",
        "https://localhost:3000",
        "http://127.0.0.1:3000",
        "https://127.0.0.1:3000"
    ]
    
    @property
    def UPLOAD_DIR(self) -> str:
        if os.environ.get('RENDER'):
            return "/tmp/uploads"
        return "uploads"
    
    @property
    def UPLOAD_URL(self) -> str:
        return "/uploads"
    
    @property
    def DATABASE_URL(self) -> str:
        ssl_ca = f"?ssl_ca={self.DB_SSL_CA}" if self.DB_SSL_CA else ""
        return f"mysql+pymysql://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}{ssl_ca}"
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
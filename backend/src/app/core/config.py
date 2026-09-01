from typing import List, Optional
from pydantic_settings import BaseSettings
import os

class Settings(BaseSettings):
    # Configuración básica
    PROJECT_NAME: str = "Consultorio Dr. Ignacio Córdoba"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    
    # Entorno
    ENV: str = "development"
    DEBUG: bool = False
    
    # URLs
    FRONTEND_URL: str = "https://drhernanignaciocordoba.me"
    BACKEND_URL: str = "https://ignaciocordoba-backend.onrender.com"
    
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
    # 8 horas: cubre una jornada completa. Con 30 min, formularios largos
    # (historia clinica, plan quirurgico) expiraban la sesion a mitad de
    # llenado y el usuario perdia todo lo escrito al ser redirigido a login.
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "https://drhernanignaciocordoba.me",
        "http://localhost:3000",
        "https://www.drhernanignaciocordoba.me"
    ]
    
    # Uploads
    UPLOAD_DIR: str = "uploads"
    
    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
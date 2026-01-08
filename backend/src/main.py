from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

# Cargar variables de entorno PRIMERO
if os.getenv("ENV") != "production":
    from dotenv import load_dotenv
    load_dotenv()

# AHORA importar settings (después de cargar .env)
from app.core.config import settings
from app.api import api_router

# Crear directorios de uploads
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(os.path.join(UPLOAD_DIR, "historias"), exist_ok=True)

# Crear aplicación FastAPI
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=600,
)

# Servir archivos estáticos
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# Incluir router principal con todos los endpoints
app.include_router(api_router, prefix=settings.API_V1_STR)

# Endpoint raíz
@app.get("/")
def root():
    return {
        "message": "API del Consultorio Dr. Ignacio Córdoba",
        "version": settings.VERSION,
        "status": "online"
    }

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "database": "MySQL"
    }
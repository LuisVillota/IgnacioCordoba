from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

if os.getenv("ENV") != "production":
    from dotenv import load_dotenv
    load_dotenv()

from app.core.config import settings
from app.api import api_router

USE_CLOUDINARY = all([
    os.getenv("CLOUDINARY_CLOUD_NAME"),
    os.getenv("CLOUDINARY_API_KEY"),
    os.getenv("CLOUDINARY_API_SECRET")
])

if not USE_CLOUDINARY:
    UPLOAD_DIR = "uploads"
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    os.makedirs(os.path.join(UPLOAD_DIR, "historias"), exist_ok=True)
    os.makedirs(os.path.join(UPLOAD_DIR, "planes"), exist_ok=True)
    print(f"📁 Usando almacenamiento LOCAL en: {UPLOAD_DIR}")
else:
    print(f"☁️ Usando CLOUDINARY para almacenamiento")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url="/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=600,
)

# Solo montar uploads si estamos usando almacenamiento local
if not USE_CLOUDINARY and os.path.exists(UPLOAD_DIR):
    app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")
    print(f"✅ Carpeta /uploads montada en {UPLOAD_DIR}")

app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {
        "message": "API del Consultorio Dr. Ignacio Córdoba",
        "version": settings.VERSION,
        "status": "online",
        "storage": "cloudinary" if USE_CLOUDINARY else "local"
    }

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "database": "MySQL",
        "storage": "cloudinary" if USE_CLOUDINARY else "local",
        "cloudinary_configured": USE_CLOUDINARY
    }
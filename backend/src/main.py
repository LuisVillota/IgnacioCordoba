from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

if os.getenv("ENV") != "production":
    from dotenv import load_dotenv
    load_dotenv()

from app.core.config import settings
from app.api import api_router

UPLOAD_DIR = "uploads" if not os.environ.get('RENDER') else "/tmp/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(os.path.join(UPLOAD_DIR, "historias"), exist_ok=True)

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

app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

app.include_router(api_router, prefix=settings.API_V1_STR)

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
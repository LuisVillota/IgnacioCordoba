from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import logging
import os

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)

if os.getenv("ENV") != "production":
    from dotenv import load_dotenv
    load_dotenv()

from app.core.config import settings
from app.core.security import verify_file_token
from app.api import api_router

if not settings.SECRET_KEY:
    logger.critical("SECRET_KEY no está configurado - los JWT y los tokens de archivos quedarían firmados con una clave vacía")
    raise RuntimeError("SECRET_KEY es obligatorio y no está configurado")

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
    logger.info(f"Usando almacenamiento LOCAL en: {UPLOAD_DIR}")
else:
    logger.info("Usando CLOUDINARY para almacenamiento")

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

if not USE_CLOUDINARY and os.path.exists(UPLOAD_DIR):
    logger.info(f"Sirviendo /uploads (con token firmado) desde: {UPLOAD_DIR}")


@app.get("/uploads/{full_path:path}")
def servir_archivo_subido(full_path: str, t: str = ""):
    """
    Sirve archivos de uploads/ (fotos de historias clínicas, archivos de planes
    quirúrgicos) exigiendo un token firmado (?t=...) en vez de dejar la carpeta
    pública sin autenticación. El token no expira: las URLs quedan guardadas de
    forma permanente en la base de datos.
    """
    safe_path = os.path.normpath(full_path).replace("\\", "/")
    if safe_path.startswith("..") or safe_path.startswith("/"):
        raise HTTPException(status_code=404, detail="Archivo no encontrado")

    if not verify_file_token(safe_path, t):
        raise HTTPException(status_code=403, detail="Token inválido o faltante")

    upload_dir = os.path.abspath("uploads")
    file_path = os.path.realpath(os.path.join(upload_dir, safe_path))

    if not file_path.startswith(os.path.realpath(upload_dir)) or not os.path.isfile(file_path):
        raise HTTPException(status_code=404, detail="Archivo no encontrado")

    return FileResponse(path=file_path)


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
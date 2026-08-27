from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
import os
import uuid
import logging
from datetime import datetime
import shutil

from app.core.security import sign_file_path

logger = logging.getLogger(__name__)

router = APIRouter()

# Configuración de carpeta de uploads
UPLOAD_DIR = "uploads/historias"

@router.post("/historia/{historia_id}")
async def upload_historia_foto(
    historia_id: int,
    file: UploadFile = File(...)
):
    """
    Sube una foto asociada a una historia clínica
    """
    try:
        logger.info(f"Recibiendo upload para historia {historia_id}")
        logger.info(f"Archivo: {file.filename}, tipo: {file.content_type}")
        
        # Validar tipo de archivo (el content-type lo controla el cliente, así que también
        # se exige que la extensión del nombre de archivo sea una de las permitidas)
        allowed_types = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"]
        allowed_extensions = [".jpg", ".jpeg", ".png", ".gif", ".webp"]
        file_ext = os.path.splitext(file.filename or "")[1].lower()
        if file.content_type not in allowed_types or file_ext not in allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"Tipo de archivo no permitido. Solo se permiten imágenes."
            )

        # Validar tamaño (máximo 10MB)
        contents = await file.read()
        file_size = len(contents)
        
        max_size = 10 * 1024 * 1024  # 10MB
        if file_size > max_size:
            raise HTTPException(
                status_code=400,
                detail=f"Archivo demasiado grande. Máximo: 10MB"
            )
        
        # Generar nombre único
        unique_filename = f"{historia_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}{file_ext}"
        file_path = os.path.join(UPLOAD_DIR, unique_filename)
        
        # Guardar archivo
        with open(file_path, "wb") as buffer:
            buffer.write(contents)
        
        # URL del archivo, con token firmado (no expira) para poder usarse en <img src>
        # sin exigir un header Authorization
        relative_path = f"historias/{unique_filename}"
        file_url = f"/uploads/{relative_path}?t={sign_file_path(relative_path)}"
        
        logger.info(f"Archivo guardado en: {file_path}")
        logger.info(f"URL pública: {file_url}")
        
        return {
            "success": True,
            "message": "Foto subida exitosamente",
            "file_url": file_url,
            "filename": unique_filename,
            "original_filename": file.filename,
            "size": file_size,
            "content_type": file.content_type
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error al subir archivo")
        raise HTTPException(
            status_code=500,
            detail=f"Error al subir archivo: {str(e)}"
        )

@router.delete("/historia/{historia_id}/{filename}")
async def delete_historia_foto(historia_id: int, filename: str):
    """
    Elimina una foto de una historia clínica
    """
    try:
        safe_filename = os.path.basename(filename)
        file_path = os.path.join(UPLOAD_DIR, safe_filename)

        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="Archivo no encontrado")
        
        os.remove(file_path)
        
        return {
            "success": True,
            "message": "Foto eliminada exitosamente"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al eliminar archivo: {str(e)}"
        )
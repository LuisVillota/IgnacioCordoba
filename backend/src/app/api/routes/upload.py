from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
import os
import uuid
from datetime import datetime
import shutil

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
        print(f"📤 Recibiendo upload para historia {historia_id}")
        print(f"📁 Archivo: {file.filename}, tipo: {file.content_type}")
        
        # Validar tipo de archivo
        allowed_types = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"]
        if file.content_type not in allowed_types:
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
        file_extension = os.path.splitext(file.filename)[1]
        unique_filename = f"{historia_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}{file_extension}"
        file_path = os.path.join(UPLOAD_DIR, unique_filename)
        
        # Guardar archivo
        with open(file_path, "wb") as buffer:
            buffer.write(contents)
        
        # URL pública del archivo
        file_url = f"/uploads/historias/{unique_filename}"
        
        print(f"✅ Archivo guardado en: {file_path}")
        print(f"🔗 URL pública: {file_url}")
        
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
        import traceback
        traceback.print_exc()
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
        file_path = os.path.join(UPLOAD_DIR, filename)
        
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
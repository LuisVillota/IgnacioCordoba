from fastapi import APIRouter, HTTPException, UploadFile, File
import pymysql
import os
import logging
from datetime import datetime
import cloudinary
import cloudinary.uploader

from app.core.database import get_connection
from app.core.security import sign_file_path
from app.models.schemas.historial_clinico import (
    HistorialClinicoCreate, HistorialClinicoUpdate,
    HistorialClinicoInDB, FileUploadResponse
)

logger = logging.getLogger(__name__)

router = APIRouter()

MYSQL_ERROR_TABLE_NO_EXISTE = 1146


def _tabla_no_existe(e: Exception) -> bool:
    return isinstance(e, pymysql.MySQLError) and bool(e.args) and e.args[0] == MYSQL_ERROR_TABLE_NO_EXISTE

# Configurar Cloudinary
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET")
)

# Verificar si Cloudinary está configurado
USE_CLOUDINARY = all([
    os.getenv("CLOUDINARY_CLOUD_NAME"),
    os.getenv("CLOUDINARY_API_KEY"),
    os.getenv("CLOUDINARY_API_SECRET")
])

# Fallback a almacenamiento local
UPLOAD_DIR = "uploads"
HISTORIAS_DIR = os.path.join(UPLOAD_DIR, "historias")

if not USE_CLOUDINARY:
    os.makedirs(HISTORIAS_DIR, exist_ok=True)

@router.get("/", response_model=dict)
def get_historias_clinicas(limit: int = 100, offset: int = 0):
    """Obtener todas las historias clínicas con paginación"""
    try:
        conn = get_connection()
        with conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT * FROM historial_clinico 
                    ORDER BY fecha_creacion DESC 
                    LIMIT %s OFFSET %s
                """, (limit, offset))
                historias = cursor.fetchall()
                return {"historias": historias}
    except Exception as e:
        if _tabla_no_existe(e):
            return {"historias": []}
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/paciente/{paciente_id}", response_model=list)
def get_historias_by_paciente(paciente_id: int):
    """Obtener historias clínicas de un paciente específico"""
    try:
        conn = get_connection()
        with conn:
            with conn.cursor() as cursor:
                cursor.execute("SELECT id FROM paciente WHERE id = %s", (paciente_id,))
                if not cursor.fetchone():
                    raise HTTPException(status_code=404, detail="Paciente no encontrado")
                
                cursor.execute("""
                    SELECT * FROM historial_clinico 
                    WHERE paciente_id = %s 
                    ORDER BY fecha_creacion DESC
                """, (paciente_id,))
                historias = cursor.fetchall()
                return historias
    except HTTPException:
        raise
    except Exception as e:
        if _tabla_no_existe(e):
            return []
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{historia_id}", response_model=dict)
def get_historia_clinica(historia_id: int):
    """Obtener una historia clínica específica"""
    try:
        conn = get_connection()
        with conn:
            with conn.cursor() as cursor:
                cursor.execute("SELECT * FROM historial_clinico WHERE id = %s", (historia_id,))
                historia = cursor.fetchone()
                if not historia:
                    raise HTTPException(status_code=404, detail="Historia clínica no encontrada")
                return historia
    except HTTPException:
        raise
    except Exception as e:
        if _tabla_no_existe(e):
            raise HTTPException(status_code=404, detail="Historia clínica no encontrada")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/", response_model=dict)
def create_historia_clinica(historia: HistorialClinicoCreate):
    """Crear una nueva historia clínica"""
    try:
        conn = get_connection()
        with conn:
            with conn.cursor() as cursor:
                # Verificar que el paciente existe
                cursor.execute("SELECT id FROM paciente WHERE id = %s", (historia.paciente_id,))
                if not cursor.fetchone():
                    raise HTTPException(status_code=404, detail="Paciente no encontrado")
                
                # Crear historia clínica
                cursor.execute("""
                    INSERT INTO historial_clinico (
                        paciente_id, motivo_consulta, antecedentes_medicos,
                        antecedentes_quirurgicos, antecedentes_alergicos,
                        antecedentes_farmacologicos, exploracion_fisica,
                        diagnostico, tratamiento, recomendaciones, fotos,
                        fecha_creacion
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
                """, (
                    historia.paciente_id,
                    historia.motivo_consulta or "",
                    historia.antecedentes_medicos or "",
                    historia.antecedentes_quirurgicos or "",
                    historia.antecedentes_alergicos or "",
                    historia.antecedentes_farmacologicos or "",
                    historia.exploracion_fisica or "",
                    historia.diagnostico or "",
                    historia.tratamiento or "",
                    historia.recomendaciones or "",
                    historia.fotos or ""
                ))
                historia_id = cursor.lastrowid
                conn.commit()
                
                return {
                    "success": True,
                    "message": "Historia clínica creada exitosamente",
                    "historia_id": historia_id,
                    "id": historia_id
                }
    except HTTPException:
        raise
    except Exception as e:
        if _tabla_no_existe(e):
            raise HTTPException(status_code=500, detail="Tabla de historias clínicas no existe.")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{historia_id}", response_model=dict)
def update_historia_clinica(historia_id: int, historia: HistorialClinicoUpdate):
    """Actualizar una historia clínica existente"""
    try:
        conn = get_connection()
        with conn:
            with conn.cursor() as cursor:
                # Verificar que la historia existe
                cursor.execute("SELECT id FROM historial_clinico WHERE id = %s", (historia_id,))
                if not cursor.fetchone():
                    raise HTTPException(status_code=404, detail="Historia clínica no encontrada")
                
                # Verificar que el paciente existe
                cursor.execute("SELECT id FROM paciente WHERE id = %s", (historia.paciente_id,))
                if not cursor.fetchone():
                    raise HTTPException(status_code=404, detail="Paciente no encontrado")
                
                # Actualizar historia clínica
                cursor.execute("""
                    UPDATE historial_clinico SET
                        paciente_id = %s,
                        motivo_consulta = %s,
                        antecedentes_medicos = %s,
                        antecedentes_quirurgicos = %s,
                        antecedentes_alergicos = %s,
                        antecedentes_farmacologicos = %s,
                        exploracion_fisica = %s,
                        diagnostico = %s,
                        tratamiento = %s,
                        recomendaciones = %s,
                        fotos = %s
                    WHERE id = %s
                """, (
                    historia.paciente_id,
                    historia.motivo_consulta or "",
                    historia.antecedentes_medicos or "",
                    historia.antecedentes_quirurgicos or "",
                    historia.antecedentes_alergicos or "",
                    historia.antecedentes_farmacologicos or "",
                    historia.exploracion_fisica or "",
                    historia.diagnostico or "",
                    historia.tratamiento or "",
                    historia.recomendaciones or "",
                    historia.fotos or "",
                    historia_id
                ))
                conn.commit()
                
                return {
                    "success": True,
                    "message": "Historia clínica actualizada exitosamente",
                    "historia_id": historia_id
                }
    except HTTPException:
        raise
    except Exception as e:
        if _tabla_no_existe(e):
            raise HTTPException(status_code=404, detail="Historia clínica no encontrada")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{historia_id}", response_model=dict)
def delete_historia_clinica(historia_id: int):
    """Eliminar una historia clínica y sus fotos asociadas"""
    try:
        conn = get_connection()
        with conn:
            with conn.cursor() as cursor:
                # Obtener la historia con sus fotos
                cursor.execute("SELECT fotos FROM historial_clinico WHERE id = %s", (historia_id,))
                historia = cursor.fetchone()
                if not historia:
                    raise HTTPException(status_code=404, detail="Historia clínica no encontrada")
                
                # Eliminar archivos
                if historia['fotos']:
                    fotos = historia['fotos'].split(',')
                    for foto_url in fotos:
                        foto_url = foto_url.strip()
                        
                        if USE_CLOUDINARY and 'cloudinary.com' in foto_url:
                            # Eliminar de Cloudinary
                            try:
                                # Extraer public_id de la URL
                                parts = foto_url.split('/')
                                if 'historias' in parts:
                                    idx = parts.index('historias')
                                    if idx + 1 < len(parts):
                                        filename = parts[idx + 1].split('.')[0]
                                        public_id = f"historias/{filename}"
                                        cloudinary.uploader.destroy(public_id)
                                        logger.info(f"Eliminado de Cloudinary: {public_id}")
                            except Exception as e:
                                logger.error(f"Error eliminando de Cloudinary: {e}")

                        elif foto_url.startswith('/uploads/'):
                            # Eliminar archivo local, restringido a HISTORIAS_DIR
                            # (la URL guardada puede traer ?t=<token firmado> al final)
                            safe_name = os.path.basename(foto_url.split('?')[0])
                            file_path = os.path.join(HISTORIAS_DIR, safe_name)
                            resolved = os.path.realpath(file_path)
                            if resolved.startswith(os.path.realpath(HISTORIAS_DIR)) and os.path.exists(resolved):
                                try:
                                    os.remove(resolved)
                                    logger.info(f"Eliminado archivo local: {resolved}")
                                except Exception as e:
                                    logger.error(f"Error eliminando archivo local: {e}")
                
                # Eliminar registro de la base de datos
                cursor.execute("DELETE FROM historial_clinico WHERE id = %s", (historia_id,))
                conn.commit()
                
                return {
                    "success": True,
                    "message": "Historia clínica eliminada exitosamente",
                    "historia_id": historia_id
                }
                
    except HTTPException:
        raise
    except Exception as e:
        if _tabla_no_existe(e):
            raise HTTPException(status_code=404, detail="Historia clínica no encontrada")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{historia_id}/foto", response_model=FileUploadResponse)
async def upload_historia_foto(
    historia_id: int,
    file: UploadFile = File(...)
):
    """
    Subir una foto a una historia clínica.
    Usa Cloudinary si está configurado, sino almacenamiento local.
    """
    try:
        # Verificar que la historia existe
        conn = get_connection()
        with conn:
            with conn.cursor() as cursor:
                cursor.execute("SELECT id FROM historial_clinico WHERE id = %s", (historia_id,))
                if not cursor.fetchone():
                    raise HTTPException(status_code=404, detail="Historia clínica no encontrada")


        # Validar tipo de archivo
        allowed_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'}
        file_ext = os.path.splitext(file.filename or "unknown.jpg")[1].lower()
        if file_ext not in allowed_extensions:
            raise HTTPException(
                status_code=400, 
                detail="Tipo de archivo no permitido. Use JPG, PNG, GIF, BMP o WebP."
            )
        
        # Validar tamaño
        max_size = 10 * 1024 * 1024  # 10MB
        content = await file.read()
        if len(content) > max_size:
            raise HTTPException(
                status_code=400, 
                detail="El archivo es demasiado grande. Máximo 10MB."
            )
        
        # Generar nombre: si es esquema, usar nombre original exacto; si no, agregar timestamp
        original_name = os.path.basename(os.path.splitext(file.filename or "")[0])
        if original_name.startswith("esquema_"):
            filename = original_name
        else:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S_%f')
            filename = f"historia_{historia_id}_{timestamp}"
        
        if USE_CLOUDINARY:
            # ========== CLOUDINARY ==========
            logger.info(f"Subiendo a Cloudinary: {filename}")

            import tempfile
            # Crear archivo temporal
            with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as tmp_file:
                tmp_file.write(content)
                tmp_path = tmp_file.name

            try:
                # Subir a Cloudinary
                upload_result = cloudinary.uploader.upload(
                    tmp_path,
                    folder="historias",
                    public_id=filename,
                    resource_type="image"
                )

                file_url = upload_result['secure_url']
                logger.info(f"Subido a Cloudinary: {file_url}")

            finally:
                # Limpiar archivo temporal
                if os.path.exists(tmp_path):
                    os.remove(tmp_path)

        else:
            # ========== ALMACENAMIENTO LOCAL ==========
            logger.info(f"Guardando localmente: {filename}{file_ext}")
            file_path = os.path.join(HISTORIAS_DIR, f"{filename}{file_ext}")

            with open(file_path, "wb") as buffer:
                buffer.write(content)

            if not os.path.exists(file_path):
                raise HTTPException(
                    status_code=500,
                    detail="Error al guardar el archivo en el servidor"
                )

            relative_path = f"historias/{filename}{file_ext}"
            file_url = f"/uploads/{relative_path}?t={sign_file_path(relative_path)}"
            logger.info(f"Guardado localmente: {file_path}")

        logger.info(f"URL final: {file_url}")
        
        return FileUploadResponse(
            success=True,
            message="Foto subida exitosamente",
            url=file_url,
            filename=f"{filename}{file_ext}"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error subiendo archivo")
        raise HTTPException(status_code=500, detail=f"Error subiendo archivo: {str(e)}")
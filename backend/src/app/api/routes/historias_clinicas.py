from fastapi import APIRouter, HTTPException, UploadFile, File
import pymysql
import os
from datetime import datetime

from app.core.database import get_connection
from app.models.schemas.historial_clinico import (
    HistorialClinicoCreate, HistorialClinicoUpdate, 
    HistorialClinicoInDB, FileUploadResponse
)

router = APIRouter()

UPLOAD_DIR = "uploads"
HISTORIAS_DIR = os.path.join(UPLOAD_DIR, "historias")

# Asegurar que el directorio existe
os.makedirs(HISTORIAS_DIR, exist_ok=True)

@router.get("/", response_model=dict)
def get_historias_clinicas(limit: int = 100, offset: int = 0):
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
        if "Table 'u997398721_consultorio_db.historial_clinico' doesn't exist" in str(e):
            return {"historias": []}
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/paciente/{paciente_id}", response_model=list)
def get_historias_by_paciente(paciente_id: int):
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
        if "Table 'u997398721_consultorio_db.historial_clinico' doesn't exist" in str(e):
            return []
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{historia_id}", response_model=dict)
def get_historia_clinica(historia_id: int):
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
        if "Table 'u997398721_consultorio_db.historial_clinico' doesn't exist" in str(e):
            raise HTTPException(status_code=404, detail="Historia clínica no encontrada")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/", response_model=dict)
def create_historia_clinica(historia: HistorialClinicoCreate):
    try:
        conn = get_connection()
        with conn:
            with conn.cursor() as cursor:
                # Verificar que el paciente existe
                cursor.execute("SELECT id FROM paciente WHERE id = %s", (historia.paciente_id,))
                if not cursor.fetchone():
                    raise HTTPException(status_code=404, detail="Paciente no encontrado")
                
                # Crear historia clínica (sin fotos inicialmente)
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
        if "Table 'u997398721_consultorio_db.historial_clinico' doesn't exist" in str(e):
            raise HTTPException(status_code=500, detail="Tabla de historias clínicas no existe.")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{historia_id}", response_model=dict)
def update_historia_clinica(historia_id: int, historia: HistorialClinicoUpdate):
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
        if "Table 'u997398721_consultorio_db.historial_clinico' doesn't exist" in str(e):
            raise HTTPException(status_code=404, detail="Historia clínica no encontrada")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{historia_id}", response_model=dict)
def delete_historia_clinica(historia_id: int):
    try:
        conn = get_connection()
        with conn:
            with conn.cursor() as cursor:
                # Verificar que la historia existe
                cursor.execute("SELECT fotos FROM historial_clinico WHERE id = %s", (historia_id,))
                historia = cursor.fetchone()
                if not historia:
                    raise HTTPException(status_code=404, detail="Historia clínica no encontrada")
                
                # Eliminar archivos físicos si existen
                if historia['fotos']:
                    fotos = historia['fotos'].split(',')
                    for foto_url in fotos:
                        foto_url = foto_url.strip()
                        if foto_url.startswith('/uploads/'):
                            file_path = foto_url[1:]  # Remover el '/' inicial
                            if os.path.exists(file_path):
                                try:
                                    os.remove(file_path)
                                except Exception as e:
                                    print(f"Error eliminando archivo {file_path}: {e}")
                
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
        if "Table 'u997398721_consultorio_db.historial_clinico' doesn't exist" in str(e):
            raise HTTPException(status_code=404, detail="Historia clínica no encontrada")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{historia_id}/foto", response_model=FileUploadResponse)
async def upload_historia_foto(
    historia_id: int,
    file: UploadFile = File(...)
):
    """
    Endpoint dedicado para subir fotos a una historia clínica específica.
    La URL generada se retorna para que el frontend la agregue a la lista de fotos.
    """
    try:
        # 1. Verificar que la historia existe
        conn = get_connection()
        with conn.cursor() as cursor:
            cursor.execute("SELECT id FROM historial_clinico WHERE id = %s", (historia_id,))
            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="Historia clínica no encontrada")
        conn.close()
        
        # 2. Validar tipo de archivo
        allowed_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'}
        file_ext = os.path.splitext(file.filename or "unknown.jpg")[1].lower()
        if file_ext not in allowed_extensions:
            raise HTTPException(
                status_code=400, 
                detail="Tipo de archivo no permitido. Use JPG, PNG, GIF, BMP o WebP."
            )
        
        # 3. Validar tamaño del archivo
        max_size = 10 * 1024 * 1024  # 10MB
        content = await file.read()
        if len(content) > max_size:
            raise HTTPException(
                status_code=400, 
                detail="El archivo es demasiado grande. Máximo 10MB."
            )
        
        # 4. Generar nombre único para el archivo
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S_%f')
        filename = f"historia_{historia_id}_{timestamp}{file_ext}"
        file_path = os.path.join(HISTORIAS_DIR, filename)
        
        # 5. Guardar el archivo
        with open(file_path, "wb") as buffer:
            buffer.write(content)
        
        # 6. Verificar que se guardó correctamente
        if not os.path.exists(file_path):
            raise HTTPException(
                status_code=500, 
                detail="Error al guardar el archivo en el servidor"
            )
        
        # 7. Generar URL pública
        file_url = f"/uploads/historias/{filename}"
        
        print(f"✅ Foto guardada exitosamente: {file_path}")
        print(f"🔗 URL pública: {file_url}")
        
        # 8. Retornar la URL (el frontend la agregará a la lista)
        return FileUploadResponse(
            success=True,
            message="Foto subida exitosamente",
            url=file_url,
            filename=filename
        )
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error subiendo archivo: {str(e)}")
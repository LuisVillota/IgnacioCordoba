from fastapi import APIRouter, HTTPException, UploadFile, File
import pymysql
import os
from datetime import datetime
import uuid

from app.core.database import get_connection
from app.models.schemas.historial_clinico import (
    HistorialClinicoCreate, HistorialClinicoUpdate, 
    HistorialClinicoInDB, FileUploadResponse
)

router = APIRouter()

UPLOAD_DIR = "uploads"
HISTORIAS_DIR = os.path.join(UPLOAD_DIR, "historias")

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
                cursor.execute("SELECT id FROM paciente WHERE id = %s", (historia.paciente_id,))
                if not cursor.fetchone():
                    raise HTTPException(status_code=404, detail="Paciente no encontrado")
                
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
                    ""
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
                cursor.execute("SELECT id FROM historial_clinico WHERE id = %s", (historia_id,))
                if not cursor.fetchone():
                    raise HTTPException(status_code=404, detail="Historia clínica no encontrada")
                
                cursor.execute("SELECT id FROM paciente WHERE id = %s", (historia.paciente_id,))
                if not cursor.fetchone():
                    raise HTTPException(status_code=404, detail="Paciente no encontrado")
                
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
                        recomendaciones = %s
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
                cursor.execute("SELECT id FROM historial_clinico WHERE id = %s", (historia_id,))
                if not cursor.fetchone():
                    raise HTTPException(status_code=404, detail="Historia clínica no encontrada")
                
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

@router.post("/upload/historia/{historia_id}", response_model=FileUploadResponse)
async def upload_historia_foto(
    historia_id: int,
    file: UploadFile = File(...)
):
    """
    🔴 ENDPOINT CORREGIDO PARA SUBIR FOTOS
    Sube una foto para una historia clínica y la guarda en la base de datos
    """
    print(f"📸 Iniciando subida de foto para historia {historia_id}")
    print(f"📁 Archivo recibido: {file.filename}, tipo: {file.content_type}")
    
    conn = None
    try:
        # 1️⃣ VERIFICAR QUE LA HISTORIA EXISTA
        try:
            conn = get_connection()
            with conn.cursor() as cursor:
                cursor.execute("SELECT id, fotos FROM historial_clinico WHERE id = %s", (historia_id,))
                resultado = cursor.fetchone()
                if not resultado:
                    raise HTTPException(status_code=404, detail="Historia clínica no encontrada")
                
                fotos_actuales = resultado.get('fotos', '') or ''
                print(f"📋 Fotos actuales en BD: '{fotos_actuales}'")
        except Exception as db_error:
            print(f"❌ Error verificando historia: {db_error}")
            raise HTTPException(status_code=500, detail=f"Error base de datos: {str(db_error)}")
        finally:
            if conn:
                conn.close()
        
        # 2️⃣ VALIDAR TIPO DE ARCHIVO
        allowed_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'}
        file_ext = os.path.splitext(file.filename or "unknown.jpg")[1].lower()
        if file_ext not in allowed_extensions:
            raise HTTPException(
                status_code=400, 
                detail="Tipo de archivo no permitido. Use JPG, PNG, GIF, BMP o WebP."
            )
        
        # 3️⃣ VALIDAR TAMAÑO
        max_size = 10 * 1024 * 1024  # 10MB
        content = await file.read()
        if len(content) > max_size:
            raise HTTPException(
                status_code=400, 
                detail="El archivo es demasiado grande. Máximo 10MB."
            )
        
        # 4️⃣ GENERAR NOMBRE ÚNICO PARA EL ARCHIVO
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        unique_id = uuid.uuid4().hex[:8]
        filename = f"{historia_id}_{timestamp}_{unique_id}{file_ext}"
        
        # 5️⃣ CREAR DIRECTORIO SI NO EXISTE
        os.makedirs(HISTORIAS_DIR, exist_ok=True)
        file_path = os.path.join(HISTORIAS_DIR, filename)
        
        print(f"💾 Guardando archivo en: {file_path}")
        
        # 6️⃣ GUARDAR ARCHIVO EN DISCO
        with open(file_path, "wb") as buffer:
            buffer.write(content)
        
        # 7️⃣ VERIFICAR QUE SE GUARDÓ
        if not os.path.exists(file_path):
            raise HTTPException(
                status_code=500, 
                detail="Error al guardar el archivo en el servidor"
            )
        
        file_size = os.path.getsize(file_path)
        print(f"✅ Archivo guardado exitosamente ({file_size} bytes)")
        
        # 8️⃣ CONSTRUIR URL (RELATIVA)
        file_url = f"/uploads/historias/{filename}"
        print(f"🔗 URL generada: {file_url}")
        
        # 9️⃣ ACTUALIZAR BASE DE DATOS
        conn2 = None
        try:
            conn2 = get_connection()
            with conn2.cursor() as cursor:
                # Obtener fotos actuales nuevamente
                cursor.execute("SELECT fotos FROM historial_clinico WHERE id = %s", (historia_id,))
                resultado = cursor.fetchone()
                fotos_actuales = resultado.get('fotos', '') if resultado else ''
                
                # Limpiar fotos_actuales (eliminar espacios y comas extra)
                if fotos_actuales:
                    fotos_actuales = fotos_actuales.strip()
                
                # Construir nueva lista de URLs
                if fotos_actuales and fotos_actuales != '':
                    # Dividir por comas, limpiar y filtrar vacíos
                    urls_existentes = [url.strip() for url in fotos_actuales.split(',') if url.strip()]
                    # Agregar nueva URL
                    urls_existentes.append(file_url)
                    nuevas_fotos = ','.join(urls_existentes)
                else:
                    nuevas_fotos = file_url
                
                print(f"📝 Actualizando BD con URLs: '{nuevas_fotos}'")
                
                # Actualizar en base de datos
                cursor.execute(
                    "UPDATE historial_clinico SET fotos = %s WHERE id = %s",
                    (nuevas_fotos, historia_id)
                )
                affected_rows = cursor.rowcount
                conn2.commit()
                
                print(f"✅ BD actualizada. Filas afectadas: {affected_rows}")
                
                if affected_rows == 0:
                    print("⚠️ ADVERTENCIA: No se actualizó ninguna fila")
                
                # 🔴 VERIFICAR QUE SE GUARDÓ CORRECTAMENTE
                cursor.execute("SELECT fotos FROM historial_clinico WHERE id = %s", (historia_id,))
                verificacion = cursor.fetchone()
                fotos_guardadas = verificacion.get('fotos', '') if verificacion else ''
                print(f"🔍 Verificación - Fotos en BD después de guardar: '{fotos_guardadas}'")
                
                if file_url not in fotos_guardadas:
                    print(f"❌ ERROR CRÍTICO: La URL {file_url} NO se guardó en la BD!")
                    raise HTTPException(
                        status_code=500,
                        detail="La foto se subió pero no se guardó en la base de datos"
                    )
                
        except Exception as update_error:
            print(f"❌ Error actualizando BD: {update_error}")
            import traceback
            traceback.print_exc()
            raise HTTPException(
                status_code=500,
                detail=f"Error actualizando base de datos: {str(update_error)}"
            )
        finally:
            if conn2:
                conn2.close()
        
        # 🔟 RETORNAR RESPUESTA EXITOSA
        print(f"🎉 Proceso completado exitosamente")
        return FileUploadResponse(
            success=True,
            message="Foto subida y guardada exitosamente",
            url=file_url, 
            filename=filename
        )
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"❌ Error inesperado: {e}")
        traceback.print_exc()
        raise HTTPException(
            status_code=500, 
            detail=f"Error subiendo archivo: {str(e)}"
        )
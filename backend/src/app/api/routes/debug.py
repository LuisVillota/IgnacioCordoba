from fastapi import APIRouter, HTTPException
from datetime import datetime
import os

from app.core.database import get_connection
from app.core.config import settings

router = APIRouter()

@router.get("/upload-dir", response_model=dict)
def debug_upload_dir():
    """
    Debug: Verificar estado del directorio de uploads
    """
    upload_dir = os.path.abspath(settings.UPLOAD_DIR)
    historias_dir = os.path.join(upload_dir, "historias")
    
    return {
        "upload_dir": upload_dir,
        "historias_dir": historias_dir,
        "upload_dir_exists": os.path.exists(upload_dir),
        "historias_dir_exists": os.path.exists(historias_dir),
        "current_working_dir": os.getcwd(),
        "permissions": {
            "upload_dir_writable": os.access(upload_dir, os.W_OK) if os.path.exists(upload_dir) else False,
            "historias_dir_writable": os.access(historias_dir, os.W_OK) if os.path.exists(historias_dir) else False
        },
        "files_in_historias_dir": os.listdir(historias_dir) if os.path.exists(historias_dir) else []
    }

@router.get("/sala-espera", response_model=dict)
def debug_sala_espera():
    """
    Debug: Verificar estado de la sala de espera
    """
    try:
        conn = get_connection()
        with conn:
            with conn.cursor() as cursor:
                hoy = datetime.now().strftime('%Y-%m-%d')
                
                cursor.execute("SHOW TABLES LIKE '%sala%'")
                tablas_sala = cursor.fetchall()
                
                cursor.execute("""
                    SELECT COUNT(*) as total FROM sala_espera 
                    WHERE DATE(fecha_hora_ingreso) = %s
                """, (hoy,))
                registros_hoy = cursor.fetchone()
                
                cursor.execute("""
                    SELECT 
                        se.id,
                        se.paciente_id,
                        p.nombre,
                        p.apellido,
                        COALESCE(ese.nombre, 'pendiente') as estado,
                        se.fecha_hora_ingreso,
                        se.fecha_hora_cambio_estado,
                        se.tiempo_espera_minutos,
                        se.tiene_cita_hoy,
                        se.hora_cita_programada
                    FROM sala_espera se
                    LEFT JOIN paciente p ON se.paciente_id = p.id
                    LEFT JOIN estado_sala_espera ese ON se.estado_id = ese.id
                    ORDER BY se.fecha_hora_ingreso DESC
                    LIMIT 10
                """)
                ultimos_registros = cursor.fetchall()
                
                cursor.execute("SELECT * FROM estado_sala_espera ORDER BY orden")
                estados = cursor.fetchall()
                
                cursor.execute("DESCRIBE sala_espera")
                estructura = cursor.fetchall()
                
                return {
                    "tablas_disponibles": [tabla[f"Tables_in_{settings.DB_NAME.lower()} (%sala%)"] for tabla in tablas_sala],
                    "registros_hoy": registros_hoy['total'],
                    "estados_disponibles": estados,
                    "ultimos_registros": ultimos_registros,
                    "estructura_sala_espera": estructura,
                    "fecha_actual": hoy
                }
    except Exception as e:
        return {"error": str(e), "tablas": []}

@router.get("/test-file-existence", response_model=dict)
def test_file_existence():
    """
    Test para verificar si los archivos existen realmente
    """
    import os
    
    posibles_archivos = [
        "esquemas-corporales.pdf",
        "esquemas-corporales.png",
        "example.pdf",
        "test.jpg"
    ]
    
    upload_dir = os.path.join(os.path.dirname(__file__), "..", "..", "..", settings.UPLOAD_DIR)
    
    results = []
    for archivo in posibles_archivos:
        file_path = os.path.join(upload_dir, archivo)
        exists = os.path.exists(file_path)
        results.append({
            "archivo": archivo,
            "existe": exists,
            "ruta": file_path,
            "ruta_absoluta": os.path.abspath(file_path) if exists else None
        })
    
    contenido = []
    if os.path.exists(upload_dir):
        contenido = os.listdir(upload_dir)
    
    return {
        "directorio_actual": os.getcwd(),
        "directorio_script": os.path.dirname(__file__),
        "upload_dir": upload_dir,
        "upload_dir_exists": os.path.exists(upload_dir),
        "resultados": results,
        "contenido_uploads": contenido
    }

@router.get("/endpoints", response_model=dict)
def debug_endpoints():
    """
    Listar todos los endpoints disponibles
    """
    from fastapi import FastAPI
    from main import app
    
    routes = []
    for route in app.routes:
        routes.append({
            "path": route.path,
            "name": route.name,
            "methods": getattr(route, "methods", None)
        })
    
    return {"endpoints": routes}
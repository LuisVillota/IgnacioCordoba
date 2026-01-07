from fastapi import APIRouter, HTTPException
from datetime import datetime
import pymysql
import os
from typing import List, Dict, Any

from app.core.database import get_connection
from app.core.config import settings

router = APIRouter()

@router.get("/health")
def health_check():
    return {"status": "healthy", "database": "MySQL"}

@router.get("/health-check")
async def health_check_fast():
    try:
        conn = get_connection()
        conn.ping(reconnect=True)
        conn.close()
        return {
            "status": "healthy",
            "database": "connected",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e)[:100],  
            "timestamp": datetime.now().isoformat()
        }

@router.get("/dashboard/quick-counts")
def get_quick_counts():
    """Endpoint SUPER rápido solo para conteos"""
    try:
        conn = get_connection()
        with conn:
            with conn.cursor() as cursor:
                # 1. Contar pacientes (solo COUNT, sin traer datos)
                cursor.execute("SELECT COUNT(*) as total FROM paciente")
                pacientes_total = cursor.fetchone()['total']
                
                # 2. Contar citas de hoy (solo COUNT)
                hoy = datetime.now().strftime('%Y-%m-%d')
                cursor.execute("""
                    SELECT COUNT(*) as total 
                    FROM cita 
                    WHERE DATE(fecha_hora) = %s
                """, (hoy,))
                citas_hoy = cursor.fetchone()['total']
                
                return {
                    "success": True,
                    "pacientes_total": pacientes_total,
                    "citas_hoy": citas_hoy,
                    "timestamp": datetime.now().isoformat()
                }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "pacientes_total": 0,
            "citas_hoy": 0
        }

@router.get("/debug/endpoints")
def debug_endpoints():
    """Devuelve todos los endpoints disponibles"""
    from fastapi import FastAPI
    from main import app as main_app
    
    routes = []
    for route in main_app.routes:
        routes.append({
            "path": route.path,
            "name": route.name,
            "methods": getattr(route, "methods", None)
        })
    
    return {"endpoints": routes}

@router.get("/test-frontend")
def test_frontend():
    try:
        conn = get_connection()
        with conn:
            with conn.cursor() as cursor:
                cursor.execute("SELECT COUNT(*) as count FROM paciente")
                pacientes_count = cursor.fetchone()['count']
                
                cursor.execute("SELECT COUNT(*) as count FROM usuario")
                usuarios_count = cursor.fetchone()['count']
                
                cursor.execute("SELECT COUNT(*) as count FROM cita")
                citas_count = cursor.fetchone()['count']
                
                try:
                    cursor.execute("SELECT COUNT(*) as count FROM historial_clinico")
                    historias_count = cursor.fetchone()['count']
                    historias_disponible = True
                except:
                    historias_count = 0
                    historias_disponible = False
                
                try:
                    cursor.execute("SELECT COUNT(*) as count FROM estado_sala_espera")
                    estados_sala_count = cursor.fetchone()['count']
                    cursor.execute("SELECT COUNT(*) as count FROM sala_espera WHERE DATE(fecha_hora_ingreso) = CURDATE()")
                    sala_hoy_count = cursor.fetchone()['count']
                    sala_espera_disponible = True
                except:
                    estados_sala_count = 0
                    sala_hoy_count = 0
                    sala_espera_disponible = False
        
        endpoints_disponibles = [
            "/api/usuarios",
            "/api/login",
            "/api/pacientes",
            "/api/pacientes/{id}",
            "/api/citas",
            "/api/citas/{id}",
            "/api/estados/citas",
            "/api/estados/quirurgicos",
            "/api/procedimientos",
            "/api/procedimientos/{id}",
            "/api/adicionales",
            "/api/adicionales/{id}",
            "/api/otros-adicionales",
            "/api/otros-adicionales/{id}",
            "/api/historias-clinicas",
            "/api/historias-clinicas/paciente/{id}",
            "/api/historias-clinicas/{id}",
            "/api/upload/historia/{id}",
            "/api/debug/upload-dir",
            "/api/debug/sala-espera",
            "/api/test-frontend"
        ]
        
        if sala_espera_disponible:
            endpoints_disponibles.extend([
                "/api/sala-espera",
                "/api/sala-espera/{paciente_id}/estado",
                "/api/sala-espera/bulk-estados",
                "/api/sala-espera/estadisticas"
            ])
        
        return {
            "success": True,
            "message": "Backend funcionando correctamente",
            "frontend_url": settings.FRONTEND_URL,
            "backend_url": settings.BACKEND_URL,
            "database": "MySQL - u997398721_consultorio_db",
            "timestamp": datetime.now().isoformat(),
            "counts": {
                "pacientes": pacientes_count,
                "usuarios": usuarios_count,
                "citas": citas_count,
                "historias_clinicas": historias_count,
                "estados_sala_espera": estados_sala_count,
                "sala_espera_hoy": sala_hoy_count
            },
            "modulos_activos": {
                "historias_clinicas": historias_disponible,
                "sala_espera": sala_espera_disponible
            },
            "endpoints_disponibles": endpoints_disponibles
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Error en el backend: {str(e)}",
            "timestamp": datetime.now().isoformat()
        }

@router.get("/debug/database-status")
def debug_database_status():
    """Verifica el estado de todas las tablas importantes"""
    try:
        conn = get_connection()
        with conn:
            with conn.cursor() as cursor:
                # Listar tablas
                cursor.execute("SHOW TABLES")
                tables = cursor.fetchall()
                
                table_status = []
                for table in tables:
                    table_name = list(table.values())[0]
                    
                    # Contar registros
                    try:
                        cursor.execute(f"SELECT COUNT(*) as count FROM {table_name}")
                        count_result = cursor.fetchone()
                        count = count_result['count'] if count_result else 0
                    except:
                        count = "ERROR"
                    
                    # Verificar estructura
                    try:
                        cursor.execute(f"DESCRIBE {table_name}")
                        structure = cursor.fetchall()
                        columns = len(structure)
                    except:
                        columns = "ERROR"
                        structure = []
                    
                    table_status.append({
                        "table": table_name,
                        "records": count,
                        "columns": columns,
                        "healthy": count != "ERROR" and columns != "ERROR"
                    })
                
                return {
                    "success": True,
                    "database": settings.DB_NAME,
                    "tables": table_status,
                    "total_tables": len(table_status)
                }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "database": settings.DB_NAME
        }

@router.get("/debug/connection-pool")
def debug_connection_pool():
    """Verifica el estado de las conexiones a la base de datos"""
    try:
        conn = get_connection()
        with conn:
            with conn.cursor() as cursor:
                # Obtener información del servidor
                cursor.execute("SELECT VERSION() as version")
                version = cursor.fetchone()['version']
                
                cursor.execute("SHOW VARIABLES LIKE 'max_connections'")
                max_conn = cursor.fetchone()
                
                cursor.execute("SHOW STATUS LIKE 'Threads_connected'")
                threads_conn = cursor.fetchone()
                
                cursor.execute("SHOW PROCESSLIST")
                processes = cursor.fetchall()
                
                return {
                    "success": True,
                    "server_version": version,
                    "max_connections": max_conn['Value'] if max_conn else "N/A",
                    "current_connections": threads_conn['Value'] if threads_conn else "N/A",
                    "active_processes": len(processes),
                    "connection_details": {
                        "host": settings.DB_HOST,
                        "port": settings.DB_PORT,
                        "database": settings.DB_NAME,
                        "user": settings.DB_USER[:3] + "***"  # Ocultar por seguridad
                    }
                }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "connection_details": {
                "host": settings.DB_HOST,
                "port": settings.DB_PORT,
                "database": settings.DB_NAME
            }
        }

@router.get("/debug/environment")
def debug_environment():
    """Muestra variables de entorno (sin contraseñas)"""
    env_vars = {}
    for key, value in os.environ.items():
        if "DB" in key or "API" in key or "URL" in key:
            # Ocultar valores sensibles
            if "PASSWORD" in key or "SECRET" in key or "KEY" in key:
                env_vars[key] = "********"
            else:
                env_vars[key] = value
    
    return {
        "environment": os.getenv("ENV", "development"),
        "python_version": os.sys.version,
        "working_directory": os.getcwd(),
        "environment_variables": env_vars,
        "upload_directory": settings.UPLOAD_DIR,
        "upload_directory_exists": os.path.exists(settings.UPLOAD_DIR)
    }

@router.get("/debug/memory-usage")
def debug_memory_usage():
    """Muestra uso de memoria del servidor"""
    import psutil
    import resource
    
    process = psutil.Process()
    memory_info = process.memory_info()
    
    return {
        "memory_rss_mb": memory_info.rss / 1024 / 1024,
        "memory_vms_mb": memory_info.vms / 1024 / 1024,
        "memory_percent": process.memory_percent(),
        "cpu_percent": process.cpu_percent(),
        "open_files": len(process.open_files()),
        "threads": process.num_threads(),
        "system_memory": {
            "total_mb": psutil.virtual_memory().total / 1024 / 1024,
            "available_mb": psutil.virtual_memory().available / 1024 / 1024,
            "percent_used": psutil.virtual_memory().percent
        }
    }

@router.get("/ping")
def ping():
    """Endpoint simple para verificar que la API está viva"""
    return {
        "status": "pong",
        "timestamp": datetime.now().isoformat(),
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION
    }

@router.get("/status")
def system_status():
    """Estado completo del sistema"""
    try:
        # Verificar base de datos
        db_status = "healthy"
        try:
            conn = get_connection()
            conn.ping(reconnect=True)
            conn.close()
        except:
            db_status = "unhealthy"
        
        # Verificar directorios
        upload_dir_status = "healthy" if os.path.exists(settings.UPLOAD_DIR) else "missing"
        
        # Verificar espacio en disco
        import shutil
        disk_usage = shutil.disk_usage("/")
        disk_status = "healthy" if (disk_usage.free / disk_usage.total) > 0.1 else "low_space"
        
        return {
            "status": "operational",
            "timestamp": datetime.now().isoformat(),
            "components": {
                "database": db_status,
                "upload_directory": upload_dir_status,
                "disk_space": disk_status,
                "api": "healthy"
            },
            "resources": {
                "disk_free_gb": round(disk_usage.free / (1024**3), 2),
                "disk_total_gb": round(disk_usage.total / (1024**3), 2),
                "disk_percent_free": round((disk_usage.free / disk_usage.total) * 100, 2)
            }
        }
    except Exception as e:
        return {
            "status": "degraded",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }

@router.get("/info")
def system_info():
    """Información del sistema"""
    import platform
    import socket
    
    return {
        "system": {
            "platform": platform.platform(),
            "python_version": platform.python_version(),
            "hostname": socket.gethostname(),
            "processor": platform.processor()
        },
        "application": {
            "name": settings.PROJECT_NAME,
            "version": settings.VERSION,
            "api_version": settings.API_V1_STR,
            "environment": os.getenv("ENV", "development")
        },
        "urls": {
            "frontend": settings.FRONTEND_URL,
            "backend": settings.BACKEND_URL,
            "api_docs": f"{settings.BACKEND_URL}{settings.API_V1_STR}/docs"
        }
    }
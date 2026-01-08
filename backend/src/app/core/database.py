# backend/src/app/core/database.py
import pymysql
import os
from functools import lru_cache
from .config import settings

@lru_cache(maxsize=1)
def get_connection_config():
    """
    ⚡ OPTIMIZACIÓN: Cache de configuración de conexión
    
    Se ejecuta UNA SOLA VEZ y guarda el resultado en memoria.
    Esto mejora significativamente el rendimiento al evitar:
    - Leer variables de entorno repetidamente
    - Verificar existencia de archivos SSL en cada conexión
    - Crear diccionarios de configuración innecesariamente
    
    Returns:
        dict: Configuración de conexión a la base de datos
    """
    ssl_config = None
    
    # Verificar si existe archivo SSL en orden de prioridad
    if settings.DB_SSL_CA and os.path.exists(settings.DB_SSL_CA):
        ssl_config = {"ca": settings.DB_SSL_CA}
    # Alternativa: buscar en /etc/secrets/ (usado en Render/Heroku)
    elif os.path.exists("/etc/secrets/ca.pem"):
        ssl_config = {"ca": "/etc/secrets/ca.pem"}
    
    config = {
        "host": settings.DB_HOST,
        "user": settings.DB_USER,
        "password": settings.DB_PASSWORD,
        "database": settings.DB_NAME,
        "port": settings.DB_PORT,
        "cursorclass": pymysql.cursors.DictCursor,
        "connect_timeout": 10
    }
    
    if ssl_config:
        config["ssl"] = ssl_config
    
    return config

def get_connection():
    """
    ⚡ Obtiene una conexión optimizada a la base de datos
    
    Usa configuración cacheada (@lru_cache) para mejor rendimiento.
    La configuración se lee UNA sola vez y se reutiliza en todas
    las conexiones siguientes.
    
    Returns:
        pymysql.Connection: Conexión activa a la base de datos
        
    Raises:
        pymysql.Error: Si no se puede establecer la conexión
        
    Example:
        >>> conn = get_connection()
        >>> with conn:
        >>>     with conn.cursor() as cursor:
        >>>         cursor.execute("SELECT 1")
        >>>         result = cursor.fetchone()
        >>> conn.close()
    """
    config = get_connection_config()
    return pymysql.connect(**config)
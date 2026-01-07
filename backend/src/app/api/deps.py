from typing import Generator
import pymysql
from app.core.database import get_connection

def get_db() -> Generator:
    """Dependencia para obtener conexión a DB"""
    conn = None
    try:
        conn = get_connection()
        yield conn
    finally:
        if conn:
            conn.close()
from fastapi import APIRouter, HTTPException
import logging
from app.core.database import get_connection

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/citas")
def get_estados_citas():
    """
    Obtiene todos los estados de citas
    """
    try:
        conn = get_connection()
        with conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT * FROM estado_cita 
                    ORDER BY id
                """)
                estados = cursor.fetchall()
                return {"estados": estados}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/quirurgicos")
def get_estados_quirurgicos():
    """
    Obtiene todos los estados quirúrgicos
    """
    try:
        conn = get_connection()
        with conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT * FROM estado_Quirurgico 
                    ORDER BY id
                """)
                estados = cursor.fetchall()
                return {"estados": estados}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/cotizaciones")
def get_estados_cotizaciones():
    """
    Obtiene todos los estados de cotizaciones
    """
    try:
        conn = get_connection()
        with conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT * FROM estado_cotizacion 
                    ORDER BY orden
                """)
                estados = cursor.fetchall()
                return {"estados": estados}
    except Exception as e:
        logger.exception("Error inesperado")
        raise HTTPException(status_code=500, detail={
            "error": "Error obteniendo estados de cotización",
            "message": str(e)
        })
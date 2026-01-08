from fastapi import APIRouter, HTTPException
import pymysql
from datetime import datetime

from app.core.database import get_connection
from app.models.schemas.adicional import AdicionalCreate, AdicionalUpdate

router = APIRouter()

@router.get("/", response_model=dict)
def get_adicionales():
    try:
        conn = get_connection()
        with conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT 
                        a.id,
                        a.codigo,
                        a.nombre,
                        a.descripcion,
                        a.activo,
                        t.precio_base as precio
                    FROM adicional a
                    LEFT JOIN tarifa t ON a.tarifa_id = t.id
                    WHERE a.activo = 1
                    ORDER BY a.nombre
                """)
                adicionales = cursor.fetchall()
                return {"adicionales": adicionales}
    except Exception as e:
        error_msg = str(e)
        if "adicional" in error_msg.lower():
            return {"adicionales": []}
        raise HTTPException(status_code=500, detail=error_msg)

@router.get("/{adicional_id}", response_model=dict)
def get_adicional(adicional_id: int):
    try:
        conn = get_connection()
        with conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT 
                        a.id,
                        a.codigo,
                        a.nombre,
                        a.descripcion,
                        a.activo,
                        a.tarifa_id,
                        t.precio_base as precio
                    FROM adicional a
                    LEFT JOIN tarifa t ON a.tarifa_id = t.id
                    WHERE a.id = %s AND a.activo = 1
                """, (adicional_id,))
                adicional = cursor.fetchone()
                if not adicional:
                    raise HTTPException(status_code=404, detail="Adicional no encontrado")
                return adicional
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/", response_model=dict)
def create_adicional(adicional: AdicionalCreate):
    try:
        conn = get_connection()
        with conn:
            with conn.cursor() as cursor:
                fecha_vigencia = datetime.now().date()
                
                cursor.execute("""
                    INSERT INTO tarifa (precio_base, precio_adicional, fecha_vigencia, usuario_autorizador)
                    VALUES (%s, %s, %s, %s)
                """, (
                    adicional.precio,
                    0.00,
                    fecha_vigencia,
                    1
                ))
                tarifa_id = cursor.lastrowid
                
                cursor.execute("""
                    INSERT INTO adicional (codigo, nombre, descripcion, tarifa_id, activo)
                    VALUES (%s, %s, %s, %s, %s)
                """, (
                    f"ADD-{datetime.now().strftime('%Y%m%d%H%M%S')}",
                    adicional.nombre,
                    "",
                    tarifa_id,
                    1
                ))
                adicional_id = cursor.lastrowid
                conn.commit()
                
                return {
                    "success": True,
                    "message": "Adicional creado exitosamente",
                    "adicional_id": adicional_id
                }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{adicional_id}", response_model=dict)
def update_adicional(adicional_id: int, adicional: AdicionalUpdate):
    try:
        conn = get_connection()
        with conn:
            with conn.cursor() as cursor:
                cursor.execute("SELECT id, tarifa_id FROM adicional WHERE id = %s", (adicional_id,))
                adicional_actual = cursor.fetchone()
                if not adicional_actual:
                    raise HTTPException(status_code=404, detail="Adicional no encontrado")
                
                update_fields = []
                values = []
                
                if adicional.nombre is not None:
                    update_fields.append("nombre = %s")
                    values.append(adicional.nombre)
                
                if adicional.precio is not None:
                    if adicional_actual['tarifa_id']:
                        cursor.execute("""
                            UPDATE tarifa SET precio_base = %s WHERE id = %s
                        """, (adicional.precio, adicional_actual['tarifa_id']))
                    else:
                        fecha_vigencia = datetime.now().date()
                        
                        cursor.execute("""
                            INSERT INTO tarifa (precio_base, precio_adicional, fecha_vigencia, usuario_autorizador)
                            VALUES (%s, %s, %s, %s)
                        """, (
                            adicional.precio,
                            0.00,
                            fecha_vigencia,
                            1
                        ))
                        new_tarifa_id = cursor.lastrowid
                        update_fields.append("tarifa_id = %s")
                        values.append(new_tarifa_id)
                
                if not update_fields and adicional.precio is None:
                    raise HTTPException(status_code=400, detail="No se proporcionaron datos para actualizar")
                
                if update_fields:
                    values.append(adicional_id)
                    query = f"UPDATE adicional SET {', '.join(update_fields)} WHERE id = %s"
                    cursor.execute(query, values)
                
                conn.commit()
                
                return {
                    "success": True,
                    "message": "Adicional actualizado exitosamente",
                    "adicional_id": adicional_id
                }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{adicional_id}", response_model=dict)
def delete_adicional(adicional_id: int):
    try:
        conn = get_connection()
        with conn:
            with conn.cursor() as cursor:
                cursor.execute("SELECT tarifa_id FROM adicional WHERE id = %s", (adicional_id,))
                adicional_info = cursor.fetchone()
                if not adicional_info:
                    raise HTTPException(status_code=404, detail="Adicional no encontrado")
                
                cursor.execute("DELETE FROM adicional WHERE id = %s", (adicional_id,))
                
                if adicional_info['tarifa_id']:
                    cursor.execute("DELETE FROM tarifa WHERE id = %s", (adicional_info['tarifa_id'],))
                
                conn.commit()
                
                return {
                    "success": True,
                    "message": "Adicional eliminado exitosamente",
                    "adicional_id": adicional_id
                }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
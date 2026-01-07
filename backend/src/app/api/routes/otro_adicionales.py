from fastapi import APIRouter, HTTPException
import pymysql
import os
from datetime import datetime

from app.core.database import get_connection
from app.models.schemas.otro_adicional import OtroAdicionalCreate, OtroAdicionalUpdate

router = APIRouter()

@router.get("/", response_model=dict)
def get_otros_adicionales():
    try:
        conn = get_connection()
        with conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT 
                        oa.id,
                        oa.codigo,
                        oa.nombre,
                        oa.descripcion,
                        oa.activo,
                        t.precio_base as precio
                    FROM otro_adicional oa
                    LEFT JOIN tarifa t ON oa.tarifa_id = t.id
                    WHERE oa.activo = 1
                    ORDER BY oa.nombre
                """)
                otros_adicionales = cursor.fetchall()
                return {"otros_adicionales": otros_adicionales}
    except Exception as e:
        error_msg = str(e)
        if "otro_adicional" in error_msg.lower():
            return {"otros_adicionales": []}
        raise HTTPException(status_code=500, detail=error_msg)

@router.get("/{otro_adicional_id}", response_model=dict)
def get_otro_adicional(otro_adicional_id: int):
    try:
        conn = get_connection()
        with conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT 
                        oa.id,
                        oa.codigo,
                        oa.nombre,
                        oa.descripcion,
                        oa.activo,
                        oa.tarifa_id,
                        t.precio_base as precio
                    FROM otro_adicional oa
                    LEFT JOIN tarifa t ON oa.tarifa_id = t.id
                    WHERE oa.id = %s AND oa.activo = 1
                """, (otro_adicional_id,))
                otro_adicional = cursor.fetchone()
                if not otro_adicional:
                    raise HTTPException(status_code=404, detail="Otro adicional no encontrado")
                return otro_adicional
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/", response_model=dict)
def create_otro_adicional(otro_adicional: OtroAdicionalCreate):
    try:
        conn = get_connection()
        with conn:
            with conn.cursor() as cursor:
                fecha_vigencia = datetime.now().date()
                
                cursor.execute("""
                    INSERT INTO tarifa (precio_base, precio_adicional, fecha_vigencia, usuario_autorizador)
                    VALUES (%s, %s, %s, %s)
                """, (
                    otro_adicional.precio,
                    0.00,
                    fecha_vigencia,
                    1
                ))
                tarifa_id = cursor.lastrowid
                
                cursor.execute("""
                    INSERT INTO otro_adicional (codigo, nombre, descripcion, tarifa_id, activo)
                    VALUES (%s, %s, %s, %s, %s)
                """, (
                    f"OAD-{datetime.now().strftime('%Y%m%d%H%M%S')}",
                    otro_adicional.nombre,
                    "",
                    tarifa_id,
                    1
                ))
                otro_adicional_id = cursor.lastrowid
                conn.commit()
                
                return {
                    "success": True,
                    "message": "Otro adicional creado exitosamente",
                    "otro_adicional_id": otro_adicional_id
                }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{otro_adicional_id}", response_model=dict)
def update_otro_adicional(otro_adicional_id: int, otro_adicional: OtroAdicionalUpdate):
    try:
        conn = get_connection()
        with conn:
            with conn.cursor() as cursor:
                cursor.execute("SELECT id, tarifa_id FROM otro_adicional WHERE id = %s", (otro_adicional_id,))
                otro_adicional_actual = cursor.fetchone()
                if not otro_adicional_actual:
                    raise HTTPException(status_code=404, detail="Otro adicional no encontrado")
                
                update_fields = []
                values = []
                
                if otro_adicional.nombre is not None:
                    update_fields.append("nombre = %s")
                    values.append(otro_adicional.nombre)
                
                if otro_adicional.precio is not None:
                    if otro_adicional_actual['tarifa_id']:
                        cursor.execute("""
                            UPDATE tarifa SET precio_base = %s WHERE id = %s
                        """, (otro_adicional.precio, otro_adicional_actual['tarifa_id']))
                    else:
                        fecha_vigencia = datetime.now().date()
                        
                        cursor.execute("""
                            INSERT INTO tarifa (precio_base, precio_adicional, fecha_vigencia, usuario_autorizador)
                            VALUES (%s, %s, %s, %s)
                        """, (
                            otro_adicional.precio,
                            0.00,
                            fecha_vigencia,
                            1
                        ))
                        new_tarifa_id = cursor.lastrowid
                        update_fields.append("tarifa_id = %s")
                        values.append(new_tarifa_id)
                
                if not update_fields and otro_adicional.precio is None:
                    raise HTTPException(status_code=400, detail="No se proporcionaron datos para actualizar")
                
                if update_fields:
                    values.append(otro_adicional_id)
                    query = f"UPDATE otro_adicional SET {', '.join(update_fields)} WHERE id = %s"
                    cursor.execute(query, values)
                
                conn.commit()
                
                return {
                    "success": True,
                    "message": "Otro adicional actualizado exitosamente",
                    "otro_adicional_id": otro_adicional_id
                }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{otro_adicional_id}", response_model=dict)
def delete_otro_adicional(otro_adicional_id: int):
    try:
        conn = get_connection()
        with conn:
            with conn.cursor() as cursor:
                cursor.execute("SELECT tarifa_id FROM otro_adicional WHERE id = %s", (otro_adicional_id,))
                otro_adicional_info = cursor.fetchone()
                if not otro_adicional_info:
                    raise HTTPException(status_code=404, detail="Otro adicional no encontrado")
                
                cursor.execute("DELETE FROM otro_adicional WHERE id = %s", (otro_adicional_id,))
                
                if otro_adicional_info['tarifa_id']:
                    cursor.execute("DELETE FROM tarifa WHERE id = %s", (otro_adicional_info['tarifa_id'],))
                
                conn.commit()
                
                return {
                    "success": True,
                    "message": "Otro adicional eliminado exitosamente",
                    "otro_adicional_id": otro_adicional_id
                }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
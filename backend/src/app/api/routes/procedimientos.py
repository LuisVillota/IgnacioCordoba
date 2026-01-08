from fastapi import APIRouter, HTTPException
import pymysql
import os
from datetime import datetime

from app.core.database import get_connection
from app.models.schemas.procedimiento import ProcedimientoCreate, ProcedimientoUpdate

router = APIRouter()

@router.get("/", response_model=dict)
def get_procedimientos():
    try:
        conn = get_connection()
        with conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT 
                        p.id,
                        p.codigo,
                        p.nombre,
                        p.descripcion,
                        p.activo,
                        t.precio_base as precio
                    FROM procedimiento p
                    LEFT JOIN tarifa t ON p.tarifa_id = t.id
                    ORDER BY p.nombre
                """)
                procedimientos = cursor.fetchall()
                return {"procedimientos": procedimientos}
    except Exception as e:
        error_msg = str(e)
        if "procedimiento" in error_msg.lower() or "tarifa" in error_msg.lower():
            try:
                conn = get_connection()
                with conn:
                    with conn.cursor() as cursor:
                        cursor.execute("""
                            SELECT 
                                id,
                                codigo,
                                nombre,
                                descripcion,
                                activo,
                                0 as precio
                            FROM procedimiento
                            ORDER BY nombre
                        """)
                        procedimientos = cursor.fetchall()
                        return {"procedimientos": procedimientos}
            except:
                return {"procedimientos": []}
        raise HTTPException(status_code=500, detail=error_msg)

@router.get("/{procedimiento_id}", response_model=dict)
def get_procedimiento(procedimiento_id: int):
    try:
        conn = get_connection()
        with conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT 
                        p.id,
                        p.codigo,
                        p.nombre,
                        p.descripcion,
                        p.activo,
                        p.tarifa_id,
                        t.precio_base as precio
                    FROM procedimiento p
                    LEFT JOIN tarifa t ON p.tarifa_id = t.id
                    WHERE p.id = %s
                """, (procedimiento_id,))
                procedimiento = cursor.fetchone()
                if not procedimiento:
                    raise HTTPException(status_code=404, detail="Procedimiento no encontrado")
                return procedimiento
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/", response_model=dict)
def create_procedimiento(procedimiento: ProcedimientoCreate):
    try:
        conn = get_connection()
        with conn:
            with conn.cursor() as cursor:
                fecha_vigencia = datetime.now().date()
                
                cursor.execute("""
                    INSERT INTO tarifa (precio_base, precio_adicional, fecha_vigencia, usuario_autorizador)
                    VALUES (%s, %s, %s, %s)
                """, (
                    procedimiento.precio,
                    0.00,
                    fecha_vigencia,
                    1
                ))
                tarifa_id = cursor.lastrowid
                
                cursor.execute("""
                    INSERT INTO procedimiento (codigo, nombre, descripcion, tarifa_id, activo)
                    VALUES (%s, %s, %s, %s, %s)
                """, (
                    f"PROC-{datetime.now().strftime('%Y%m%d%H%M%S')}",
                    procedimiento.nombre,
                    "",
                    tarifa_id,
                    1
                ))
                procedimiento_id = cursor.lastrowid
                conn.commit()
                
                return {
                    "success": True,
                    "message": "Procedimiento creado exitosamente",
                    "procedimiento_id": procedimiento_id
                }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{procedimiento_id}", response_model=dict)
def update_procedimiento(procedimiento_id: int, procedimiento: ProcedimientoUpdate):
    try:
        conn = get_connection()
        with conn:
            with conn.cursor() as cursor:
                cursor.execute("SELECT id, tarifa_id FROM procedimiento WHERE id = %s", (procedimiento_id,))
                procedimiento_actual = cursor.fetchone()
                if not procedimiento_actual:
                    raise HTTPException(status_code=404, detail="Procedimiento no encontrado")
                
                update_fields = []
                values = []
                
                if procedimiento.nombre is not None:
                    update_fields.append("nombre = %s")
                    values.append(procedimiento.nombre)
                
                if procedimiento.precio is not None:
                    if procedimiento_actual['tarifa_id']:
                        cursor.execute("""
                            UPDATE tarifa SET precio_base = %s WHERE id = %s
                        """, (procedimiento.precio, procedimiento_actual['tarifa_id']))
                    else:
                        fecha_vigencia = datetime.now().date()
                        
                        cursor.execute("""
                            INSERT INTO tarifa (precio_base, precio_adicional, fecha_vigencia, usuario_autorizador)
                            VALUES (%s, %s, %s, %s)
                        """, (
                            procedimiento.precio,
                            0.00,
                            fecha_vigencia,
                            1
                        ))
                        new_tarifa_id = cursor.lastrowid
                        update_fields.append("tarifa_id = %s")
                        values.append(new_tarifa_id)
                
                if not update_fields and procedimiento.precio is None:
                    raise HTTPException(status_code=400, detail="No se proporcionaron datos para actualizar")
                
                if update_fields:
                    values.append(procedimiento_id)
                    query = f"UPDATE procedimiento SET {', '.join(update_fields)} WHERE id = %s"
                    cursor.execute(query, values)
                
                conn.commit()
                
                return {
                    "success": True,
                    "message": "Procedimiento actualizado exitosamente",
                    "procedimiento_id": procedimiento_id
                }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{procedimiento_id}", response_model=dict)
def delete_procedimiento(procedimiento_id: int):
    try:
        conn = get_connection()
        with conn:
            with conn.cursor() as cursor:
                cursor.execute("SELECT tarifa_id FROM procedimiento WHERE id = %s", (procedimiento_id,))
                procedimiento_info = cursor.fetchone()
                if not procedimiento_info:
                    raise HTTPException(status_code=404, detail="Procedimiento no encontrado")
                
                cursor.execute("DELETE FROM procedimiento WHERE id = %s", (procedimiento_id,))
                
                if procedimiento_info['tarifa_id']:
                    cursor.execute("DELETE FROM tarifa WHERE id = %s", (procedimiento_info['tarifa_id'],))
                
                conn.commit()
                
                return {
                    "success": True,
                    "message": "Procedimiento eliminado exitosamente",
                    "procedimiento_id": procedimiento_id
                }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
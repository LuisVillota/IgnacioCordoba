from fastapi import APIRouter, HTTPException, Query
import pymysql
from datetime import datetime
from typing import Optional

from app.core.database import get_connection
from app.models.schemas.cita import CitaCreate, CitaUpdate, CitaInDB
from app.models.schemas.paciente import MessageResponse

router = APIRouter()

@router.get("/", response_model=dict)
def get_citas(
    limit: int = Query(50, description="Número máximo de resultados"),
    offset: int = Query(0, description="Desplazamiento para paginación")
):
    """
    Obtiene lista de citas con información de paciente y doctor
    """
    try:
        conn = get_connection()
        with conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT c.*, 
                           p.nombre as paciente_nombre, 
                           p.apellido as paciente_apellido,
                           u.nombre as doctor_nombre,
                           ec.nombre as estado_nombre,
                           ec.color as estado_color
                    FROM cita c
                    JOIN paciente p ON c.paciente_id = p.id
                    JOIN usuario u ON c.usuario_id = u.id
                    JOIN estado_cita ec ON c.estado_id = ec.id
                    ORDER BY c.fecha_hora DESC
                    LIMIT %s OFFSET %s
                """, (limit, offset))
                citas = cursor.fetchall()
                
                return {"citas": citas}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{cita_id}", response_model=dict)
def get_cita(cita_id: int):
    """
    Obtiene una cita específica por ID
    """
    try:
        conn = get_connection()
        with conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT c.*, 
                           p.nombre as paciente_nombre, 
                           p.apellido as paciente_apellido,
                           u.nombre as doctor_nombre,
                           ec.nombre as estado_nombre,
                           ec.color as estado_color
                    FROM cita c
                    JOIN paciente p ON c.paciente_id = p.id
                    JOIN usuario u ON c.usuario_id = u.id
                    JOIN estado_cita ec ON c.estado_id = ec.id
                    WHERE c.id = %s
                """, (cita_id,))
                cita = cursor.fetchone()
                
                if not cita:
                    raise HTTPException(status_code=404, detail="Cita no encontrada")
                
                return cita
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/", response_model=dict)
def create_cita(cita: CitaCreate):
    """
    Crea una nueva cita
    """
    try:
        from datetime import datetime
        
        # Limpiar y validar fecha_hora
        fecha_hora_limpia = cita.fecha_hora.replace('Z', '')
        if len(fecha_hora_limpia) == 16:
            fecha_hora_limpia += ":00"
        
        fecha_parseada = datetime.fromisoformat(fecha_hora_limpia)
        
        conn = get_connection()
        with conn:
            with conn.cursor() as cursor:
                # Verificar que el paciente existe
                cursor.execute("""
                    SELECT id, nombre, apellido 
                    FROM paciente WHERE id = %s
                """, (cita.paciente_id,))
                
                resultado = cursor.fetchone()
                if not resultado:
                    raise HTTPException(
                        status_code=404, 
                        detail=f"Paciente con ID {cita.paciente_id} no encontrado"
                    )
                
                paciente_nombre = resultado['nombre']
                paciente_apellido = resultado['apellido']
                
                # Verificar que el usuario existe
                cursor.execute("""
                    SELECT id, nombre FROM usuario WHERE id = %s
                """, (cita.usuario_id,))
                
                resultado_usuario = cursor.fetchone()
                if not resultado_usuario:
                    raise HTTPException(
                        status_code=404, 
                        detail=f"Usuario con ID {cita.usuario_id} no encontrado"
                    )
                
                usuario_nombre = resultado_usuario['nombre']
                
                # Verificar disponibilidad del doctor (opcional)
                cursor.execute("""
                    SELECT id FROM cita 
                    WHERE usuario_id = %s 
                    AND fecha_hora = %s
                    AND estado_id != 4  # No considerar citas canceladas
                """, (cita.usuario_id, fecha_hora_limpia))
                
                if cursor.fetchone():
                    # Solo log, no bloqueamos por ahora
                    pass
                
                # Insertar cita
                cursor.execute("""
                    INSERT INTO cita (
                        paciente_id, usuario_id, fecha_hora, tipo,
                        duracion_minutos, estado_id, notas, fecha_creacion
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, NOW())
                """, (
                    cita.paciente_id,
                    cita.usuario_id,
                    fecha_hora_limpia,
                    cita.tipo,
                    cita.duracion_minutos,
                    cita.estado_id,
                    cita.notas or ""
                ))
                
                cita_id = cursor.lastrowid
                conn.commit()
                
                return {
                    "success": True,
                    "message": "Cita creada exitosamente",
                    "cita_id": cita_id,
                    "paciente_nombre": f"{paciente_nombre} {paciente_apellido}",
                    "doctor_nombre": usuario_nombre,
                    "fecha_hora": fecha_hora_limpia
                }
                
    except HTTPException as he:
        raise he
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=f"Formato de fecha inválido: {str(ve)}")
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error interno del servidor: {str(e)}")

@router.put("/{cita_id}", response_model=dict)
def update_cita(cita_id: int, cita: CitaUpdate):
    """
    Actualiza una cita existente
    """
    try:
        conn = get_connection()
        with conn:
            with conn.cursor() as cursor:
                # Verificar que la cita existe
                cursor.execute("""
                    SELECT id FROM cita WHERE id = %s
                """, (cita_id,))
                if not cursor.fetchone():
                    raise HTTPException(status_code=404, detail="Cita no encontrada")
                
                # Si se actualiza fecha_hora, limpiarla
                fecha_hora = cita.fecha_hora
                if fecha_hora:
                    fecha_hora = fecha_hora.replace('Z', '')
                    if len(fecha_hora) == 16:
                        fecha_hora += ":00"
                
                # Construir query dinámica
                update_fields = []
                values = []
                
                field_mapping = {
                    'paciente_id': cita.paciente_id,
                    'usuario_id': cita.usuario_id,
                    'fecha_hora': fecha_hora,
                    'tipo': cita.tipo,
                    'duracion_minutos': cita.duracion_minutos,
                    'estado_id': cita.estado_id,
                    'notas': cita.notas
                }
                
                for field, value in field_mapping.items():
                    if value is not None:
                        update_fields.append(f"{field} = %s")
                        values.append(value)
                
                if not update_fields:
                    raise HTTPException(
                        status_code=400, 
                        detail="No se proporcionaron datos para actualizar"
                    )
                
                values.append(cita_id)
                query = f"UPDATE cita SET {', '.join(update_fields)} WHERE id = %s"
                
                cursor.execute(query, values)
                conn.commit()
                
                return {
                    "success": True,
                    "message": "Cita actualizada exitosamente",
                    "cita_id": cita_id
                }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{cita_id}", response_model=MessageResponse)
def delete_cita(cita_id: int):
    """
    Elimina una cita
    """
    try:
        conn = get_connection()
        with conn:
            with conn.cursor() as cursor:
                # Verificar que la cita existe
                cursor.execute("SELECT id FROM cita WHERE id = %s", (cita_id,))
                if not cursor.fetchone():
                    raise HTTPException(status_code=404, detail="Cita no encontrada")
                
                # Eliminar cita
                cursor.execute("DELETE FROM cita WHERE id = %s", (cita_id,))
                conn.commit()
                
                return MessageResponse(message="Cita eliminada exitosamente")
                
    except pymysql.err.IntegrityError as e:
        raise HTTPException(
            status_code=400, 
            detail="No se puede eliminar la cita porque tiene registros relacionados"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
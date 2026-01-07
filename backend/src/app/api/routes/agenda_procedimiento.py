from fastapi import APIRouter, HTTPException, Query
from datetime import datetime, timedelta, date
from typing import Optional, Union
import traceback

from app.core.database import get_connection
from app.models.schemas.agenda_procedimientos import (
    AgendaProcedimientoCreate, AgendaProcedimientoUpdate,
    AgendaProcedimientoResponse, EstadoProcedimiento
)

router = APIRouter()

@router.get("/disponibilidad", response_model=dict)
def verificar_disponibilidad(
    fecha: str,
    hora: str,
    duracion: int = Query(60, description="Duración en minutos"),
    exclude_id: Optional[int] = Query(None, description="ID a excluir (para updates)"),
    procedimiento_id: Optional[Union[int, str]] = Query(None, description="ID del procedimiento")
):
    """
    Verifica disponibilidad de horario para procedimientos.
    """
    try:
        conn = get_connection()
        with conn:
            with conn.cursor() as cursor:
                # Asegurar formato de hora
                hora_inicio = hora
                if hora_inicio.count(":") == 1:
                    hora_inicio += ":00"  
                hora_fin = (datetime.strptime(hora_inicio, '%H:%M:%S') + 
                           timedelta(minutes=duracion)).strftime('%H:%M:%S')
                
                # Normalizar procedimiento_id
                proc_id_int = None
                if procedimiento_id is not None and procedimiento_id != "":
                    try:
                        proc_id_int = int(procedimiento_id)
                    except ValueError:
                        raise HTTPException(
                            status_code=422,
                            detail="procedimiento_id debe ser un entero válido"
                        )
                
                # Query base
                query = """
                    SELECT 
                        ap.id,
                        ap.fecha,
                        ap.hora,
                        ap.duracion,
                        ap.estado,
                        p.nombre as paciente_nombre,
                        p.apellido as paciente_apellido,
                        proc.nombre as procedimiento_nombre
                    FROM agenda_procedimientos ap
                    JOIN paciente p ON ap.numero_documento = p.numero_documento
                    JOIN procedimiento proc ON ap.procedimiento_id = proc.id
                    WHERE ap.fecha = %s 
                    AND ap.estado NOT IN ('Cancelado', 'Operado')
                """
                params = [fecha]
                
                # Agregar condiciones opcionales
                if exclude_id:
                    query += " AND ap.id != %s"
                    params.append(exclude_id)
                
                if proc_id_int is not None:
                    query += " AND ap.procedimiento_id = %s"
                    params.append(proc_id_int)
                
                # Condición de solapamiento de horarios
                query += """
                    AND (
                        (TIME(%s) >= TIME(ap.hora) AND TIME(%s) < ADDTIME(TIME(ap.hora), SEC_TO_TIME(ap.duracion * 60)))
                        OR
                        (TIME(ap.hora) >= TIME(%s) AND TIME(ap.hora) < TIME(%s))
                    )
                    ORDER BY ap.hora
                """
                params.extend([hora_inicio, hora_inicio, hora_inicio, hora_fin])
                cursor.execute(query, params)
                conflictos = cursor.fetchall()
                
                disponible = len(conflictos) == 0
                
                return {
                    "success": True,
                    "disponible": disponible,
                    "conflictos": conflictos,
                    "total_conflictos": len(conflictos),
                    "mensaje": "Horario disponible" if disponible else "Horario no disponible",
                }
                
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        return {
            "success": False,
            "error": True,
            "message": f"Error del servidor: {str(e)}",
            "disponible": False,
            "conflictos": []
        }

@router.get("/", response_model=dict)
def get_agenda_procedimientos(
    limit: int = Query(100, description="Límite de resultados"),
    offset: int = Query(0, description="Offset para paginación"),
    fecha: Optional[str] = Query(None, description="Filtrar por fecha específica"),
    estado: Optional[str] = Query(None, description="Filtrar por estado"),
    numero_documento: Optional[str] = Query(None, description="Filtrar por número de documento"),
    fecha_inicio: Optional[str] = Query(None, description="Fecha inicio para rango"),
    fecha_fin: Optional[str] = Query(None, description="Fecha fin para rango")
):
    try:
        conn = get_connection()
        with conn:
            with conn.cursor() as cursor:
                query = """
                    SELECT 
                        ap.*,
                        p.nombre as paciente_nombre,
                        p.apellido as paciente_apellido,
                        proc.nombre as procedimiento_nombre
                    FROM agenda_procedimientos ap
                    JOIN paciente p ON ap.numero_documento = p.numero_documento
                    JOIN procedimiento proc ON ap.procedimiento_id = proc.id
                    WHERE 1=1
                """
                params = []
                
                if fecha:
                    query += " AND ap.fecha = %s"
                    params.append(fecha)
                
                if fecha_inicio and fecha_fin:
                    query += " AND ap.fecha BETWEEN %s AND %s"
                    params.extend([fecha_inicio, fecha_fin])
                
                if estado:
                    query += " AND ap.estado = %s"
                    params.append(estado)
                
                if numero_documento:
                    query += " AND ap.numero_documento = %s"
                    params.append(numero_documento)
                
                query += " ORDER BY ap.fecha DESC, ap.hora DESC"
                query += " LIMIT %s OFFSET %s"
                params.extend([limit, offset])
                
                cursor.execute(query, params)
                procedimientos = cursor.fetchall()
                
                count_query = """
                    SELECT COUNT(*) as total FROM agenda_procedimientos ap WHERE 1=1
                """
                count_params = []
                
                if fecha:
                    count_query += " AND ap.fecha = %s"
                    count_params.append(fecha)
                
                if fecha_inicio and fecha_fin:
                    count_query += " AND ap.fecha BETWEEN %s AND %s"
                    count_params.extend([fecha_inicio, fecha_fin])
                
                if estado:
                    count_query += " AND ap.estado = %s"
                    count_params.append(estado)
                
                if numero_documento:
                    count_query += " AND ap.numero_documento = %s"
                    count_params.append(numero_documento)
                
                cursor.execute(count_query, count_params)
                total = cursor.fetchone()['total']
                
                return {
                    "procedimientos": procedimientos,
                    "total": total,
                    "limit": limit,
                    "offset": offset
                }
                
    except Exception as e:
        error_msg = str(e)
        if "agenda_procedimientos" in error_msg.lower():
            return {"procedimientos": [], "total": 0}
        raise HTTPException(status_code=500, detail=error_msg)

@router.get("/{procedimiento_id}", response_model=dict)
def get_agenda_procedimiento(procedimiento_id: int):
    try:
        conn = get_connection()
        with conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT 
                        ap.*,
                        p.nombre as paciente_nombre,
                        p.apellido as paciente_apellido,
                        p.telefono as paciente_telefono,
                        p.email as paciente_email,
                        proc.nombre as procedimiento_nombre,
                        proc.precio as procedimiento_precio
                    FROM agenda_procedimientos ap
                    JOIN paciente p ON ap.numero_documento = p.numero_documento
                    JOIN procedimiento proc ON ap.procedimiento_id = proc.id
                    WHERE ap.id = %s
                """, (procedimiento_id,))
                
                procedimiento = cursor.fetchone()
                if not procedimiento:
                    raise HTTPException(status_code=404, detail="Procedimiento agendado no encontrado")
                
                return procedimiento
                
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/", response_model=dict)
def create_agenda_procedimiento(procedimiento: AgendaProcedimientoCreate):
    try:
        conn = get_connection()
        with conn:
            with conn.cursor() as cursor:
                # Verificar que el paciente existe
                cursor.execute("""
                    SELECT nombre, apellido FROM paciente 
                    WHERE numero_documento = %s
                """, (procedimiento.numero_documento,))
                
                paciente = cursor.fetchone()
                if not paciente:
                    raise HTTPException(
                        status_code=404, 
                        detail=f"Paciente con documento {procedimiento.numero_documento} no encontrado"
                    )
                
                # Verificar que el procedimiento existe
                cursor.execute("""
                    SELECT id, nombre FROM procedimiento 
                    WHERE id = %s
                """, (procedimiento.procedimiento_id,))
                
                proc = cursor.fetchone()
                if not proc:
                    raise HTTPException(
                        status_code=404, 
                        detail=f"Procedimiento con ID {procedimiento.procedimiento_id} no encontrado"
                    )
                
                # Verificar disponibilidad
                duracion = procedimiento.duracion or 60
                hora_inicio = procedimiento.hora
                hora_fin = (datetime.strptime(hora_inicio, '%H:%M:%S') + 
                           timedelta(minutes=duracion)).strftime('%H:%M:%S')

                cursor.execute("""
                    SELECT id, fecha, hora, duracion, estado 
                    FROM agenda_procedimientos 
                    WHERE fecha = %s 
                    AND estado NOT IN ('Cancelado', 'Operado')
                    AND (
                        (TIME(%s) >= TIME(hora) AND TIME(%s) < ADDTIME(TIME(hora), SEC_TO_TIME(duracion * 60)))
                        OR
                        (TIME(hora) >= TIME(%s) AND TIME(hora) < TIME(%s))
                    )
                """, (
                    procedimiento.fecha,
                    hora_inicio, hora_inicio,
                    hora_inicio, hora_fin
                ))
                
                conflictos = cursor.fetchall()
                if conflictos:
                    conflicto_info = conflictos[0]
                    raise HTTPException(
                        status_code=409,
                        detail=f"Conflicto de horario. Ya existe un procedimiento programado para esa hora. ID conflicto: {conflicto_info['id']}"
                    )
                
                # Insertar procedimiento
                cursor.execute("""
                    INSERT INTO agenda_procedimientos (
                        numero_documento, fecha, hora, procedimiento_id,
                        duracion, anestesiologo, estado, observaciones
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    procedimiento.numero_documento,
                    procedimiento.fecha,
                    procedimiento.hora,
                    procedimiento.procedimiento_id,
                    procedimiento.duracion,
                    procedimiento.anestesiologo or "",
                    procedimiento.estado.value,
                    procedimiento.observaciones or ""
                ))
                
                procedimiento_id = cursor.lastrowid
                conn.commit()
                
                return {
                    "success": True,
                    "message": "Procedimiento agendado exitosamente",
                    "procedimiento_id": procedimiento_id,
                    "paciente_nombre": f"{paciente['nombre']} {paciente['apellido']}",
                    "procedimiento_nombre": proc['nombre']
                }
                
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail={
            "error": "Error creando procedimiento agendado",
            "message": str(e)
        })
    
@router.put("/{procedimiento_id}", response_model=dict)
def update_agenda_procedimiento(procedimiento_id: int, procedimiento: AgendaProcedimientoUpdate):
    try:
        conn = get_connection()
        with conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT * FROM agenda_procedimientos 
                    WHERE id = %s
                """, (procedimiento_id,))
                
                procedimiento_existente = cursor.fetchone()
                if not procedimiento_existente:
                    raise HTTPException(status_code=404, detail="Procedimiento agendado no encontrado")
                
                fecha = procedimiento.fecha if procedimiento.fecha else procedimiento_existente['fecha']
                hora = procedimiento.hora if procedimiento.hora else procedimiento_existente['hora']
                duracion = procedimiento.duracion if procedimiento.duracion is not None else (procedimiento_existente['duracion'] or 60)
                
                # Verificar disponibilidad si se cambia fecha/hora/duración
                if procedimiento.fecha or procedimiento.hora or procedimiento.duracion is not None:
                    hora_inicio = hora
                    hora_fin = (datetime.strptime(hora_inicio, '%H:%M:%S') + 
                               timedelta(minutes=duracion)).strftime('%H:%M:%S')
                    
                    cursor.execute("""
                        SELECT id, fecha, hora, duracion, estado 
                        FROM agenda_procedimientos 
                        WHERE fecha = %s 
                        AND id != %s
                        AND estado NOT IN ('Cancelado', 'Operado')
                        AND (
                            (TIME(%s) >= TIME(hora) AND TIME(%s) < ADDTIME(TIME(hora), SEC_TO_TIME(duracion * 60)))
                            OR
                            (TIME(hora) >= TIME(%s) AND TIME(hora) < TIME(%s))
                        )
                    """, (
                        fecha,
                        procedimiento_id,
                        hora_inicio, hora_inicio,
                        hora_inicio, hora_fin
                    ))
                    
                    conflictos = cursor.fetchall()
                    if conflictos:
                        conflicto_info = conflictos[0]
                        raise HTTPException(
                            status_code=409,
                            detail=f"Conflicto de horario. Ya existe un procedimiento programado para esa hora. ID conflicto: {conflicto_info['id']}"
                        )
                
                update_fields = []
                values = []
                
                if procedimiento.fecha is not None:
                    update_fields.append("fecha = %s")
                    values.append(procedimiento.fecha)
                
                if procedimiento.hora is not None:
                    update_fields.append("hora = %s")
                    values.append(procedimiento.hora)
                
                if procedimiento.procedimiento_id is not None:
                    update_fields.append("procedimiento_id = %s")
                    values.append(procedimiento.procedimiento_id)
                    
                    cursor.execute("SELECT id FROM procedimiento WHERE id = %s", (procedimiento.procedimiento_id,))
                    if not cursor.fetchone():
                        raise HTTPException(status_code=404, detail="Procedimiento no encontrado")
                
                if procedimiento.duracion is not None:
                    update_fields.append("duracion = %s")
                    values.append(procedimiento.duracion)
                
                if procedimiento.anestesiologo is not None:
                    update_fields.append("anestesiologo = %s")
                    values.append(procedimiento.anestesiologo)
                
                if procedimiento.estado is not None:
                    update_fields.append("estado = %s")
                    values.append(procedimiento.estado.value)
                
                if procedimiento.observaciones is not None:
                    update_fields.append("observaciones = %s")
                    values.append(procedimiento.observaciones)
                
                if not update_fields:
                    raise HTTPException(status_code=400, detail="No se proporcionaron datos para actualizar")
                
                values.append(procedimiento_id)
                
                query = f"UPDATE agenda_procedimientos SET {', '.join(update_fields)} WHERE id = %s"
                cursor.execute(query, values)
                conn.commit()
                
                return {
                    "success": True,
                    "message": "Procedimiento agendado actualizado exitosamente",
                    "procedimiento_id": procedimiento_id
                }
                
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail={
            "error": "Error actualizando procedimiento agendado",
            "message": str(e)
        })

@router.delete("/{procedimiento_id}", response_model=dict)
def delete_agenda_procedimiento(procedimiento_id: int):
    try:
        conn = get_connection()
        with conn:
            with conn.cursor() as cursor:
                cursor.execute("SELECT id FROM agenda_procedimientos WHERE id = %s", (procedimiento_id,))
                procedimiento_existente = cursor.fetchone()
                if not procedimiento_existente:
                    raise HTTPException(status_code=404, detail="Procedimiento agendado no encontrado")
                
                cursor.execute("DELETE FROM agenda_procedimientos WHERE id = %s", (procedimiento_id,))
                conn.commit()
                
                return {
                    "success": True,
                    "message": "Procedimiento agendado eliminado exitosamente",
                    "procedimiento_id": procedimiento_id
                }
                
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail={
            "error": "Error eliminando procedimiento agendado",
            "message": str(e)
        })

@router.get("/estados/disponibles", response_model=dict)
def get_estados_procedimiento():
    return {
        "estados": [
            {"value": "Programado", "label": "Programado"},
            {"value": "Aplazado", "label": "Aplazado"},
            {"value": "Confirmado", "label": "Confirmado"},
            {"value": "En Quirofano", "label": "En Quirofano"},
            {"value": "Operado", "label": "Operado"},
            {"value": "Cancelado", "label": "Cancelado"}
        ]
    }

@router.get("/calendario/{year}/{month}", response_model=dict)
def get_calendario_procedimientos(year: int, month: int):
    try:
        conn = get_connection()
        with conn:
            with conn.cursor() as cursor:
                fecha_inicio = f"{year}-{month:02d}-01"
                if month == 12:
                    fecha_fin = f"{year+1}-01-01"
                else:
                    fecha_fin = f"{year}-{month+1:02d}-01"
                
                cursor.execute("""
                    SELECT 
                        ap.id,
                        ap.fecha,
                        ap.hora,
                        ap.estado,
                        ap.duracion,
                        p.nombre as paciente_nombre,
                        p.apellido as paciente_apellido,
                        proc.nombre as procedimiento_nombre,
                        proc.precio as procedimiento_precio
                    FROM agenda_procedimientos ap
                    JOIN paciente p ON ap.numero_documento = p.numero_documento
                    JOIN procedimiento proc ON ap.procedimiento_id = proc.id
                    WHERE ap.fecha >= %s AND ap.fecha < %s
                    ORDER BY ap.fecha, ap.hora
                """, (fecha_inicio, fecha_fin))
                
                procedimientos = cursor.fetchall()
                
                calendario = {}
                for proc in procedimientos:
                    fecha_str = str(proc['fecha'])
                    if fecha_str not in calendario:
                        calendario[fecha_str] = []
                    
                    calendario[fecha_str].append({
                        "id": proc['id'],
                        "hora": proc['hora'][:5],
                        "estado": proc['estado'],
                        "duracion": proc['duracion'],
                        "paciente": f"{proc['paciente_nombre']} {proc['paciente_apellido']}",
                        "procedimiento": proc['procedimiento_nombre'],
                        "precio": proc['procedimiento_precio']
                    })
                
                return {
                    "year": year,
                    "month": month,
                    "procedimientos": calendario,
                    "total": len(procedimientos)
                }
                
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
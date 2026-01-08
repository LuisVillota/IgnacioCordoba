from fastapi import APIRouter, HTTPException, Query
import pymysql
from datetime import datetime
from typing import Optional

from app.core.database import get_connection
from app.models.schemas.sala_espera import (
    SalaEsperaCreate, SalaEsperaUpdate, 
    BulkUpdateEstadosRequest, SalaEsperaInDB
)

router = APIRouter()

@router.get("/", response_model=dict)
def get_sala_espera(mostrarTodos: bool = Query(True, description="Mostrar todos los pacientes o solo con cita hoy")):
    try:
        conn = get_connection()
        with conn:
            with conn.cursor() as cursor:
                hoy = datetime.now().strftime('%Y-%m-%d')
                
                try:
                    cursor.execute("SELECT COUNT(*) as count FROM estado_sala_espera")
                    count_estados = cursor.fetchone()['count']
                    
                    if count_estados == 0:
                        estados = [
                            ('pendiente', 'paciente pendiente de atención', '#9CA3AF', 1),
                            ('llegada', 'paciente ha llegado', '#FBBF24', 2),
                            ('confirmada', 'cita confirmada', '#10B981', 3),
                            ('en_consulta', 'paciente en consulta', '#3B82F6', 4),
                            ('completada', 'Consulta completada', '#8B5CF6', 5),
                            ('no_asistio', 'paciente no asistio', '#EF4444', 6)
                        ]
                        
                        for estado in estados:
                            cursor.execute("""
                                INSERT IGNORE INTO estado_sala_espera (nombre, descripcion, color, orden)
                                VALUES (%s, %s, %s, %s)
                            """, estado)
                        
                        conn.commit()
                except Exception as e:
                    pass
                
                if mostrarTodos:
                    query = """
                        SELECT 
                            p.id,
                            p.nombre,
                            p.apellido,
                            p.numero_documento,
                            p.telefono,
                            p.email,
                            se.id as sala_espera_id,
                            se.cita_id,
                            ese.nombre as estado_sala,
                            se.tiempo_espera_minutos as tiempo_espera,
                            TIME(se.fecha_hora_ingreso) as hora_cita,
                            DATE(se.fecha_hora_ingreso) as fecha_cita,
                            se.hora_cita_programada,
                            CASE 
                                WHEN c.id IS NOT NULL AND DATE(c.fecha_hora) = %s THEN 1
                                ELSE 0
                            END as tiene_cita_hoy,
                            c.fecha_hora as cita_fecha_hora,
                            c.id as cita_id_real
                        FROM paciente p
                        LEFT JOIN sala_espera se ON p.id = se.paciente_id 
                            AND DATE(se.fecha_hora_ingreso) = %s
                        LEFT JOIN estado_sala_espera ese ON se.estado_id = ese.id
                        LEFT JOIN cita c ON p.id = c.paciente_id 
                            AND DATE(c.fecha_hora) = %s
                        ORDER BY se.fecha_hora_ingreso DESC, p.apellido, p.nombre
                    """
                    params = [hoy, hoy, hoy]
                else:
                    query = """
                        SELECT 
                            p.id,
                            p.nombre,
                            p.apellido,
                            p.numero_documento,
                            p.telefono,
                            p.email,
                            se.id as sala_espera_id,
                            se.cita_id,
                            ese.nombre as estado_sala,
                            se.tiempo_espera_minutos as tiempo_espera,
                            TIME(se.fecha_hora_ingreso) as hora_cita,
                            DATE(se.fecha_hora_ingreso) as fecha_cita,
                            se.hora_cita_programada,
                            1 as tiene_cita_hoy,
                            c.fecha_hora as cita_fecha_hora,
                            c.id as cita_id_real
                        FROM paciente p
                        INNER JOIN cita c ON p.id = c.paciente_id 
                            AND DATE(c.fecha_hora) = %s
                        LEFT JOIN sala_espera se ON p.id = se.paciente_id 
                            AND DATE(se.fecha_hora_ingreso) = %s
                        LEFT JOIN estado_sala_espera ese ON se.estado_id = ese.id
                        ORDER BY c.fecha_hora ASC, p.apellido, p.nombre
                    """
                    params = [hoy, hoy]
                
                cursor.execute(query, params)
                pacientes = cursor.fetchall()
                
                pacientes_actualizados = 0
                for paciente in pacientes:
                    if not paciente['sala_espera_id']:
                        cursor.execute("SELECT id FROM estado_sala_espera WHERE nombre = 'pendiente'")
                        estado = cursor.fetchone()
                        
                        if estado:
                            hora_cita_programada = None
                            if paciente['cita_fecha_hora']:
                                try:
                                    hora_cita = datetime.strptime(
                                        str(paciente['cita_fecha_hora']), 
                                        '%Y-%m-%d %H:%M:%S'
                                    )
                                    hora_cita_programada = hora_cita.strftime('%H:%M:%S')
                                except:
                                    hora_cita_programada = None
                            
                            cursor.execute("""
                                INSERT INTO sala_espera 
                                (paciente_id, estado_id, fecha_hora_ingreso, tiene_cita_hoy, hora_cita_programada) 
                                VALUES (%s, %s, NOW(), %s, %s)
                            """, (
                                paciente['id'],
                                estado['id'],
                                paciente['tiene_cita_hoy'],
                                hora_cita_programada
                            ))
                            pacientes_actualizados += 1
                
                if pacientes_actualizados > 0:
                    conn.commit()
                    cursor.execute(query, params)
                    pacientes = cursor.fetchall()
                
                pacientes_formateados = []
                for paciente in pacientes:
                    hora_cita_formateada = None
                    if paciente['hora_cita_programada']:
                        try:
                            hora_cita_formateada = str(paciente['hora_cita_programada'])[:5]
                        except:
                            hora_cita_formateada = None
                    
                    if not hora_cita_formateada and paciente['cita_fecha_hora']:
                        try:
                            hora_cita = datetime.strptime(
                                str(paciente['cita_fecha_hora']), 
                                '%Y-%m-%d %H:%M:%S'
                            )
                            hora_cita_formateada = hora_cita.strftime('%H:%M')
                        except:
                            hora_cita_formateada = "09:00"
                    
                    tiempo_espera = paciente['tiempo_espera'] or 0
                    if tiempo_espera == 0 and paciente['sala_espera_id']:
                        cursor.execute("""
                            SELECT TIMESTAMPDIFF(MINUTE, fecha_hora_ingreso, NOW()) as tiempo
                            FROM sala_espera WHERE id = %s
                        """, (paciente['sala_espera_id'],))
                        tiempo_calculado = cursor.fetchone()
                        if tiempo_calculado and tiempo_calculado['tiempo']:
                            tiempo_espera = tiempo_calculado['tiempo']
                    
                    pacientes_formateados.append({
                        'id': str(paciente['id']),
                        'nombres': paciente['nombre'] or '',
                        'apellidos': paciente['apellido'] or '',
                        'documento': paciente['numero_documento'] or '',
                        'telefono': paciente['telefono'] or '',
                        'email': paciente['email'] or '',
                        'sala_espera_id': str(paciente['sala_espera_id']) if paciente['sala_espera_id'] else None,
                        'cita_id': str(paciente['cita_id']) if paciente['cita_id'] else str(paciente['cita_id_real']) if paciente['cita_id_real'] else None,
                        'estado_sala': paciente['estado_sala'] or 'pendiente',
                        'tiempo_espera': tiempo_espera,
                        'hora_cita': hora_cita_formateada,
                        'fecha_cita': paciente['fecha_cita'] or hoy,
                        'tiene_cita_hoy': bool(paciente['tiene_cita_hoy'])
                    })
                
                return {
                    "success": True,
                    "pacientes": pacientes_formateados,
                    "total": len(pacientes_formateados),
                    "fecha": hoy,
                    "mostrarTodos": mostrarTodos
                }
                
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error obteniendo sala de espera: {str(e)}")

@router.post("/", response_model=dict)
def crear_registro_sala_espera(registro: SalaEsperaCreate):
    try:
        conn = get_connection()
        with conn:
            with conn.cursor() as cursor:
                cursor.execute("SELECT id, nombre, apellido FROM paciente WHERE id = %s", (registro.paciente_id,))
                paciente = cursor.fetchone()
                if not paciente:
                    raise HTTPException(status_code=404, detail="Paciente no encontrado")
                
                cursor.execute("SELECT id FROM estado_sala_espera WHERE nombre = 'pendiente'")
                estado = cursor.fetchone()
                if not estado:
                    cursor.execute("""
                        INSERT INTO estado_sala_espera (nombre, descripcion, color, orden)
                        VALUES ('pendiente', 'paciente pendiente de atencion', '#9CA3AF', 1)
                    """)
                    estado_id = cursor.lastrowid
                    estado = {'id': estado_id}
                
                hoy = datetime.now().strftime('%Y-%m-%d')
                cursor.execute("""
                    SELECT id FROM sala_espera 
                    WHERE paciente_id = %s AND DATE(fecha_hora_ingreso) = %s
                """, (registro.paciente_id, hoy))
                
                registro_existente = cursor.fetchone()
                
                if registro_existente:
                    return {
                        "success": True,
                        "message": "El paciente ya está registrado en sala de espera hoy",
                        "already_exists": True,
                        "registro_id": registro_existente['id']
                    }
                
                hora_cita_programada = None
                if registro.cita_id:
                    cursor.execute("""
                        SELECT fecha_hora FROM cita 
                        WHERE id = %s
                    """, (registro.cita_id,))
                    cita = cursor.fetchone()
                    if cita and cita['fecha_hora']:
                        try:
                            hora_cita = datetime.strptime(
                                str(cita['fecha_hora']), 
                                '%Y-%m-%d %H:%M:%S'
                            )
                            hora_cita_programada = hora_cita.strftime('%H:%M:%S')
                        except:
                            hora_cita_programada = None
                
                cursor.execute("""
                    INSERT INTO sala_espera 
                    (paciente_id, cita_id, estado_id, fecha_hora_ingreso, tiene_cita_hoy, hora_cita_programada) 
                    VALUES (%s, %s, %s, NOW(), %s, %s)
                """, (
                    registro.paciente_id,
                    registro.cita_id,
                    estado['id'],
                    registro.cita_id is not None,
                    hora_cita_programada
                ))
                
                registro_id = cursor.lastrowid
                conn.commit()
                
                return {
                    "success": True,
                    "message": "Paciente registrado en sala de espera",
                    "registro_id": registro_id,
                    "already_exists": False,
                    "estado": "pendiente"
                }
                
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error creando registro: {str(e)}")

@router.put("/{paciente_id}/estado", response_model=dict)
def actualizar_estado_sala_espera(paciente_id: int, datos: SalaEsperaUpdate):
    try:
        conn = get_connection()
        with conn:
            with conn.cursor() as cursor:
                cursor.execute("SELECT id, nombre, apellido FROM paciente WHERE id = %s", (paciente_id,))
                paciente = cursor.fetchone()
                if not paciente:
                    raise HTTPException(status_code=404, detail="Paciente no encontrado")
                
                cursor.execute("SELECT id FROM estado_sala_espera WHERE nombre = %s", (datos.estado,))
                estado = cursor.fetchone()
                if not estado:
                    orden_map = {
                        'pendiente': 1,
                        'llegada': 2,
                        'confirmada': 3,
                        'en_consulta': 4,
                        'completada': 5,
                        'no_asistio': 6
                    }
                    orden = orden_map.get(datos.estado, 99)
                    
                    cursor.execute("""
                        INSERT INTO estado_sala_espera (nombre, orden)
                        VALUES (%s, %s)
                    """, (datos.estado, orden))
                    estado_id = cursor.lastrowid
                    estado = {'id': estado_id}
                
                hoy = datetime.now().strftime('%Y-%m-%d')
                cursor.execute("""
                    SELECT id, estado_id FROM sala_espera 
                    WHERE paciente_id = %s AND DATE(fecha_hora_ingreso) = %s
                """, (paciente_id, hoy))
                
                registro = cursor.fetchone()
                
                if registro:
                    estado_anterior_id = registro['estado_id']
                    
                    cursor.execute("""
                        UPDATE sala_espera 
                        SET estado_id = %s, 
                            fecha_hora_cambio_estado = NOW(),
                            tiempo_espera_minutos = TIMESTAMPDIFF(MINUTE, fecha_hora_ingreso, NOW())
                        WHERE id = %s
                    """, (estado['id'], registro['id']))
                    
                    try:
                        cursor.execute("""
                            INSERT INTO historial_sala_espera 
                            (sala_espera_id, estado_anterior_id, estado_nuevo_id, fecha_hora_cambio) 
                            VALUES (%s, %s, %s, NOW())
                        """, (registro['id'], estado_anterior_id, estado['id']))
                    except:
                        pass
                else:
                    hora_cita_programada = None
                    tiene_cita_hoy = False
                    
                    if datos.cita_id:
                        cursor.execute("""
                            SELECT fecha_hora FROM cita 
                            WHERE id = %s
                        """, (datos.cita_id,))
                        cita = cursor.fetchone()
                        if cita and cita['fecha_hora']:
                            try:
                                hora_cita = datetime.strptime(
                                    str(cita['fecha_hora']), 
                                    '%Y-%m-%d %H:%M:%S'
                                )
                                hora_cita_programada = hora_cita.strftime('%H:%M:%S')
                                tiene_cita_hoy = True
                            except:
                                hora_cita_programada = None
                    
                    cursor.execute("""
                        INSERT INTO sala_espera 
                        (paciente_id, cita_id, estado_id, fecha_hora_ingreso, tiene_cita_hoy, hora_cita_programada) 
                        VALUES (%s, %s, %s, NOW(), %s, %s)
                    """, (
                        paciente_id,
                        datos.cita_id,
                        estado['id'],
                        tiene_cita_hoy,
                        hora_cita_programada
                    ))
                    
                    registro_id = cursor.lastrowid
                    
                    try:
                        cursor.execute("""
                            INSERT INTO historial_sala_espera 
                            (sala_espera_id, estado_nuevo_id, fecha_hora_cambio) 
                            VALUES (%s, %s, NOW())
                        """, (registro_id, estado['id']))
                    except:
                        pass
                
                conn.commit()
                
                return {
                    "success": True,
                    "message": f"Estado actualizado a '{datos.estado}'",
                    "paciente_id": paciente_id,
                    "estado": datos.estado,
                    "timestamp": datetime.now().isoformat()
                }
                
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error actualizando estado: {str(e)}")

@router.put("/bulk-estados", response_model=dict)
def bulk_update_estados_sala_espera(request: BulkUpdateEstadosRequest):
    try:
        conn = get_connection()
        with conn:
            with conn.cursor() as cursor:
                actualizados = 0
                errores = []
                hoy = datetime.now().strftime('%Y-%m-%d')
                
                estados_necesarios = set(request.cambios.values())
                estado_ids = {}
                
                for estado_nombre in estados_necesarios:
                    cursor.execute("SELECT id FROM estado_sala_espera WHERE nombre = %s", (estado_nombre,))
                    estado = cursor.fetchone()
                    if estado:
                        estado_ids[estado_nombre] = estado['id']
                    else:
                        orden_map = {
                            'pendiente': 1,
                            'llegada': 2,
                            'confirmada': 3,
                            'en_consulta': 4,
                            'completada': 5,
                            'no_asistio': 6
                        }
                        orden = orden_map.get(estado_nombre, 99)
                        
                        cursor.execute("""
                            INSERT INTO estado_sala_espera (nombre, orden)
                            VALUES (%s, %s)
                        """, (estado_nombre, orden))
                        estado_id = cursor.lastrowid
                        estado_ids[estado_nombre] = estado_id
                
                for paciente_id_str, estado_nombre in request.cambios.items():
                    try:
                        paciente_id = int(paciente_id_str)
                        estado_id = estado_ids.get(estado_nombre)
                        
                        if not estado_id:
                            errores.append(f"Estado '{estado_nombre}' no válido para paciente {paciente_id}")
                            continue
                        
                        cursor.execute("""
                            SELECT id, estado_id FROM sala_espera 
                            WHERE paciente_id = %s AND DATE(fecha_hora_ingreso) = %s
                        """, (paciente_id, hoy))
                        
                        registro = cursor.fetchone()
                        
                        if registro:
                            estado_anterior_id = registro['estado_id']
                            
                            cursor.execute("""
                                UPDATE sala_espera 
                                SET estado_id = %s, 
                                    fecha_hora_cambio_estado = NOW(),
                                    tiempo_espera_minutos = TIMESTAMPDIFF(MINUTE, fecha_hora_ingreso, NOW())
                                WHERE id = %s
                            """, (estado_id, registro['id']))
                            
                            try:
                                cursor.execute("""
                                    INSERT INTO historial_sala_espera 
                                    (sala_espera_id, estado_anterior_id, estado_nuevo_id, fecha_hora_cambio) 
                                    VALUES (%s, %s, %s, NOW())
                                """, (registro['id'], estado_anterior_id, estado_id))
                            except:
                                pass
                        else:
                            cursor.execute("""
                                SELECT id, fecha_hora FROM cita 
                                WHERE paciente_id = %s AND DATE(fecha_hora) = %s
                                LIMIT 1
                            """, (paciente_id, hoy))
                            
                            cita = cursor.fetchone()
                            tiene_cita_hoy = cita is not None
                            cita_id = cita['id'] if cita else None
                            hora_cita_programada = None
                            
                            if cita and cita['fecha_hora']:
                                try:
                                    hora_cita = datetime.strptime(
                                        str(cita['fecha_hora']), 
                                        '%Y-%m-%d %H:%M:%S'
                                    )
                                    hora_cita_programada = hora_cita.strftime('%H:%M:%S')
                                except:
                                    hora_cita_programada = None
                            
                            cursor.execute("""
                                INSERT INTO sala_espera 
                                (paciente_id, cita_id, estado_id, fecha_hora_ingreso, tiene_cita_hoy, hora_cita_programada) 
                                VALUES (%s, %s, %s, NOW(), %s, %s)
                            """, (
                                paciente_id,
                                cita_id,
                                estado_id,
                                tiene_cita_hoy,
                                hora_cita_programada
                            ))
                            
                            registro_id = cursor.lastrowid
                            
                            try:
                                cursor.execute("""
                                    INSERT INTO historial_sala_espera 
                                    (sala_espera_id, estado_nuevo_id, fecha_hora_cambio) 
                                    VALUES (%s, %s, NOW())
                                """, (registro_id, estado_id))
                            except:
                                pass
                        
                        actualizados += 1
                        
                    except Exception as e:
                        error_msg = f"Error con paciente {paciente_id}: {str(e)}"
                        errores.append(error_msg)
                        continue
                
                conn.commit()
                
                return {
                    "success": True,
                    "message": f"Se actualizaron {actualizados} pacientes",
                    "actualizados": actualizados,
                    "errores": errores if errores else None,
                    "timestamp": datetime.now().isoformat()
                }
                
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error actualizando estados: {str(e)}")

@router.get("/estadisticas", response_model=dict)
def get_estadisticas_sala_espera():
    try:
        conn = get_connection()
        with conn:
            with conn.cursor() as cursor:
                hoy = datetime.now().strftime('%Y-%m-%d')
                
                cursor.execute("""
                    SELECT 
                        COUNT(DISTINCT p.id) as total_pacientes,
                        SUM(CASE WHEN c.id IS NOT NULL AND DATE(c.fecha_hora) = %s THEN 1 ELSE 0 END) as con_cita_hoy,
                        SUM(CASE WHEN c.id IS NULL OR DATE(c.fecha_hora) != %s THEN 1 ELSE 0 END) as sin_cita_hoy
                    FROM paciente p
                    LEFT JOIN cita c ON p.id = c.paciente_id AND DATE(c.fecha_hora) = %s
                """, (hoy, hoy, hoy))
                
                general_stats = cursor.fetchone()
                
                cursor.execute("""
                    SELECT 
                        COALESCE(ese.nombre, 'pendiente') as estado,
                        COUNT(*) as cantidad,
                        AVG(TIMESTAMPDIFF(MINUTE, se.fecha_hora_ingreso, NOW())) as tiempo_promedio_espera
                    FROM sala_espera se
                    LEFT JOIN estado_sala_espera ese ON se.estado_id = ese.id
                    WHERE DATE(se.fecha_hora_ingreso) = %s
                    GROUP BY ese.nombre
                """, (hoy,))
                
                estados_stats = cursor.fetchall()
                
                estadisticas = {
                    'total': general_stats['total_pacientes'] or 0,
                    'con_cita_hoy': general_stats['con_cita_hoy'] or 0,
                    'sin_cita_hoy': general_stats['sin_cita_hoy'] or 0,
                    'pendientes': 0,
                    'llegadas': 0,
                    'confirmadas': 0,
                    'en_consulta': 0,
                    'completadas': 0,
                    'no_asistieron': 0,
                    'tiempo_promedio_espera': 0,
                    'tiempo_promedio_consulta': 25
                }
                
                for stat in estados_stats:
                    estado = stat['estado']
                    cantidad = stat['cantidad']
                    tiempo_promedio = stat['tiempo_promedio_espera'] or 0
                    
                    if estado == 'pendiente':
                        estadisticas['pendientes'] = cantidad
                    elif estado == 'llegada':
                        estadisticas['llegadas'] = cantidad
                    elif estado == 'confirmada':
                        estadisticas['confirmadas'] = cantidad
                    elif estado == 'en_consulta':
                        estadisticas['en_consulta'] = cantidad
                    elif estado == 'completada':
                        estadisticas['completadas'] = cantidad
                    elif estado == 'no_asistio':
                        estadisticas['no_asistieron'] = cantidad
                    
                    if cantidad > 0:
                        estadisticas['tiempo_promedio_espera'] = tiempo_promedio
                
                cursor.execute("""
                    SELECT AVG(TIMESTAMPDIFF(MINUTE, c.fecha_hora, NOW())) as tiempo_promedio_consulta
                    FROM cita c
                    WHERE DATE(c.fecha_hora) = %s 
                    AND c.estado_id = 3
                    AND c.fecha_hora IS NOT NULL
                """, (hoy,))
                
                consulta_time = cursor.fetchone()
                if consulta_time and consulta_time['tiempo_promedio_consulta']:
                    estadisticas['tiempo_promedio_consulta'] = consulta_time['tiempo_promedio_consulta']
                
                return {
                    "success": True,
                    "fecha": hoy,
                    "estadisticas": estadisticas
                }
                
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error obteniendo estadísticas: {str(e)}")
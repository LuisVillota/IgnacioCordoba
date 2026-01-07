from fastapi import APIRouter, HTTPException, Query, Depends
import pymysql
from typing import Optional
from datetime import datetime

from app.core.database import get_connection
from app.models.schemas.paciente import (
    PacienteCreate, PacienteUpdate, PacienteInDB, 
    PacienteBusqueda, MessageResponse
)

router = APIRouter()

@router.get("/", response_model=dict)
def get_pacientes(
    limit: int = Query(100, description="Número máximo de resultados"),
    offset: int = Query(0, description="Desplazamiento para paginación")
):
    """
    Obtiene lista de pacientes con paginación
    """
    try:
        conn = get_connection()
        with conn:
            with conn.cursor() as cursor:
                # Obtener total
                cursor.execute("SELECT COUNT(*) as total FROM paciente")
                total = cursor.fetchone()['total']
                
                # Obtener pacientes paginados
                cursor.execute("""
                    SELECT * FROM paciente 
                    ORDER BY id DESC 
                    LIMIT %s OFFSET %s
                """, (limit, offset))
                pacientes = cursor.fetchall()
                
                return {
                    "total": total,
                    "limit": limit,
                    "offset": offset,
                    "pacientes": pacientes
                }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{paciente_id}", response_model=dict)
def get_paciente(paciente_id: int):
    """
    Obtiene un paciente por ID
    """
    try:
        conn = get_connection()
        with conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT * FROM paciente WHERE id = %s
                """, (paciente_id,))
                paciente = cursor.fetchone()
                
                if not paciente:
                    raise HTTPException(status_code=404, detail="Paciente no encontrado")
                
                return paciente
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/", response_model=dict)
def create_paciente(paciente: PacienteCreate):
    """
    Crea un nuevo paciente
    """
    try:
        conn = get_connection()
        with conn:
            with conn.cursor() as cursor:
                # Verificar si el documento ya existe
                cursor.execute(
                    "SELECT id FROM paciente WHERE numero_documento = %s", 
                    (paciente.numero_documento,)
                )
                if cursor.fetchone():
                    raise HTTPException(
                        status_code=400, 
                        detail="El número de documento ya existe"
                    )
                
                # Insertar paciente
                cursor.execute("""
                    INSERT INTO paciente (
                        numero_documento, tipo_documento, nombre, apellido,
                        fecha_nacimiento, genero, telefono, email, 
                        direccion, ciudad, fecha_registro
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
                """, (
                    paciente.numero_documento,
                    paciente.tipo_documento,
                    paciente.nombre,
                    paciente.apellido,
                    paciente.fecha_nacimiento,
                    paciente.genero,
                    paciente.telefono,
                    paciente.email,
                    paciente.direccion,
                    paciente.ciudad
                ))
                
                paciente_id = cursor.lastrowid
                conn.commit()
                
                return {
                    "success": True,
                    "message": "Paciente creado exitosamente",
                    "paciente_id": paciente_id
                }
    except HTTPException:
        raise
    except pymysql.err.IntegrityError as e:
        if "numero_documento" in str(e):
            raise HTTPException(
                status_code=400, 
                detail="El número de documento ya existe"
            )
        raise HTTPException(status_code=500, detail="Error de base de datos")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{paciente_id}", response_model=dict)
def update_paciente(paciente_id: int, paciente: PacienteUpdate):
    """
    Actualiza un paciente existente
    """
    try:
        conn = get_connection()
        with conn:
            with conn.cursor() as cursor:
                # Verificar que el paciente existe
                cursor.execute("""
                    SELECT id FROM paciente WHERE id = %s
                """, (paciente_id,))
                if not cursor.fetchone():
                    raise HTTPException(status_code=404, detail="Paciente no encontrado")
                
                # Verificar que el documento no esté duplicado
                if paciente.numero_documento:
                    cursor.execute("""
                        SELECT id FROM paciente 
                        WHERE numero_documento = %s AND id != %s
                    """, (paciente.numero_documento, paciente_id))
                    
                    if cursor.fetchone():
                        raise HTTPException(
                            status_code=400, 
                            detail="El número de documento ya está registrado en otro paciente"
                        )
                
                # Construir query dinámica
                update_fields = []
                values = []
                
                field_mapping = {
                    'numero_documento': paciente.numero_documento,
                    'tipo_documento': paciente.tipo_documento,
                    'nombre': paciente.nombre,
                    'apellido': paciente.apellido,
                    'fecha_nacimiento': paciente.fecha_nacimiento,
                    'genero': paciente.genero,
                    'telefono': paciente.telefono,
                    'email': paciente.email,
                    'direccion': paciente.direccion,
                    'ciudad': paciente.ciudad
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
                
                values.append(paciente_id)
                query = f"UPDATE paciente SET {', '.join(update_fields)} WHERE id = %s"
                
                cursor.execute(query, values)
                conn.commit()
                
                return {
                    "success": True,
                    "message": "Paciente actualizado exitosamente",
                    "paciente_id": paciente_id
                }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{paciente_id}", response_model=dict)
def delete_paciente(paciente_id: int):
    """
    Elimina un paciente y sus registros relacionados
    """
    try:
        conn = get_connection()
        with conn:
            with conn.cursor() as cursor:
                # Obtener información del paciente
                cursor.execute("""
                    SELECT id, nombre, apellido 
                    FROM paciente WHERE id = %s
                """, (paciente_id,))
                
                paciente = cursor.fetchone()
                if not paciente:
                    raise HTTPException(status_code=404, detail="Paciente no encontrado")
                
                # Contar registros relacionados
                cursor.execute("""
                    SELECT COUNT(*) as count FROM cita 
                    WHERE paciente_id = %s
                """, (paciente_id,))
                citas_count = cursor.fetchone()['count']
                
                cursor.execute("""
                    SELECT COUNT(*) as count FROM historial_clinico 
                    WHERE paciente_id = %s
                """, (paciente_id,))
                historias_count = cursor.fetchone()['count']
                
                # Eliminar registros relacionados primero (si existen)
                if historias_count > 0:
                    try:
                        cursor.execute("""
                            DELETE FROM historial_clinico 
                            WHERE paciente_id = %s
                        """, (paciente_id,))
                    except:
                        pass  # Si la tabla no existe, continuar
                
                if citas_count > 0:
                    cursor.execute("""
                        DELETE FROM cita WHERE paciente_id = %s
                    """, (paciente_id,))
                
                # Eliminar el paciente
                cursor.execute("DELETE FROM paciente WHERE id = %s", (paciente_id,))
                conn.commit()
                
                return {
                    "success": True,
                    "message": "Paciente y registros relacionados eliminados exitosamente",
                    "paciente_id": paciente_id,
                    "paciente_nombre": f"{paciente['nombre']} {paciente['apellido']}",
                    "citas_eliminadas": citas_count,
                    "historias_eliminadas": historias_count
                }
                
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/todos", response_model=dict)
def get_todos_pacientes():
    """
    Obtiene todos los pacientes para selección en formularios
    """
    try:
        conn = get_connection()
        with conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT 
                        id,
                        nombre,
                        apellido,
                        CONCAT(nombre, ' ', apellido) as nombre_completo,
                        numero_documento,
                        tipo_documento,
                        fecha_nacimiento,
                        genero,
                        telefono,
                        email,
                        direccion,
                        ciudad,
                        TIMESTAMPDIFF(YEAR, fecha_nacimiento, CURDATE()) as edad,
                        fecha_registro
                    FROM paciente
                    ORDER BY apellido, nombre
                """)
                pacientes = cursor.fetchall()
                
                return {
                    "success": True,
                    "total": len(pacientes),
                    "pacientes": pacientes
                }
                
    except Exception as e:
        raise HTTPException(status_code=500, detail={
            "error": "Error obteniendo pacientes",
            "message": str(e)
        })

@router.get("/buscar", response_model=dict)
def buscar_pacientes(
    q: str = Query("", description="Texto para buscar por nombre, apellido o documento"),
    limit: int = Query(10, description="Límite de resultados")
):
    """
    Busca pacientes para autocompletar en formularios
    """
    try:
        conn = get_connection()
        with conn:
            with conn.cursor() as cursor:
                query = """
                    SELECT 
                        id,
                        CONCAT(nombre, ' ', apellido) as nombre_completo,
                        numero_documento as documento,
                        telefono,
                        email,
                        fecha_nacimiento,
                        TIMESTAMPDIFF(YEAR, fecha_nacimiento, CURDATE()) as edad
                    FROM paciente
                    WHERE 
                        nombre LIKE %s OR 
                        apellido LIKE %s OR 
                        numero_documento LIKE %s
                    ORDER BY nombre, apellido
                    LIMIT %s
                """
                search_term = f"%{q}%"
                
                cursor.execute(query, (search_term, search_term, search_term, limit))
                pacientes = cursor.fetchall()
                
                return {
                    "pacientes": pacientes,
                    "total": len(pacientes)
                }
                
    except Exception as e:
        raise HTTPException(status_code=500, detail={
            "error": "Error buscando pacientes",
            "message": str(e)
        })
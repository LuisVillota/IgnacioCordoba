from fastapi import APIRouter, HTTPException, Query
import hashlib
from typing import Optional
from datetime import datetime
import pymysql

from app.core.database import get_connection
from app.models.schemas.usuario import UsuarioCreate, UsuarioUpdate

router = APIRouter()

@router.post("/", response_model=dict)
def create_usuario(usuario: UsuarioCreate):
    """
    Crear un nuevo usuario
    """
    try:
        password_hash = hashlib.sha256(usuario.password.encode()).hexdigest()
        conn = get_connection()
        with conn:
            with conn.cursor() as cursor:
                # Verificar si el username ya existe
                cursor.execute("SELECT id FROM usuario WHERE username = %s", (usuario.username,))
                if cursor.fetchone():
                    raise HTTPException(status_code=400, detail="El nombre de usuario ya existe")
                
                # Verificar si el email ya existe
                cursor.execute("SELECT id FROM usuario WHERE email = %s", (usuario.email,))
                if cursor.fetchone():
                    raise HTTPException(status_code=400, detail="El email ya está registrado")
                
                # Verificar que el rol existe
                cursor.execute("SELECT id FROM rol WHERE id = %s", (usuario.rol_id,))
                if not cursor.fetchone():
                    raise HTTPException(status_code=400, detail="El rol especificado no existe")
                
                cursor.execute("""
                    INSERT INTO usuario (username, password, nombre, email, rol_id, activo)
                    VALUES (%s, %s, %s, %s, %s, %s)
                """, (
                    usuario.username,
                    password_hash,
                    usuario.nombre,
                    usuario.email,
                    usuario.rol_id,
                    1 if usuario.activo else 0
                ))
                usuario_id = cursor.lastrowid
                conn.commit()
                
                return {
                    "success": True,
                    "message": "Usuario creado exitosamente",
                    "usuario_id": usuario_id
                }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/", response_model=dict)
def get_usuarios():
    """
    Obtener todos los usuarios
    """
    try:
        conn = get_connection()
        with conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT u.id, u.username, u.nombre, u.email, r.tipo_rol as rol, u.activo
                    FROM usuario u 
                    JOIN rol r ON u.rol_id = r.id
                    ORDER BY u.id
                """)
                usuarios = cursor.fetchall()
                return {"total": len(usuarios), "usuarios": usuarios}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ¡IMPORTANTE: Esta ruta debe ir ANTES de la ruta con parámetro {usuario_id}!
@router.get("/login", response_model=dict)
def login(username: str = Query(..., description="Nombre de usuario"), 
          password: str = Query(..., description="Contraseña")):
    """
    Login de usuario
    """
    try:
        password_hash = hashlib.sha256(password.encode()).hexdigest()
        
        conn = get_connection()
        with conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT u.id, u.username, u.nombre, u.email, r.tipo_rol as rol, u.activo
                    FROM usuario u 
                    JOIN rol r ON u.rol_id = r.id
                    WHERE u.username = %s AND u.password = %s AND u.activo = 1
                """, (username, password_hash))
                
                usuario = cursor.fetchone()
                if not usuario:
                    raise HTTPException(status_code=401, detail="Credenciales incorrectas o usuario inactivo")
                
                return {
                    "success": True, 
                    "message": "Login exitoso",
                    "usuario": usuario,
                    "token": "simulado_para_desarrollo"
                }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{usuario_id}", response_model=dict)
def get_usuario(usuario_id: int):
    """
    Obtener un usuario por ID
    """
    try:
        conn = get_connection()
        with conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT u.id, u.username, u.nombre, u.email, r.tipo_rol as rol, u.activo
                    FROM usuario u 
                    JOIN rol r ON u.rol_id = r.id
                    WHERE u.id = %s
                """, (usuario_id,))
                usuario = cursor.fetchone()
                if not usuario:
                    raise HTTPException(status_code=404, detail="Usuario no encontrado")
                return usuario
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{usuario_id}", response_model=dict)
def update_usuario(usuario_id: int, usuario: UsuarioUpdate):
    """
    Actualizar un usuario existente
    """
    try:
        conn = get_connection()
        with conn:
            with conn.cursor() as cursor:
                # Verificar que el usuario existe
                cursor.execute("SELECT id FROM usuario WHERE id = %s", (usuario_id,))
                if not cursor.fetchone():
                    raise HTTPException(status_code=404, detail="Usuario no encontrado")
                
                update_fields = []
                values = []
                
                if usuario.username is not None:
                    cursor.execute("SELECT id FROM usuario WHERE username = %s AND id != %s", (usuario.username, usuario_id))
                    if cursor.fetchone():
                        raise HTTPException(status_code=400, detail="El nombre de usuario ya está en uso")
                    update_fields.append("username = %s")
                    values.append(usuario.username)
                
                if usuario.password is not None:
                    password_hash = hashlib.sha256(usuario.password.encode()).hexdigest()
                    update_fields.append("password = %s")
                    values.append(password_hash)
                
                if usuario.nombre is not None:
                    update_fields.append("nombre = %s")
                    values.append(usuario.nombre)
                
                if usuario.email is not None:
                    cursor.execute("SELECT id FROM usuario WHERE email = %s AND id != %s", (usuario.email, usuario_id))
                    if cursor.fetchone():
                        raise HTTPException(status_code=400, detail="El email ya está en uso")
                    update_fields.append("email = %s")
                    values.append(usuario.email)
                
                if usuario.rol_id is not None:
                    cursor.execute("SELECT id FROM rol WHERE id = %s", (usuario.rol_id,))
                    if not cursor.fetchone():
                        raise HTTPException(status_code=400, detail="El rol especificado no existe")
                    update_fields.append("rol_id = %s")
                    values.append(usuario.rol_id)
                
                if usuario.activo is not None:
                    update_fields.append("activo = %s")
                    values.append(1 if usuario.activo else 0)
                
                if not update_fields:
                    raise HTTPException(status_code=400, detail="No se proporcionaron datos para actualizar")
                
                values.append(usuario_id)
                query = f"UPDATE usuario SET {', '.join(update_fields)} WHERE id = %s"
                cursor.execute(query, values)
                conn.commit()
                
                return {
                    "success": True,
                    "message": "Usuario actualizado exitosamente",
                    "usuario_id": usuario_id
                }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{usuario_id}", response_model=dict)
def delete_usuario(usuario_id: int):
    """
    Eliminar un usuario
    """
    try:
        conn = get_connection()
        with conn:
            with conn.cursor() as cursor:
                # Verificar que el usuario existe
                cursor.execute("SELECT id, nombre, username FROM usuario WHERE id = %s", (usuario_id,))
                usuario = cursor.fetchone()
                if not usuario:
                    raise HTTPException(status_code=404, detail="Usuario no encontrado")
                
                # No permitir eliminar el último administrador
                cursor.execute("SELECT COUNT(*) as count FROM usuario WHERE rol_id = 1 AND activo = 1")
                admin_count = cursor.fetchone()['count']
                
                if admin_count <= 1:
                    cursor.execute("SELECT rol_id FROM usuario WHERE id = %s", (usuario_id,))
                    user_rol = cursor.fetchone()
                    if user_rol and user_rol['rol_id'] == 1:
                        raise HTTPException(
                            status_code=400, 
                            detail="No se puede eliminar el último administrador activo"
                        )
                
                # Eliminar el usuario
                cursor.execute("DELETE FROM usuario WHERE id = %s", (usuario_id,))
                conn.commit()
                
                return {
                    "success": True,
                    "message": "Usuario eliminado exitosamente",
                    "usuario_id": usuario_id,
                    "usuario_nombre": usuario['nombre'],
                    "usuario_username": usuario['username']
                }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Endpoint temporal alternativo (si aún tienes problemas)
@router.get("/auth/login", response_model=dict)
def login_alternativo(username: str = Query(..., description="Nombre de usuario"), 
                     password: str = Query(..., description="Contraseña")):
    """
    Endpoint alternativo de login (temporal)
    """
    try:
        password_hash = hashlib.sha256(password.encode()).hexdigest()
        
        conn = get_connection()
        with conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT u.id, u.username, u.nombre, u.email, r.tipo_rol as rol, u.activo
                    FROM usuario u 
                    JOIN rol r ON u.rol_id = r.id
                    WHERE u.username = %s AND u.password = %s AND u.activo = 1
                """, (username, password_hash))
                
                usuario = cursor.fetchone()
                if not usuario:
                    raise HTTPException(status_code=401, detail="Credenciales incorrectas o usuario inactivo")
                
                return {
                    "success": True, 
                    "message": "Login exitoso",
                    "usuario": usuario,
                    "token": "simulado_para_desarrollo"
                }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
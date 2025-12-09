from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from .core.config import settings
import pymysql
from datetime import datetime
from pydantic import BaseModel
from typing import Optional

# PRIMERO definir la aplicación
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ========================================
# MODELOS PYDANTIC (deben ir antes de los endpoints)
# ========================================

class PacienteBase(BaseModel):
    numero_documento: str
    tipo_documento: Optional[str] = "CC"
    nombre: str
    apellido: str
    fecha_nacimiento: Optional[str] = None
    genero: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[str] = None
    direccion: Optional[str] = None
    ciudad: Optional[str] = None

class PacienteCreate(PacienteBase):
    pass

class PacienteUpdate(PacienteBase):
    pass

class CitaCreate(BaseModel):
    paciente_id: int
    usuario_id: int
    fecha_hora: str
    tipo: str = "control"
    duracion_minutos: int = 30
    estado_id: int = 4  # pendiente
    notas: Optional[str] = None

class CitaUpdate(BaseModel):
    paciente_id: int
    usuario_id: int
    fecha_hora: str
    tipo: str = "control"
    duracion_minutos: int = 30
    estado_id: int
    notas: Optional[str] = None

class ProcedimientoBase(BaseModel):
    codigo: str
    nombre: str
    descripcion: Optional[str] = None
    precio_base: float
    activo: bool = True

class MessageResponse(BaseModel):
    message: str

# ========================================
# ENDPOINTS BÁSICOS
# ========================================

@app.get("/")
def root():
    return {"message": "API del Consultorio Dr. Ignacio Córdoba", "version": settings.VERSION}

@app.get("/health")
def health_check():
    return {"status": "healthy", "database": "MySQL"}

# ========================================
# ENDPOINTS DE USUARIOS
# ========================================

@app.get("/api/usuarios")
def get_usuarios():
    """Obtener todos los usuarios"""
    try:
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='root',
            database='prueba_consultorio_db',
            port=3306,
            cursorclass=pymysql.cursors.DictCursor
        )
        with conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT u.id, u.username, u.nombre, u.email, r.nombre as rol, u.activo
                    FROM Usuario u 
                    JOIN Rol r ON u.rol_id = r.id
                    ORDER BY u.id
                """)
                usuarios = cursor.fetchall()
                return {"total": len(usuarios), "usuarios": usuarios}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/usuarios/{usuario_id}")
def get_usuario(usuario_id: int):
    """Obtener un usuario específico por ID"""
    try:
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='root',
            database='prueba_consultorio_db',
            port=3306,
            cursorclass=pymysql.cursors.DictCursor
        )
        with conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT u.id, u.username, u.nombre, u.email, r.nombre as rol, u.activo
                    FROM Usuario u 
                    JOIN Rol r ON u.rol_id = r.id
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

# ========================================
# ENDPOINTS DE LOGIN
# ========================================

@app.get("/api/login")
def login(username: str, password: str):
    """Login de usuario"""
    try:
        import hashlib
        password_hash = hashlib.sha256(password.encode()).hexdigest()
        
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='root',
            database='prueba_consultorio_db',
            port=3306,
            cursorclass=pymysql.cursors.DictCursor
        )
        with conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT u.id, u.username, u.nombre, u.email, r.nombre as rol, u.activo
                    FROM Usuario u 
                    JOIN Rol r ON u.rol_id = r.id
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

# ========================================
# ENDPOINTS DE PACIENTES
# ========================================

@app.get("/api/pacientes", response_model=dict)
def get_pacientes(limit: int = 100, offset: int = 0):
    """Obtener todos los pacientes con paginación"""
    try:
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='root',
            database='prueba_consultorio_db',
            port=3306,
            cursorclass=pymysql.cursors.DictCursor
        )
        with conn:
            with conn.cursor() as cursor:
                # Obtener total
                cursor.execute("SELECT COUNT(*) as total FROM Paciente")
                total = cursor.fetchone()['total']
                
                # Obtener pacientes paginados
                cursor.execute("""
                    SELECT * FROM Paciente 
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

@app.get("/api/pacientes/{paciente_id}", response_model=dict)
def get_paciente(paciente_id: int):
    """Obtener un paciente específico por ID"""
    try:
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='root',
            database='prueba_consultorio_db',
            port=3306,
            cursorclass=pymysql.cursors.DictCursor
        )
        with conn:
            with conn.cursor() as cursor:
                cursor.execute("SELECT * FROM Paciente WHERE id = %s", (paciente_id,))
                paciente = cursor.fetchone()
                if not paciente:
                    raise HTTPException(status_code=404, detail="Paciente no encontrado")
                return paciente
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/pacientes", response_model=dict)
def create_paciente(paciente: PacienteCreate):
    """Crear un nuevo paciente"""
    try:
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='root',
            database='prueba_consultorio_db',
            port=3306
        )
        with conn:
            with conn.cursor() as cursor:
                # Verificar si el documento ya existe
                cursor.execute(
                    "SELECT id FROM Paciente WHERE numero_documento = %s", 
                    (paciente.numero_documento,)
                )
                if cursor.fetchone():
                    raise HTTPException(status_code=400, detail="El número de documento ya existe")
                
                # Insertar nuevo paciente
                cursor.execute("""
                    INSERT INTO Paciente (
                        numero_documento, tipo_documento, nombre, apellido,
                        fecha_nacimiento, genero, telefono, email, direccion, ciudad
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
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
            raise HTTPException(status_code=400, detail="El número de documento ya existe")
        raise HTTPException(status_code=500, detail="Error de base de datos")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/pacientes/{paciente_id}", response_model=dict)
def update_paciente(paciente_id: int, paciente: PacienteUpdate):
    """Actualizar un paciente existente"""
    try:
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='root',
            database='prueba_consultorio_db',
            port=3306
        )
        with conn:
            with conn.cursor() as cursor:
                # Verificar si el paciente existe
                cursor.execute("SELECT id FROM Paciente WHERE id = %s", (paciente_id,))
                if not cursor.fetchone():
                    raise HTTPException(status_code=404, detail="Paciente no encontrado")
                
                # Verificar si el nuevo documento ya existe en otro paciente
                cursor.execute("""
                    SELECT id FROM Paciente 
                    WHERE numero_documento = %s AND id != %s
                """, (paciente.numero_documento, paciente_id))
                if cursor.fetchone():
                    raise HTTPException(
                        status_code=400, 
                        detail="El número de documento ya está registrado en otro paciente"
                    )
                
                # Actualizar paciente
                cursor.execute("""
                    UPDATE Paciente SET
                        numero_documento = %s,
                        tipo_documento = %s,
                        nombre = %s,
                        apellido = %s,
                        fecha_nacimiento = %s,
                        genero = %s,
                        telefono = %s,
                        email = %s,
                        direccion = %s,
                        ciudad = %s
                    WHERE id = %s
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
                    paciente.ciudad,
                    paciente_id
                ))
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

@app.delete("/api/pacientes/{paciente_id}", response_model=MessageResponse)
def delete_paciente(paciente_id: int):
    """Eliminar un paciente"""
    try:
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='root',
            database='prueba_consultorio_db',
            port=3306
        )
        with conn:
            with conn.cursor() as cursor:
                # Verificar si el paciente existe
                cursor.execute("SELECT id FROM Paciente WHERE id = %s", (paciente_id,))
                if not cursor.fetchone():
                    raise HTTPException(status_code=404, detail="Paciente no encontrado")
                
                # Eliminar paciente
                cursor.execute("DELETE FROM Paciente WHERE id = %s", (paciente_id,))
                conn.commit()
                
                return MessageResponse(message="Paciente eliminado exitosamente")
                
    except pymysql.err.IntegrityError as e:
        raise HTTPException(
            status_code=400, 
            detail="No se puede eliminar el paciente porque tiene registros relacionados"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ========================================
# ENDPOINTS DE CITAS
# ========================================

@app.get("/api/citas")
def get_citas(limit: int = 50, offset: int = 0):
    """Obtener todas las citas"""
    try:
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='root',
            database='prueba_consultorio_db',
            port=3306,
            cursorclass=pymysql.cursors.DictCursor
        )
        with conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT c.*, 
                           p.nombre as paciente_nombre, 
                           p.apellido as paciente_apellido,
                           u.nombre as doctor_nombre,
                           ec.nombre as estado_nombre,
                           ec.color as estado_color
                    FROM Cita c
                    JOIN Paciente p ON c.paciente_id = p.id
                    JOIN Usuario u ON c.usuario_id = u.id
                    JOIN Estado_Cita ec ON c.estado_id = ec.id
                    ORDER BY c.fecha_hora DESC
                    LIMIT %s OFFSET %s
                """, (limit, offset))
                citas = cursor.fetchall()
                return {"citas": citas}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/citas/{cita_id}")
def get_cita(cita_id: int):
    """Obtener una cita específica por ID"""
    try:
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='root',
            database='prueba_consultorio_db',
            port=3306,
            cursorclass=pymysql.cursors.DictCursor
        )
        with conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT c.*, 
                           p.nombre as paciente_nombre, 
                           p.apellido as paciente_apellido,
                           u.nombre as doctor_nombre,
                           ec.nombre as estado_nombre,
                           ec.color as estado_color
                    FROM Cita c
                    JOIN Paciente p ON c.paciente_id = p.id
                    JOIN Usuario u ON c.usuario_id = u.id
                    JOIN Estado_Cita ec ON c.estado_id = ec.id
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

@app.post("/api/citas", response_model=dict)
def create_cita(cita: CitaCreate):
    """Crear una nueva cita"""
    try:
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='root',
            database='prueba_consultorio_db',
            port=3306
        )
        with conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    INSERT INTO Cita (
                        paciente_id, usuario_id, fecha_hora, tipo,
                        duracion_minutos, estado_id, notas
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s)
                """, (
                    cita.paciente_id,
                    cita.usuario_id,
                    cita.fecha_hora,
                    cita.tipo,
                    cita.duracion_minutos,
                    cita.estado_id,
                    cita.notas
                ))
                cita_id = cursor.lastrowid
                conn.commit()
                
                return {
                    "success": True,
                    "message": "Cita creada exitosamente",
                    "cita_id": cita_id
                }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/citas/{cita_id}", response_model=dict)
def update_cita(cita_id: int, cita: CitaUpdate):
    """Actualizar una cita existente"""
    try:
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='root',
            database='prueba_consultorio_db',
            port=3306
        )
        with conn:
            with conn.cursor() as cursor:
                # Verificar si la cita existe
                cursor.execute("SELECT id FROM Cita WHERE id = %s", (cita_id,))
                if not cursor.fetchone():
                    raise HTTPException(status_code=404, detail="Cita no encontrada")
                
                # Actualizar cita
                cursor.execute("""
                    UPDATE Cita SET
                        paciente_id = %s,
                        usuario_id = %s,
                        fecha_hora = %s,
                        tipo = %s,
                        duracion_minutos = %s,
                        estado_id = %s,
                        notas = %s
                    WHERE id = %s
                """, (
                    cita.paciente_id,
                    cita.usuario_id,
                    cita.fecha_hora,
                    cita.tipo,
                    cita.duracion_minutos,
                    cita.estado_id,
                    cita.notas,
                    cita_id
                ))
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

@app.delete("/api/citas/{cita_id}", response_model=MessageResponse)
def delete_cita(cita_id: int):
    """Eliminar una cita"""
    try:
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='root',
            database='prueba_consultorio_db',
            port=3306
        )
        with conn:
            with conn.cursor() as cursor:
                # Verificar si la cita existe
                cursor.execute("SELECT id FROM Cita WHERE id = %s", (cita_id,))
                if not cursor.fetchone():
                    raise HTTPException(status_code=404, detail="Cita no encontrada")
                
                # Eliminar cita
                cursor.execute("DELETE FROM Cita WHERE id = %s", (cita_id,))
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

# ========================================
# ENDPOINTS DE ESTADOS
# ========================================

@app.get("/api/estados/citas")
def get_estados_citas():
    """Obtener todos los estados de cita"""
    try:
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='root',
            database='prueba_consultorio_db',
            port=3306,
            cursorclass=pymysql.cursors.DictCursor
        )
        with conn:
            with conn.cursor() as cursor:
                cursor.execute("SELECT * FROM Estado_Cita ORDER BY id")
                estados = cursor.fetchall()
                return {"estados": estados}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/estados/quirurgicos")
def get_estados_quirurgicos():
    """Obtener todos los estados quirúrgicos"""
    try:
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='root',
            database='prueba_consultorio_db',
            port=3306,
            cursorclass=pymysql.cursors.DictCursor
        )
        with conn:
            with conn.cursor() as cursor:
                cursor.execute("SELECT * FROM Estado_Quirurgico ORDER BY id")
                estados = cursor.fetchall()
                return {"estados": estados}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ========================================
# ENDPOINTS PARA PROCEDIMIENTOS
# ========================================

@app.get("/api/procedimientos", response_model=dict)
def get_procedimientos():
    """Obtener todos los procedimientos"""
    try:
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='root',
            database='prueba_consultorio_db',
            port=3306,
            cursorclass=pymysql.cursors.DictCursor
        )
        with conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT p.*, t.precio_base 
                    FROM Procedimiento p
                    LEFT JOIN Tarifa t ON p.tarifa_id = t.id
                    WHERE p.activo = 1
                    ORDER BY p.nombre
                """)
                procedimientos = cursor.fetchall()
                return {"procedimientos": procedimientos}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/procedimientos/{procedimiento_id}", response_model=dict)
def get_procedimiento(procedimiento_id: int):
    """Obtener un procedimiento específico por ID"""
    try:
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='root',
            database='prueba_consultorio_db',
            port=3306,
            cursorclass=pymysql.cursors.DictCursor
        )
        with conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT p.*, t.precio_base 
                    FROM Procedimiento p
                    LEFT JOIN Tarifa t ON p.tarifa_id = t.id
                    WHERE p.id = %s AND p.activo = 1
                """, (procedimiento_id,))
                procedimiento = cursor.fetchone()
                if not procedimiento:
                    raise HTTPException(status_code=404, detail="Procedimiento no encontrado")
                return procedimiento
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ========================================
# ENDPOINT DE TEST MEJORADO
# ========================================

@app.get("/api/test-frontend")
def test_frontend():
    """Endpoint para probar conexión con frontend"""
    try:
        # Probar conexión a la base de datos
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='root',
            database='prueba_consultorio_db',
            port=3306,
            cursorclass=pymysql.cursors.DictCursor
        )
        with conn:
            with conn.cursor() as cursor:
                # Obtener conteos
                cursor.execute("SELECT COUNT(*) as count FROM Paciente")
                pacientes_count = cursor.fetchone()['count']
                
                cursor.execute("SELECT COUNT(*) as count FROM Usuario")
                usuarios_count = cursor.fetchone()['count']
                
                cursor.execute("SELECT COUNT(*) as count FROM Cita")
                citas_count = cursor.fetchone()['count']
        
        return {
            "success": True,
            "message": "✅ Backend funcionando correctamente",
            "frontend_url": settings.FRONTEND_URL,
            "backend_url": settings.BACKEND_URL,
            "database": "MySQL - prueba_consultorio_db",
            "timestamp": datetime.now().isoformat(),
            "counts": {
                "pacientes": pacientes_count,
                "usuarios": usuarios_count,
                "citas": citas_count
            },
            "endpoints_disponibles": [
                "/api/usuarios",
                "/api/login",
                "/api/pacientes",
                "/api/pacientes/{id}",
                "/api/citas",
                "/api/citas/{id}",
                "/api/estados/citas",
                "/api/estados/quirurgicos",
                "/api/procedimientos",
                "/api/procedimientos/{id}",
                "/api/test-frontend"
            ]
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"❌ Error en el backend: {str(e)}",
            "timestamp": datetime.now().isoformat()
        }
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from .core.config import settings
import pymysql
import os
import shutil
from datetime import datetime
from pydantic import BaseModel
from typing import Optional

# Configurar directorio para archivos subidos
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(os.path.join(UPLOAD_DIR, "historias"), exist_ok=True)

# PRIMERO definir la aplicación
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Montar directorio de archivos estáticos
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

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
# MODELOS PYDANTIC PARA HISTORIAS CLÍNICAS
# ========================================

class HistorialClinicoBase(BaseModel):
    paciente_id: int
    motivo_consulta: Optional[str] = None
    antecedentes_medicos: Optional[str] = None
    antecedentes_quirurgicos: Optional[str] = None
    antecedentes_alergicos: Optional[str] = None
    antecedentes_farmacologicos: Optional[str] = None
    exploracion_fisica: Optional[str] = None
    diagnostico: Optional[str] = None
    tratamiento: Optional[str] = None
    recomendaciones: Optional[str] = None
    fotos: Optional[str] = None

class HistorialClinicoCreate(HistorialClinicoBase):
    pass

class HistorialClinicoUpdate(HistorialClinicoBase):
    pass

class FileUploadResponse(BaseModel):
    success: bool
    message: str
    url: Optional[str] = None
    filename: Optional[str] = None

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
# ENDPOINTS DE USUARIOS (CORREGIDOS)
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
                    SELECT u.id, u.username, u.nombre, u.email, r.tipo_rol as rol, u.activo
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
                    SELECT u.id, u.username, u.nombre, u.email, r.tipo_rol as rol, u.activo
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
# ENDPOINTS DE LOGIN (CORREGIDOS)
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
                    SELECT u.id, u.username, u.nombre, u.email, r.tipo_rol as rol, u.activo
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

@app.delete("/api/pacientes/{paciente_id}", response_model=dict)
def delete_paciente(paciente_id: int):
    """Eliminar un paciente y sus registros relacionados (ELIMINACIÓN EN CASCADA)"""
    try:
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='root',
            database='prueba_consultorio_db',
            port=3306,
            cursorclass=pymysql.cursors.DictCursor  # ¡IMPORTANTE AGREGAR ESTO!
        )
        with conn:
            with conn.cursor() as cursor:
                # Verificar si el paciente existe
                cursor.execute("SELECT id, nombre, apellido FROM Paciente WHERE id = %s", (paciente_id,))
                paciente = cursor.fetchone()
                if not paciente:
                    raise HTTPException(status_code=404, detail="Paciente no encontrado")
                
                print(f"🗑️ Eliminando paciente {paciente_id} ({paciente['nombre']} {paciente['apellido']})")
                
                # Contar registros que se eliminarán
                cursor.execute("SELECT COUNT(*) as count FROM Cita WHERE paciente_id = %s", (paciente_id,))
                citas_count = cursor.fetchone()['count']
                
                cursor.execute("SELECT COUNT(*) as count FROM historial_clinico WHERE paciente_id = %s", (paciente_id,))
                historias_count = cursor.fetchone()['count']
                
                print(f"   📋 Citas a eliminar: {citas_count}")
                print(f"   📋 Historias clínicas a eliminar: {historias_count}")
                
                # Eliminar en orden inverso de dependencias
                # 1. Primero eliminar historias clínicas (si existen)
                if historias_count > 0:
                    print(f"   🗑️ Eliminando {historias_count} historias clínicas...")
                    cursor.execute("DELETE FROM historial_clinico WHERE paciente_id = %s", (paciente_id,))
                    print(f"   ✅ {historias_count} historias clínicas eliminadas")
                
                # 2. Luego eliminar citas (si existen)
                if citas_count > 0:
                    print(f"   🗑️ Eliminando {citas_count} citas...")
                    cursor.execute("DELETE FROM Cita WHERE paciente_id = %s", (paciente_id,))
                    print(f"   ✅ {citas_count} citas eliminadas")
                
                # 3. Finalmente eliminar paciente
                print(f"   🗑️ Eliminando paciente...")
                cursor.execute("DELETE FROM Paciente WHERE id = %s", (paciente_id,))
                conn.commit()
                print(f"   ✅ Paciente eliminado")
                
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
        print(f"❌ Error eliminando paciente {paciente_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ========================================
# ENDPOINTS DE CITAS (CORREGIDO - EL ERROR ESTÁ AQUÍ)
# ========================================

@app.post("/api/citas", response_model=dict)
def create_cita(cita: CitaCreate):
    """Crear una nueva cita con validación detallada"""
    try:
        print("=" * 50)
        print("📅 RECIBIENDO SOLICITUD PARA CREAR CITA")
        print("=" * 50)
        print(f"📋 Datos recibidos del frontend:")
        print(f"   paciente_id: {cita.paciente_id} (tipo: {type(cita.paciente_id)})")
        print(f"   usuario_id: {cita.usuario_id} (tipo: {type(cita.usuario_id)})")
        print(f"   fecha_hora: '{cita.fecha_hora}'")
        print(f"   tipo: '{cita.tipo}'")
        print(f"   duracion_minutos: {cita.duracion_minutos} (tipo: {type(cita.duracion_minutos)})")
        print(f"   estado_id: {cita.estado_id} (tipo: {type(cita.estado_id)})")
        print(f"   notas: '{cita.notas}'")
        
        # Validar que fecha_hora tenga el formato correcto
        from datetime import datetime
        try:
            # Limpiar la fecha_hora si tiene 'Z' al final
            fecha_hora_limpia = cita.fecha_hora.replace('Z', '')
            if len(fecha_hora_limpia) == 16:  # Formato: YYYY-MM-DDTHH:MM
                fecha_hora_limpia += ":00"  # Agregar segundos
            fecha_parseada = datetime.fromisoformat(fecha_hora_limpia)
            print(f"✅ Fecha parseada correctamente: {fecha_parseada}")
        except ValueError as e:
            print(f"❌ ERROR: Formato de fecha inválido")
            print(f"   Valor recibido: '{cita.fecha_hora}'")
            print(f"   Error: {e}")
            raise HTTPException(
                status_code=422, 
                detail=f"Formato de fecha/hora inválido. Use: YYYY-MM-DDTHH:MM:SS. Recibido: '{cita.fecha_hora}'"
            )
        
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='root',
            database='prueba_consultorio_db',
            port=3306
        )
        with conn:
            with conn.cursor() as cursor:
                # Verificar que el paciente existe - ¡CORREGIDO!
                cursor.execute("SELECT id, nombre, apellido FROM Paciente WHERE id = %s", (cita.paciente_id,))
                resultado = cursor.fetchone()
                if not resultado:
                    print(f"❌ ERROR: Paciente ID {cita.paciente_id} no encontrado")
                    raise HTTPException(status_code=404, detail=f"Paciente con ID {cita.paciente_id} no encontrado")
                
                # Acceder correctamente a los datos de la tupla
                # Si cursor.fetchone() devuelve una tupla, accedemos por índice
                # Si devuelve un diccionario, accedemos por clave
                paciente_nombre = ""
                paciente_apellido = ""
                
                if isinstance(resultado, dict):
                    # Es un diccionario (porque usamos cursorclass=pymysql.cursors.DictCursor en otras funciones)
                    paciente_nombre = resultado['nombre']
                    paciente_apellido = resultado['apellido']
                else:
                    # Es una tupla
                    paciente_nombre = resultado[1]  # índice 1 = nombre
                    paciente_apellido = resultado[2]  # índice 2 = apellido
                
                print(f"✅ Paciente encontrado: {paciente_nombre} {paciente_apellido}")
                
                # Verificar que el usuario existe
                cursor.execute("SELECT id, nombre FROM Usuario WHERE id = %s", (cita.usuario_id,))
                resultado_usuario = cursor.fetchone()
                if not resultado_usuario:
                    print(f"❌ ERROR: Usuario ID {cita.usuario_id} no encontrado")
                    raise HTTPException(status_code=404, detail=f"Usuario con ID {cita.usuario_id} no encontrado")
                
                # Acceder correctamente al nombre del usuario
                usuario_nombre = ""
                if isinstance(resultado_usuario, dict):
                    usuario_nombre = resultado_usuario['nombre']
                else:
                    usuario_nombre = resultado_usuario[1]  # índice 1 = nombre
                
                print(f"✅ Usuario encontrado: {usuario_nombre}")
                
                # Verificar si ya existe una cita a la misma hora
                cursor.execute("""
                    SELECT id FROM Cita 
                    WHERE usuario_id = %s 
                    AND fecha_hora = %s
                    AND estado_id != 4  # No contar canceladas
                """, (cita.usuario_id, fecha_hora_limpia))
                
                if cursor.fetchone():
                    print(f"⚠️ ADVERTENCIA: Ya existe una cita programada para este doctor a las {fecha_hora_limpia}")
                    # Podemos permitirlo o rechazarlo, por ahora solo mostramos advertencia
                
                # Insertar la cita
                cursor.execute("""
                    INSERT INTO Cita (
                        paciente_id, usuario_id, fecha_hora, tipo,
                        duracion_minutos, estado_id, notas
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s)
                """, (
                    cita.paciente_id,
                    cita.usuario_id,
                    fecha_hora_limpia,  # Usar la fecha limpia
                    cita.tipo,
                    cita.duracion_minutos,
                    cita.estado_id,
                    cita.notas
                ))
                cita_id = cursor.lastrowid
                conn.commit()
                
                print(f"✅ CITA CREADA EXITOSAMENTE")
                print(f"   ID de cita: {cita_id}")
                print(f"   Paciente: {paciente_nombre} {paciente_apellido}")
                print(f"   Doctor: {usuario_nombre}")
                print(f"   Fecha/Hora: {fecha_parseada}")
                print("=" * 50)
                
                return {
                    "success": True,
                    "message": "Cita creada exitosamente",
                    "cita_id": cita_id,
                    "paciente_nombre": f"{paciente_nombre} {paciente_apellido}",
                    "doctor_nombre": usuario_nombre,
                    "fecha_hora": fecha_hora_limpia
                }
                
    except HTTPException as he:
        print(f"❌ ERROR HTTP: {he.detail}")
        raise he
    except Exception as e:
        print(f"❌ ERROR INESPERADO creando cita: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error interno del servidor: {str(e)}")

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

@app.put("/api/citas/{cita_id}", response_model=dict)
def update_cita(cita_id: int, cita: CitaUpdate):
    """Actualizar una cita existente"""
    try:
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='root',
            database='prueba_consultorio_db',
            port=3306,
            cursorclass=pymysql.cursors.DictCursor  # ¡AGREGAR ESTO!
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
# ENDPOINTS DE HISTORIAS CLÍNICAS
# ========================================

@app.get("/api/historias-clinicas")
def get_historias_clinicas(limit: int = 100, offset: int = 0):
    """Obtener todas las historias clínicas"""
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
                    SELECT * FROM historial_clinico 
                    ORDER BY fecha_creacion DESC 
                    LIMIT %s OFFSET %s
                """, (limit, offset))
                historias = cursor.fetchall()
                return {"historias": historias}
    except Exception as e:
        # Si la tabla no existe, devolver array vacío
        if "Table 'prueba_consultorio_db.historial_clinico' doesn't exist" in str(e):
            return {"historias": []}
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/historias-clinicas/paciente/{paciente_id}")
def get_historias_by_paciente(paciente_id: int):
    """Obtener historias clínicas de un paciente específico"""
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
                # Primero verificar que el paciente existe
                cursor.execute("SELECT id FROM paciente WHERE id = %s", (paciente_id,))
                if not cursor.fetchone():
                    raise HTTPException(status_code=404, detail="Paciente no encontrado")
                
                cursor.execute("""
                    SELECT * FROM historial_clinico 
                    WHERE paciente_id = %s 
                    ORDER BY fecha_creacion DESC
                """, (paciente_id,))
                historias = cursor.fetchall()
                return historias
    except HTTPException:
        raise
    except Exception as e:
        # Si la tabla no existe, devolver array vacío
        if "Table 'prueba_consultorio_db.historial_clinico' doesn't exist" in str(e):
            return []
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/historias-clinicas/{historia_id}")
def get_historia_clinica(historia_id: int):
    """Obtener una historia clínica específica por ID"""
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
                cursor.execute("SELECT * FROM historial_clinico WHERE id = %s", (historia_id,))
                historia = cursor.fetchone()
                if not historia:
                    raise HTTPException(status_code=404, detail="Historia clínica no encontrada")
                return historia
    except HTTPException:
        raise
    except Exception as e:
        # Si la tabla no existe
        if "Table 'prueba_consultorio_db.historial_clinico' doesn't exist" in str(e):
            raise HTTPException(status_code=404, detail="Historia clínica no encontrada")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/historias-clinicas", response_model=dict)
def create_historia_clinica(historia: HistorialClinicoCreate):
    """Crear una nueva historia clínica"""
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
                # Verificar que el paciente existe
                cursor.execute("SELECT id FROM paciente WHERE id = %s", (historia.paciente_id,))
                if not cursor.fetchone():
                    raise HTTPException(status_code=404, detail="Paciente no encontrado")
                
                # Insertar nueva historia clínica (sin fotos inicialmente)
                cursor.execute("""
                    INSERT INTO historial_clinico (
                        paciente_id, motivo_consulta, antecedentes_medicos,
                        antecedentes_quirurgicos, antecedentes_alergicos,
                        antecedentes_farmacologicos, exploracion_fisica,
                        diagnostico, tratamiento, recomendaciones, fotos
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    historia.paciente_id,
                    historia.motivo_consulta or "",
                    historia.antecedentes_medicos or "",
                    historia.antecedentes_quirurgicos or "",
                    historia.antecedentes_alergicos or "",
                    historia.antecedentes_farmacologicos or "",
                    historia.exploracion_fisica or "",
                    historia.diagnostico or "",
                    historia.tratamiento or "",
                    historia.recomendaciones or "",
                    ""  # fotos vacías inicialmente
                ))
                historia_id = cursor.lastrowid
                conn.commit()
                
                return {
                    "success": True,
                    "message": "Historia clínica creada exitosamente",
                    "historia_id": historia_id,
                    "id": historia_id
                }
    except HTTPException:
        raise
    except Exception as e:
        # Si la tabla no existe
        if "Table 'prueba_consultorio_db.historial_clinico' doesn't exist" in str(e):
            raise HTTPException(status_code=500, detail="Tabla de historias clínicas no existe. Ejecuta el script SQL primero.")
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/historias-clinicas/{historia_id}", response_model=dict)
def update_historia_clinica(historia_id: int, historia: HistorialClinicoUpdate):
    """Actualizar una historia clínica existente"""
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
                # Verificar si la historia existe
                cursor.execute("SELECT id FROM historial_clinico WHERE id = %s", (historia_id,))
                if not cursor.fetchone():
                    raise HTTPException(status_code=404, detail="Historia clínica no encontrada")
                
                # Verificar que el paciente existe
                cursor.execute("SELECT id FROM paciente WHERE id = %s", (historia.paciente_id,))
                if not cursor.fetchone():
                    raise HTTPException(status_code=404, detail="Paciente no encontrado")
                
                # Actualizar historia clínica
                cursor.execute("""
                    UPDATE historial_clinico SET
                        paciente_id = %s,
                        motivo_consulta = %s,
                        antecedentes_medicos = %s,
                        antecedentes_quirurgicos = %s,
                        antecedentes_alergicos = %s,
                        antecedentes_farmacologicos = %s,
                        exploracion_fisica = %s,
                        diagnostico = %s,
                        tratamiento = %s,
                        recomendaciones = %s
                    WHERE id = %s
                """, (
                    historia.paciente_id,
                    historia.motivo_consulta or "",
                    historia.antecedentes_medicos or "",
                    historia.antecedentes_quirurgicos or "",
                    historia.antecedentes_alergicos or "",
                    historia.antecedentes_farmacologicos or "",
                    historia.exploracion_fisica or "",
                    historia.diagnostico or "",
                    historia.tratamiento or "",
                    historia.recomendaciones or "",
                    historia_id
                ))
                conn.commit()
                
                return {
                    "success": True,
                    "message": "Historia clínica actualizada exitosamente",
                    "historia_id": historia_id
                }
    except HTTPException:
        raise
    except Exception as e:
        # Si la tabla no existe
        if "Table 'prueba_consultorio_db.historial_clinico' doesn't exist" in str(e):
            raise HTTPException(status_code=404, detail="Historia clínica no encontrada")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/historias-clinicas/{historia_id}", response_model=MessageResponse)
def delete_historia_clinica(historia_id: int):
    """Eliminar una historia clínica"""
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
                # Verificar si la historia existe
                cursor.execute("SELECT id FROM historial_clinico WHERE id = %s", (historia_id,))
                if not cursor.fetchone():
                    raise HTTPException(status_code=404, detail="Historia clínica no encontrada")
                
                # Eliminar historia clínica
                cursor.execute("DELETE FROM historial_clinico WHERE id = %s", (historia_id,))
                conn.commit()
                
                return MessageResponse(message="Historia clínica eliminada exitosamente")
                
    except HTTPException:
        raise
    except Exception as e:
        # Si la tabla no existe
        if "Table 'prueba_consultorio_db.historial_clinico' doesn't exist" in str(e):
            raise HTTPException(status_code=404, detail="Historia clínica no encontrada")
        raise HTTPException(status_code=500, detail=str(e))

# ========================================
# ENDPOINTS DE SUBIDA DE ARCHIVOS (CORREGIDO)
# ========================================

@app.post("/api/upload/historia/{historia_id}", response_model=FileUploadResponse)
async def upload_historia_foto(
    historia_id: int,
    file: UploadFile = File(...)
):
    """Subir foto para una historia clínica"""
    print(f"🔥 DEBUG: Endpoint llamado con historia_id={historia_id}")
    print(f"🔥 DEBUG: File object recibido")
    print(f"🔥 DEBUG: Filename: {file.filename}")
    print(f"🔥 DEBUG: Content type: {file.content_type}")
    
    try:
        # Verificar si la historia existe
        conn = None
        try:
            conn = pymysql.connect(
                host='localhost',
                user='root',
                password='root',
                database='prueba_consultorio_db',
                port=3306
            )
            with conn.cursor() as cursor:
                cursor.execute("SELECT id FROM historial_clinico WHERE id = %s", (historia_id,))
                resultado = cursor.fetchone()
                if not resultado:
                    print(f"❌ Historia {historia_id} no encontrada en la base de datos")
                    raise HTTPException(status_code=404, detail="Historia clínica no encontrada")
                print(f"✅ Historia {historia_id} encontrada en la base de datos")
        except Exception as db_error:
            print(f"❌ Error base de datos: {db_error}")
            raise HTTPException(status_code=500, detail=f"Error base de datos: {str(db_error)}")
        finally:
            if conn:
                conn.close()
        
        # Validar tipo de archivo
        allowed_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'}
        file_ext = os.path.splitext(file.filename or "unknown.jpg")[1].lower()
        if file_ext not in allowed_extensions:
            print(f"❌ Extensión no permitida: {file_ext}")
            raise HTTPException(status_code=400, detail="Tipo de archivo no permitido. Use JPG, PNG, GIF, BMP o WebP.")
        
        # Validar tamaño (máximo 10MB)
        max_size = 10 * 1024 * 1024  # 10MB
        
        # Leer contenido del archivo
        content = await file.read()
        print(f"📏 Tamaño del archivo: {len(content)} bytes")
        if len(content) > max_size:
            print(f"❌ Archivo demasiado grande: {len(content)} > {max_size}")
            raise HTTPException(status_code=400, detail="El archivo es demasiado grande. Máximo 10MB.")
        
        # Generar nombre único para el archivo
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S_%f')
        filename = f"historia_{historia_id}_{timestamp}{file_ext}"
        
        # Asegurar que existe el directorio
        historia_dir = os.path.join(UPLOAD_DIR, "historias")
        os.makedirs(historia_dir, exist_ok=True)
        
        file_path = os.path.join(historia_dir, filename)
        print(f"📁 Guardando archivo en: {file_path}")
        
        # Guardar archivo
        await file.seek(0)  # Volver al inicio del archivo
        with open(file_path, "wb") as buffer:
            # Leer en chunks para manejar archivos grandes
            while True:
                chunk = await file.read(8192)  # 8KB chunks
                if not chunk:
                    break
                buffer.write(chunk)
        
        print(f"✅ Archivo guardado correctamente: {file_path}")
        
        # Verificar que el archivo existe
        if not os.path.exists(file_path):
            print(f"❌ ERROR: Archivo no se creó: {file_path}")
            raise HTTPException(status_code=500, detail="Error al guardar el archivo en el servidor")
        
        file_size = os.path.getsize(file_path)
        print(f"✅ Archivo verificado: {file_path} ({file_size} bytes)")
        
        # Crear URL para acceder al archivo
        file_url = f"/uploads/historias/{filename}"
        print(f"🌐 URL generada: {file_url}")
        
        # Actualizar la historia clínica con la nueva URL
        conn2 = None
        try:
            conn2 = pymysql.connect(
                host='localhost',
                user='root',
                password='root',
                database='prueba_consultorio_db',
                port=3306
            )
            with conn2.cursor() as cursor:
                # Obtener fotos actuales - ¡CORREGIDO!
                cursor.execute("SELECT fotos FROM historial_clinico WHERE id = %s", (historia_id,))
                resultado = cursor.fetchone()
                fotos_actuales = ""
                if resultado and resultado[0]:  # resultado es una tupla
                    fotos_actuales = resultado[0]
                    print(f"📸 Fotos actuales en BD: {fotos_actuales}")
                else:
                    print(f"📸 No hay fotos previas en BD")
                
                # Agregar nueva foto
                if fotos_actuales and fotos_actuales.strip():
                    nuevas_fotos = f"{fotos_actuales},{file_url}"
                else:
                    nuevas_fotos = file_url
                
                print(f"📝 Actualizando fotos para historia {historia_id}: {nuevas_fotos}")
                
                cursor.execute(
                    "UPDATE historial_clinico SET fotos = %s WHERE id = %s",
                    (nuevas_fotos, historia_id)
                )
                conn2.commit()
                print(f"✅ Base de datos actualizada exitosamente")
        except Exception as update_error:
            print(f"❌ Error actualizando base de datos: {update_error}")
            import traceback
            traceback.print_exc()
            # No lanzamos error aquí para que al menos el archivo se guarde
        finally:
            if conn2:
                conn2.close()
        
        return FileUploadResponse(
            success=True,
            message="Foto subida exitosamente",
            url=file_url,
            filename=filename
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error inesperado en upload_historia_foto: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error subiendo archivo: {str(e)}")

# ========================================
# ENDPOINT DE DIAGNÓSTICO
# ========================================

@app.get("/api/debug/upload-dir")
def debug_upload_dir():
    """Verificar directorio de uploads"""
    import os
    upload_dir = os.path.abspath(UPLOAD_DIR)
    historias_dir = os.path.join(upload_dir, "historias")
    
    return {
        "upload_dir": upload_dir,
        "historias_dir": historias_dir,
        "upload_dir_exists": os.path.exists(upload_dir),
        "historias_dir_exists": os.path.exists(historias_dir),
        "current_working_dir": os.getcwd(),
        "permissions": {
            "upload_dir_writable": os.access(upload_dir, os.W_OK) if os.path.exists(upload_dir) else False,
            "historias_dir_writable": os.access(historias_dir, os.W_OK) if os.path.exists(historias_dir) else False
        },
        "files_in_historias_dir": os.listdir(historias_dir) if os.path.exists(historias_dir) else []
    }

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
                
                # Verificar si existe tabla de historias clínicas
                try:
                    cursor.execute("SELECT COUNT(*) as count FROM historial_clinico")
                    historias_count = cursor.fetchone()['count']
                    historias_disponible = True
                except:
                    historias_count = 0
                    historias_disponible = False
        
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
                "citas": citas_count,
                "historias_clinicas": historias_count
            },
            "modulos_activos": {
                "historias_clinicas": historias_disponible
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
                "/api/historias-clinicas",
                "/api/historias-clinicas/paciente/{id}",
                "/api/historias-clinicas/{id}",
                "/api/upload/historia/{id}",
                "/api/debug/upload-dir",
                "/api/test-frontend"
            ]
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"❌ Error en el backend: {str(e)}",
            "timestamp": datetime.now().isoformat()
        }
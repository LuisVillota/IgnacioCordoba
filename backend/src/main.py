from fastapi import FastAPI, HTTPException, UploadFile, File, Query  
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import Response, FileResponse
import pymysql
import os
import shutil
from datetime import datetime, time, date
from pydantic import BaseModel
from typing import Optional, Dict, List
from enum import Enum
from typing import Union
from pydantic import validator
import json 

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(os.path.join(UPLOAD_DIR, "historias"), exist_ok=True)

FRONTEND_URL = "http://localhost:3000"
BACKEND_URL = "http://localhost:8000"
PROJECT_NAME = "Consultorio Dr. Ignacio Córdoba"
VERSION = "1.0.0"
API_V1_STR = "/api"

app = FastAPI(
    title=PROJECT_NAME,
    version=VERSION,
    openapi_url=f"{API_V1_STR}/openapi.json"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

def parse_int_safe(value):
    if value is None:
        return None
    if isinstance(value, int):
        return value
    if isinstance(value, str):
        cleaned = value.strip()
        if cleaned == "":
            return None
        try:
            return int(cleaned)
        except ValueError:
            import re
            numbers = re.findall(r'\d+', cleaned)
            if numbers:
                try:
                    return int(numbers[0])
                except:
                    pass
    raise ValueError(f"No se pudo convertir a entero: {value}")

class UsuarioCreate(BaseModel):
    username: str
    password: str
    nombre: str
    email: str
    rol_id: int
    activo: bool = True

class UsuarioUpdate(BaseModel):
    username: Optional[str] = None
    password: Optional[str] = None
    nombre: Optional[str] = None
    email: Optional[str] = None
    rol_id: Optional[int] = None
    activo: Optional[bool] = None

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
    estado_id: int = 4
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

class ProcedimientoSimple(BaseModel):
    id: int
    nombre: str
    precio: int
    created_at: Optional[str] = None

class AdicionalSimple(BaseModel):
    id: int
    nombre: str
    precio: int
    created_at: Optional[str] = None

class ProcedimientoCreate(BaseModel):
    nombre: str
    precio: int

class ProcedimientoUpdate(BaseModel):
    nombre: Optional[str] = None
    precio: Optional[int] = None

class AdicionalCreate(BaseModel):
    nombre: str
    precio: int

class AdicionalUpdate(BaseModel):
    nombre: Optional[str] = None
    precio: Optional[int] = None

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

class SalaEsperaBase(BaseModel):
    paciente_id: int
    cita_id: Optional[int] = None
    estado_id: int
    notas: Optional[str] = None
    tiene_cita_hoy: Optional[bool] = False

class SalaEsperaCreate(BaseModel):
    paciente_id: int
    cita_id: Optional[int] = None

class SalaEsperaUpdate(BaseModel):
    estado: str
    cita_id: Optional[int] = None

class BulkUpdateEstadosRequest(BaseModel):
    cambios: Dict[str, str]

class CotizacionItemBase(BaseModel):
    tipo: str
    item_id: int
    nombre: str
    descripcion: Optional[str] = None
    cantidad: int = 1
    precio_unitario: float
    subtotal: float

class CotizacionServicioIncluido(BaseModel):
    servicio_nombre: str
    requiere: bool = False

class CotizacionCreate(BaseModel):
    paciente_id: int
    usuario_id: int
    plan_id: Optional[int] = None
    estado_id: int = None
    items: List[CotizacionItemBase] = []
    servicios_incluidos: List[CotizacionServicioIncluido] = []
    total: Optional[float] = None 
    observaciones: Optional[str] = None
    fecha_vencimiento: Optional[str] = None
    validez_dias: Optional[int] = 7
    subtotal_procedimientos: Optional[float] = 0.0
    subtotal_adicionales: Optional[float] = 0.0
    subtotal_otros_adicionales: Optional[float] = 0.0

class CotizacionUpdate(BaseModel):
    paciente_id: Optional[int] = None
    usuario_id: Optional[int] = None
    plan_id: Optional[int] = None
    estado_id: Optional[int] = None
    items: Optional[List[CotizacionItemBase]] = None
    servicios_incluidos: Optional[List[CotizacionServicioIncluido]] = None
    subtotal_procedimientos: Optional[float] = None
    subtotal_adicionales: Optional[float] = None
    subtotal_otros_adicionales: Optional[float] = None
    total: Optional[float] = None
    observaciones: Optional[str] = None
    fecha_vencimiento: Optional[str] = None

class EstadoProcedimiento(str, Enum):
    PROGRAMADO = "Programado"
    APLAZADO = "Aplazado"
    CONFIRMADO = "Confirmado"
    EN_QUIROFANO = "En Quirofano"
    OPERADO = "Operado"
    CANCELADO = "Cancelado"

class AgendaProcedimientoBase(BaseModel):
    numero_documento: str
    fecha: date
    hora: str
    procedimiento_id: int
    duracion: Optional[int] = None
    anestesiologo: Optional[str] = None
    estado: EstadoProcedimiento = EstadoProcedimiento.PROGRAMADO
    observaciones: Optional[str] = None
    
    @validator('procedimiento_id', pre=True)
    def convert_procedimiento_id(cls, v):
        if v is None:
            raise ValueError('procedimiento_id es requerido')
        if isinstance(v, int):
            return v
        if isinstance(v, str):
            try:
                return int(v)
            except (ValueError, TypeError):
                raise ValueError(f'procedimiento_id debe ser un numero valido. Recibido: {v}')
        try:
            return int(v)
        except (ValueError, TypeError):
            raise ValueError(f'procedimiento_id debe ser un numero. Recibido: {v}')

class AgendaProcedimientoCreate(AgendaProcedimientoBase):
    pass

class AgendaProcedimientoUpdate(BaseModel):
    fecha: Optional[date] = None
    hora: Optional[str] = None
    procedimiento_id: Optional[Union[int, str]] = None
    duracion: Optional[int] = None
    anestesiologo: Optional[str] = None
    estado: Optional[EstadoProcedimiento] = None
    observaciones: Optional[str] = None
    
    @validator('procedimiento_id', pre=True)
    def convert_update_procedimiento_id(cls, v):
        if v is None:
            return None
        if isinstance(v, int):
            return v
        if isinstance(v, str):
            try:
                if v.strip() == "":
                    return None
                return int(v)
            except (ValueError, TypeError):
                raise ValueError(f'procedimiento_id debe ser un numero valido. Recibido: {v}')
        try:
            return int(v)
        except (ValueError, TypeError):
            raise ValueError(f'procedimiento_id debe ser un numero. Recibido: {v}')
        
class AgendaProcedimientoResponse(AgendaProcedimientoBase):
    id: int
    paciente_nombre: Optional[str] = None
    paciente_apellido: Optional[str] = None
    procedimiento_nombre: Optional[str] = None

# ====================== MODELOS PARA PLAN QUIRÚRGICO ======================

class PlanQuirurgicoBase(BaseModel):
    paciente_id: int
    usuario_id: int
    procedimiento_desc: Optional[str] = None
    anestesiologo: Optional[str] = None
    materiales_requeridos: Optional[str] = None
    notas_preoperatorias: Optional[str] = None
    riesgos: Optional[str] = None
    hora: Optional[str] = None
    fecha_programada: Optional[str] = None
    
    # Datos básicos del paciente
    nombre_completo: Optional[str] = None
    peso: Optional[float] = None
    altura: Optional[float] = None
    fecha_nacimiento: Optional[str] = None
    imc: Optional[float] = None
    identificacion: Optional[str] = None
    fecha_consulta: Optional[str] = None
    hora_consulta: Optional[str] = None
    categoriaIMC: Optional[str] = None
    edad_calculada: Optional[int] = None
    edad: Optional[int] = None  # Nuevo campo - ya existe en la tabla
    
    # Datos adicionales
    ocupacion: Optional[str] = None
    telefono: Optional[str] = None  # Renombrado de telefono_fijo
    celular: Optional[str] = None
    direccion: Optional[str] = None
    email: Optional[str] = None
    motivo_consulta: Optional[str] = None
    entidad: Optional[str] = None
    
    # Antecedentes (texto plano) - mantener por compatibilidad
    farmacologicos: Optional[str] = None
    traumaticos: Optional[str] = None
    quirurgicos: Optional[str] = None
    alergicos: Optional[str] = None
    toxicos: Optional[str] = None
    habitos: Optional[str] = None
    
    # Examen físico (texto plano) - mantener por compatibilidad
    cabeza: Optional[str] = None
    mamas: Optional[str] = None
    tcs: Optional[str] = None
    abdomen: Optional[str] = None
    gluteos: Optional[str] = None
    extremidades: Optional[str] = None
    pies_faneras: Optional[str] = None
    
    # Conducta quirúrgica
    duracion_estimada: Optional[int] = None
    tipo_anestesia: Optional[str] = None
    requiere_hospitalizacion: Optional[bool] = False
    tiempo_hospitalizacion: Optional[str] = None
    reseccion_estimada: Optional[str] = None
    firma_cirujano: Optional[str] = None
    firma_paciente: Optional[str] = None
    
    # JSON fields (para estructuras complejas)
    enfermedad_actual: Optional[Dict] = None
    antecedentes: Optional[Dict] = None  # JSON con estructura completa
    notas_corporales: Optional[Dict] = None  # JSON con estructura completa
    
    # Nuevos campos
    fecha_modificacion: Optional[str] = None
    esquema_mejorado: Optional[Dict] = None
    plan_conducta: Optional[str] = None
    
    # Otros campos
    imagen_procedimiento: Optional[str] = None
    fecha_ultimo_procedimiento: Optional[str] = None
    descripcion_procedimiento: Optional[str] = None
    detalles: Optional[str] = None
    notas_doctor: Optional[str] = None  # Renombrado de notas_del_doctor
    tiempo_cirugia_minutos: Optional[int] = None

class PlanQuirurgicoCreate(PlanQuirurgicoBase):
    pass

class PlanQuirurgicoUpdate(BaseModel):
    estado_id: Optional[int] = None
    procedimiento_desc: Optional[str] = None
    anestesiologo: Optional[str] = None
    materiales_requeridos: Optional[str] = None
    notas_preoperatorias: Optional[str] = None
    riesgos: Optional[str] = None
    hora: Optional[str] = None
    fecha_programada: Optional[str] = None
    
    # Datos médicos
    peso: Optional[float] = None
    altura: Optional[float] = None
    imc: Optional[float] = None
    
    # Antecedentes (mantener por compatibilidad)
    farmacologicos: Optional[str] = None
    traumaticos: Optional[str] = None
    quirurgicos: Optional[str] = None
    alergicos: Optional[str] = None
    toxicos: Optional[str] = None
    habitos: Optional[str] = None
    
    # Examen físico (mantener por compatibilidad)
    cabeza: Optional[str] = None
    mamas: Optional[str] = None
    tcs: Optional[str] = None
    abdomen: Optional[str] = None
    gluteos: Optional[str] = None
    extremidades: Optional[str] = None
    pies_faneras: Optional[str] = None
    
    # Conducta quirúrgica
    duracion_estimada: Optional[int] = None
    tipo_anestesia: Optional[str] = None
    requiere_hospitalizacion: Optional[bool] = None
    tiempo_hospitalizacion: Optional[str] = None
    reseccion_estimada: Optional[str] = None
    firma_cirujano: Optional[str] = None
    firma_paciente: Optional[str] = None
    
    # JSON fields
    enfermedad_actual: Optional[Dict] = None
    antecedentes: Optional[Dict] = None
    notas_corporales: Optional[Dict] = None
    
    # Nuevos campos
    esquema_mejorado: Optional[Dict] = None
    plan_conducta: Optional[str] = None
    
    # Otros
    imagen_procedimiento: Optional[str] = None
    descripcion_procedimiento: Optional[str] = None
    detalles: Optional[str] = None
    notas_doctor: Optional[str] = None  # Renombrado
    tiempo_cirugia_minutos: Optional[int] = None

# ====================== ENDPOINTS DE SISTEMA ======================

@app.get("/")
def root():
    return {"message": "API del Consultorio Dr. Ignacio Córdoba", "version": VERSION}

@app.get("/health")
def health_check():
    return {"status": "healthy", "database": "MySQL"}

@app.get("/api/debug/endpoints")
def debug_endpoints():
    routes = []
    for route in app.routes:
        routes.append({
            "path": route.path,
            "name": route.name,
            "methods": getattr(route, "methods", None)
        })
    
    return {"endpoints": routes}

@app.get("/api/test-frontend")
def test_frontend():
    try:
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='root',
            database='u997398721_consultorio_db',
            port=3306,
            cursorclass=pymysql.cursors.DictCursor
        )
        with conn:
            with conn.cursor() as cursor:
                cursor.execute("SELECT COUNT(*) as count FROM Paciente")
                pacientes_count = cursor.fetchone()['count']
                
                cursor.execute("SELECT COUNT(*) as count FROM Usuario")
                usuarios_count = cursor.fetchone()['count']
                
                cursor.execute("SELECT COUNT(*) as count FROM Cita")
                citas_count = cursor.fetchone()['count']
                
                try:
                    cursor.execute("SELECT COUNT(*) as count FROM historial_clinico")
                    historias_count = cursor.fetchone()['count']
                    historias_disponible = True
                except:
                    historias_count = 0
                    historias_disponible = False
                
                try:
                    cursor.execute("SELECT COUNT(*) as count FROM estado_sala_espera")
                    estados_sala_count = cursor.fetchone()['count']
                    cursor.execute("SELECT COUNT(*) as count FROM sala_espera WHERE DATE(fecha_hora_ingreso) = CURDATE()")
                    sala_hoy_count = cursor.fetchone()['count']
                    sala_espera_disponible = True
                except:
                    estados_sala_count = 0
                    sala_hoy_count = 0
                    sala_espera_disponible = False
        
        endpoints_disponibles = [
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
            "/api/adicionales",
            "/api/adicionales/{id}",
            "/api/otros-adicionales",
            "/api/otros-adicionales/{id}",
            "/api/historias-clinicas",
            "/api/historias-clinicas/paciente/{id}",
            "/api/historias-clinicas/{id}",
            "/api/upload/historia/{id}",
            "/api/debug/upload-dir",
            "/api/debug/sala-espera",
            "/api/test-frontend"
        ]
        
        if sala_espera_disponible:
            endpoints_disponibles.extend([
                "/api/sala-espera",
                "/api/sala-espera/{paciente_id}/estado",
                "/api/sala-espera/bulk-estados",
                "/api/sala-espera/estadisticas"
            ])
        
        return {
            "success": True,
            "message": "Backend funcionando correctamente",
            "frontend_url": FRONTEND_URL,
            "backend_url": BACKEND_URL,
            "database": "MySQL - u997398721_consultorio_db",
            "timestamp": datetime.now().isoformat(),
            "counts": {
                "pacientes": pacientes_count,
                "usuarios": usuarios_count,
                "citas": citas_count,
                "historias_clinicas": historias_count,
                "estados_sala_espera": estados_sala_count,
                "sala_espera_hoy": sala_hoy_count
            },
            "modulos_activos": {
                "historias_clinicas": historias_disponible,
                "sala_espera": sala_espera_disponible
            },
            "endpoints_disponibles": endpoints_disponibles
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Error en el backend: {str(e)}",
            "timestamp": datetime.now().isoformat()
        }

# ====================== ENDPOINTS DE USUARIOS ======================

@app.post("/api/usuarios", response_model=dict)
def create_usuario(usuario: UsuarioCreate):
    try:
        import hashlib
        password_hash = hashlib.sha256(usuario.password.encode()).hexdigest()
        
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='root',
            database='u997398721_consultorio_db',
            port=3306,
            cursorclass=pymysql.cursors.DictCursor
        )
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

@app.put("/api/usuarios/{usuario_id}", response_model=dict)
def update_usuario(usuario_id: int, usuario: UsuarioUpdate):
    try:
        import hashlib
        
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='root',
            database='u997398721_consultorio_db',
            port=3306,
            cursorclass=pymysql.cursors.DictCursor
        )
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

@app.delete("/api/usuarios/{usuario_id}", response_model=dict)
def delete_usuario(usuario_id: int):
    try:
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='root',
            database='u997398721_consultorio_db',
            port=3306,
            cursorclass=pymysql.cursors.DictCursor
        )
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

@app.get("/api/usuarios")
def get_usuarios():
    try:
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='root',
            database='u997398721_consultorio_db',
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
    try:
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='root',
            database='u997398721_consultorio_db',
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

@app.get("/api/login")
def login(username: str, password: str):
    try:
        import hashlib
        password_hash = hashlib.sha256(password.encode()).hexdigest()
        
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='root',
            database='u997398721_consultorio_db',
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

# ====================== ENDPOINTS DE PACIENTES ======================

@app.get("/api/pacientes", response_model=dict)
def get_pacientes(limit: int = 100, offset: int = 0):
    try:
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='root',
            database='u997398721_consultorio_db',
            port=3306,
            cursorclass=pymysql.cursors.DictCursor
        )
        with conn:
            with conn.cursor() as cursor:
                cursor.execute("SELECT COUNT(*) as total FROM Paciente")
                total = cursor.fetchone()['total']
                
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
    try:
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='root',
            database='u997398721_consultorio_db',
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
    try:
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='root',
            database='u997398721_consultorio_db',
            port=3306
        )
        with conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    "SELECT id FROM Paciente WHERE numero_documento = %s", 
                    (paciente.numero_documento,)
                )
                if cursor.fetchone():
                    raise HTTPException(status_code=400, detail="El numero de documento ya existe")
                
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
            raise HTTPException(status_code=400, detail="El numero de documento ya existe")
        raise HTTPException(status_code=500, detail="Error de base de datos")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/pacientes/{paciente_id}", response_model=dict)
def update_paciente(paciente_id: int, paciente: PacienteUpdate):
    try:
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='root',
            database='u997398721_consultorio_db',
            port=3306
        )
        with conn:
            with conn.cursor() as cursor:
                cursor.execute("SELECT id FROM Paciente WHERE id = %s", (paciente_id,))
                if not cursor.fetchone():
                    raise HTTPException(status_code=404, detail="Paciente no encontrado")
                
                cursor.execute("""
                    SELECT id FROM Paciente 
                    WHERE numero_documento = %s AND id != %s
                """, (paciente.numero_documento, paciente_id))
                if cursor.fetchone():
                    raise HTTPException(
                        status_code=400, 
                        detail="El numero de documento ya esta registrado en otro paciente"
                    )
                
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
    try:
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='root',
            database='u997398721_consultorio_db',
            port=3306,
            cursorclass=pymysql.cursors.DictCursor
        )
        with conn:
            with conn.cursor() as cursor:
                cursor.execute("SELECT id, nombre, apellido FROM Paciente WHERE id = %s", (paciente_id,))
                paciente = cursor.fetchone()
                if not paciente:
                    raise HTTPException(status_code=404, detail="Paciente no encontrado")
                
                cursor.execute("SELECT COUNT(*) as count FROM Cita WHERE paciente_id = %s", (paciente_id,))
                citas_count = cursor.fetchone()['count']
                
                cursor.execute("SELECT COUNT(*) as count FROM historial_clinico WHERE paciente_id = %s", (paciente_id,))
                historias_count = cursor.fetchone()['count']
                
                if historias_count > 0:
                    cursor.execute("DELETE FROM historial_clinico WHERE paciente_id = %s", (paciente_id,))
                
                if citas_count > 0:
                    cursor.execute("DELETE FROM Cita WHERE paciente_id = %s", (paciente_id,))
                
                cursor.execute("DELETE FROM Paciente WHERE id = %s", (paciente_id,))
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

# ====================== ENDPOINTS DE CITAS ======================

@app.get("/api/citas")
def get_citas(limit: int = 50, offset: int = 0):
    try:
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='root',
            database='u997398721_consultorio_db',
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
    try:
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='root',
            database='u997398721_consultorio_db',
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
    try:
        from datetime import datetime
        fecha_hora_limpia = cita.fecha_hora.replace('Z', '')
        if len(fecha_hora_limpia) == 16:
            fecha_hora_limpia += ":00"
        fecha_parseada = datetime.fromisoformat(fecha_hora_limpia)
        
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='root',
            database='u997398721_consultorio_db',
            port=3306
        )
        with conn:
            with conn.cursor() as cursor:
                cursor.execute("SELECT id, nombre, apellido FROM Paciente WHERE id = %s", (cita.paciente_id,))
                resultado = cursor.fetchone()
                if not resultado:
                    raise HTTPException(status_code=404, detail=f"Paciente con ID {cita.paciente_id} no encontrado")
                
                paciente_nombre = ""
                paciente_apellido = ""
                
                if isinstance(resultado, dict):
                    paciente_nombre = resultado['nombre']
                    paciente_apellido = resultado['apellido']
                else:
                    paciente_nombre = resultado[1]
                    paciente_apellido = resultado[2]
                
                cursor.execute("SELECT id, nombre FROM Usuario WHERE id = %s", (cita.usuario_id,))
                resultado_usuario = cursor.fetchone()
                if not resultado_usuario:
                    raise HTTPException(status_code=404, detail=f"Usuario con ID {cita.usuario_id} no encontrado")
                
                usuario_nombre = ""
                if isinstance(resultado_usuario, dict):
                    usuario_nombre = resultado_usuario['nombre']
                else:
                    usuario_nombre = resultado_usuario[1]
                
                cursor.execute("""
                    SELECT id FROM Cita 
                    WHERE usuario_id = %s 
                    AND fecha_hora = %s
                    AND estado_id != 4
                """, (cita.usuario_id, fecha_hora_limpia))
                
                if cursor.fetchone():
                    pass
                
                cursor.execute("""
                    INSERT INTO Cita (
                        paciente_id, usuario_id, fecha_hora, tipo,
                        duracion_minutos, estado_id, notas
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s)
                """, (
                    cita.paciente_id,
                    cita.usuario_id,
                    fecha_hora_limpia,
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
                    "cita_id": cita_id,
                    "paciente_nombre": f"{paciente_nombre} {paciente_apellido}",
                    "doctor_nombre": usuario_nombre,
                    "fecha_hora": fecha_hora_limpia
                }
                
    except HTTPException as he:
        raise he
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error interno del servidor: {str(e)}")

@app.put("/api/citas/{cita_id}", response_model=dict)
def update_cita(cita_id: int, cita: CitaUpdate):
    try:
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='root',
            database='u997398721_consultorio_db',
            port=3306,
            cursorclass=pymysql.cursors.DictCursor
        )
        with conn:
            with conn.cursor() as cursor:
                cursor.execute("SELECT id FROM Cita WHERE id = %s", (cita_id,))
                if not cursor.fetchone():
                    raise HTTPException(status_code=404, detail="Cita no encontrado")
                
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
    try:
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='root',
            database='u997398721_consultorio_db',
            port=3306
        )
        with conn:
            with conn.cursor() as cursor:
                cursor.execute("SELECT id FROM Cita WHERE id = %s", (cita_id,))
                if not cursor.fetchone():
                    raise HTTPException(status_code=404, detail="Cita no encontrado")
                
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

# ====================== ENDPOINTS DE ESTADOS ======================

@app.get("/api/estados/citas")
def get_estados_citas():
    try:
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='root',
            database='u997398721_consultorio_db',
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
    try:
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='root',
            database='u997398721_consultorio_db',
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

@app.get("/api/estados/cotizaciones")
def get_estados_cotizaciones():
    try:
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='root',
            database='u997398721_consultorio_db',
            port=3306,
            cursorclass=pymysql.cursors.DictCursor
        )
        with conn:
            with conn.cursor() as cursor:
                cursor.execute("SELECT * FROM estado_cotizacion ORDER BY orden")
                estados = cursor.fetchall()
                return {"estados": estados}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail={
            "error": "Error obteniendo estados de cotizacion",
            "message": str(e)
        })

# ====================== ENDPOINTS DE PROCEDIMIENTOS ======================

@app.get("/api/procedimientos", response_model=dict)
def get_procedimientos():
    try:
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='root',
            database='u997398721_consultorio_db',
            port=3306,
            cursorclass=pymysql.cursors.DictCursor
        )
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
                conn = pymysql.connect(
                    host='localhost',
                    user='root',
                    password='root',
                    database='u997398721_consultorio_db',
                    port=3306,
                    cursorclass=pymysql.cursors.DictCursor
                )
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

@app.get("/api/procedimientos/{procedimiento_id}", response_model=dict)
def get_procedimiento(procedimiento_id: int):
    try:
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='root',
            database='u997398721_consultorio_db',
            port=3306,
            cursorclass=pymysql.cursors.DictCursor
        )
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

@app.post("/api/procedimientos", response_model=dict)
def create_procedimiento(procedimiento: ProcedimientoCreate):
    try:
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='root',
            database='u997398721_consultorio_db',
            port=3306
        )
        with conn:
            with conn.cursor() as cursor:
                from datetime import datetime
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

@app.put("/api/procedimientos/{procedimiento_id}", response_model=dict)
def update_procedimiento(procedimiento_id: int, procedimiento: ProcedimientoUpdate):
    try:
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='root',
            database='u997398721_consultorio_db',
            port=3306
        )
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
                        from datetime import datetime
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

@app.delete("/api/procedimientos/{procedimiento_id}", response_model=dict)
def delete_procedimiento(procedimiento_id: int):
    try:
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='root',
            database='u997398721_consultorio_db',
            port=3306
        )
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

# ====================== ENDPOINTS DE ADICIONALES ======================

@app.get("/api/adicionales", response_model=dict)
def get_adicionales():
    try:
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='root',
            database='u997398721_consultorio_db',
            port=3306,
            cursorclass=pymysql.cursors.DictCursor
        )
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

@app.get("/api/adicionales/{adicional_id}", response_model=dict)
def get_adicional(adicional_id: int):
    try:
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='root',
            database='u997398721_consultorio_db',
            port=3306,
            cursorclass=pymysql.cursors.DictCursor
        )
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

@app.post("/api/adicionales", response_model=dict)
def create_adicional(adicional: AdicionalCreate):
    try:
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='root',
            database='u997398721_consultorio_db',
            port=3306
        )
        with conn:
            with conn.cursor() as cursor:
                from datetime import datetime
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

@app.put("/api/adicionales/{adicional_id}", response_model=dict)
def update_adicional(adicional_id: int, adicional: AdicionalUpdate):
    try:
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='root',
            database='u997398721_consultorio_db',
            port=3306
        )
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
                        from datetime import datetime
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

@app.delete("/api/adicionales/{adicional_id}", response_model=dict)
def delete_adicional(adicional_id: int):
    try:
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='root',
            database='u997398721_consultorio_db',
            port=3306
        )
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

# ====================== ENDPOINTS DE OTROS ADICIONALES ======================

@app.get("/api/otros-adicionales", response_model=dict)
def get_otros_adicionales():
    try:
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='root',
            database='u997398721_consultorio_db',
            port=3306,
            cursorclass=pymysql.cursors.DictCursor
        )
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

@app.get("/api/otros-adicionales/{otro_adicional_id}", response_model=dict)
def get_otro_adicional(otro_adicional_id: int):
    try:
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='root',
            database='u997398721_consultorio_db',
            port=3306,
            cursorclass=pymysql.cursors.DictCursor
        )
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

@app.post("/api/otros-adicionales", response_model=dict)
def create_otro_adicional(otro_adicional: AdicionalCreate):
    try:
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='root',
            database='u997398721_consultorio_db',
            port=3306
        )
        with conn:
            with conn.cursor() as cursor:
                from datetime import datetime
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

@app.put("/api/otros-adicionales/{otro_adicional_id}", response_model=dict)
def update_otro_adicional(otro_adicional_id: int, otro_adicional: AdicionalUpdate):
    try:
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='root',
            database='u997398721_consultorio_db',
            port=3306
        )
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
                        from datetime import datetime
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

@app.delete("/api/otros-adicionales/{otro_adicional_id}", response_model=dict)
def delete_otro_adicional(otro_adicional_id: int):
    try:
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='root',
            database='u997398721_consultorio_db',
            port=3306
        )
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

# ====================== ENDPOINTS DE HISTORIAS CLÍNICAS ======================

@app.get("/api/historias-clinicas")
def get_historias_clinicas(limit: int = 100, offset: int = 0):
    try:
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='root',
            database='u997398721_consultorio_db',
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
        if "Table 'u997398721_consultorio_db.historial_clinico' doesn't exist" in str(e):
            return {"historias": []}
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/historias-clinicas/paciente/{paciente_id}")
def get_historias_by_paciente(paciente_id: int):
    try:
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='root',
            database='u997398721_consultorio_db',
            port=3306,
            cursorclass=pymysql.cursors.DictCursor
        )
        with conn:
            with conn.cursor() as cursor:
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
        if "Table 'u997398721_consultorio_db.historial_clinico' doesn't exist" in str(e):
            return []
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/historias-clinicas/{historia_id}")
def get_historia_clinica(historia_id: int):
    try:
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='root',
            database='u997398721_consultorio_db',
            port=3306,
            cursorclass=pymysql.cursors.DictCursor
        )
        with conn:
            with conn.cursor() as cursor:
                cursor.execute("SELECT * FROM historial_clinico WHERE id = %s", (historia_id,))
                historia = cursor.fetchone()
                if not historia:
                    raise HTTPException(status_code=404, detail="Historia clinica no encontrada")
                return historia
    except HTTPException:
        raise
    except Exception as e:
        if "Table 'u997398721_consultorio_db.historial_clinico' doesn't exist" in str(e):
            raise HTTPException(status_code=404, detail="Historia clinica no encontrada")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/historias-clinicas", response_model=dict)
def create_historia_clinica(historia: HistorialClinicoCreate):
    try:
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='root',
            database='u997398721_consultorio_db',
            port=3306
        )
        with conn:
            with conn.cursor() as cursor:
                cursor.execute("SELECT id FROM paciente WHERE id = %s", (historia.paciente_id,))
                if not cursor.fetchone():
                    raise HTTPException(status_code=404, detail="Paciente no encontrado")
                
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
                    ""
                ))
                historia_id = cursor.lastrowid
                conn.commit()
                
                return {
                    "success": True,
                    "message": "Historia clinica creada exitosamente",
                    "historia_id": historia_id,
                    "id": historia_id
                }
    except HTTPException:
        raise
    except Exception as e:
        if "Table 'u997398721_consultorio_db.historial_clinico' doesn't exist" in str(e):
            raise HTTPException(status_code=500, detail="Tabla de historias clinicas no existe.")
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/historias-clinicas/{historia_id}", response_model=dict)
def update_historia_clinica(historia_id: int, historia: HistorialClinicoUpdate):
    try:
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='root',
            database='u997398721_consultorio_db',
            port=3306
        )
        with conn:
            with conn.cursor() as cursor:
                cursor.execute("SELECT id FROM historial_clinico WHERE id = %s", (historia_id,))
                if not cursor.fetchone():
                    raise HTTPException(status_code=404, detail="Historia clinica no encontrada")
                
                cursor.execute("SELECT id FROM paciente WHERE id = %s", (historia.paciente_id,))
                if not cursor.fetchone():
                    raise HTTPException(status_code=404, detail="Paciente no encontrado")
                
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
                    "message": "Historia clinica actualizada exitosamente",
                    "historia_id": historia_id
                }
    except HTTPException:
        raise
    except Exception as e:
        if "Table 'u997398721_consultorio_db.historial_clinico' doesn't exist" in str(e):
            raise HTTPException(status_code=404, detail="Historia clinica no encontrada")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/historias-clinicas/{historia_id}", response_model=MessageResponse)
def delete_historia_clinica(historia_id: int):
    try:
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='root',
            database='u997398721_consultorio_db',
            port=3306
        )
        with conn:
            with conn.cursor() as cursor:
                cursor.execute("SELECT id FROM historial_clinico WHERE id = %s", (historia_id,))
                if not cursor.fetchone():
                    raise HTTPException(status_code=404, detail="Historia clinica no encontrada")
                
                cursor.execute("DELETE FROM historial_clinico WHERE id = %s", (historia_id,))
                conn.commit()
                
                return MessageResponse(message="Historia clinica eliminada exitosamente")
                
    except HTTPException:
        raise
    except Exception as e:
        if "Table 'u997398721_consultorio_db.historial_clinico' doesn't exist" in str(e):
            raise HTTPException(status_code=404, detail="Historia clinica no encontrada")
        raise HTTPException(status_code=500, detail=str(e))

# ====================== ENDPOINTS DE UPLOAD DE FOTOS ======================

@app.post("/api/upload/historia/{historia_id}", response_model=FileUploadResponse)
async def upload_historia_foto(
    historia_id: int,
    file: UploadFile = File(...)
):
    try:
        conn = None
        try:
            conn = pymysql.connect(
                host='localhost',
                user='root',
                password='root',
                database='u997398721_consultorio_db',
                port=3306
            )
            with conn.cursor() as cursor:
                cursor.execute("SELECT id FROM historial_clinico WHERE id = %s", (historia_id,))
                resultado = cursor.fetchone()
                if not resultado:
                    raise HTTPException(status_code=404, detail="Historia clinica no encontrada")
        except Exception as db_error:
            raise HTTPException(status_code=500, detail=f"Error base de datos: {str(db_error)}")
        finally:
            if conn:
                conn.close()
        
        allowed_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'}
        file_ext = os.path.splitext(file.filename or "unknown.jpg")[1].lower()
        if file_ext not in allowed_extensions:
            raise HTTPException(status_code=400, detail="Tipo de archivo no permitido. Use JPG, PNG, GIF, BMP o WebP.")
        
        max_size = 10 * 1024 * 1024
        content = await file.read()
        if len(content) > max_size:
            raise HTTPException(status_code=400, detail="El archivo es demasiado grande. Maximo 10MB.")
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S_%f')
        filename = f"historia_{historia_id}_{timestamp}{file_ext}"
        
        historia_dir = os.path.join(UPLOAD_DIR, "historias")
        os.makedirs(historia_dir, exist_ok=True)
        
        file_path = os.path.join(historia_dir, filename)
        
        await file.seek(0)
        with open(file_path, "wb") as buffer:
            while True:
                chunk = await file.read(8192)
                if not chunk:
                    break
                buffer.write(chunk)
        
        if not os.path.exists(file_path):
            raise HTTPException(status_code=500, detail="Error al guardar el archivo en el servidor")
        
        file_url = f"/uploads/historias/{filename}"
        
        conn2 = None
        try:
            conn2 = pymysql.connect(
                host='localhost',
                user='root',
                password='root',
                database='u997398721_consultorio_db',
                port=3306
            )
            with conn2.cursor() as cursor:
                cursor.execute("SELECT fotos FROM historial_clinico WHERE id = %s", (historia_id,))
                resultado = cursor.fetchone()
                fotos_actuales = ""
                if resultado and resultado[0]:
                    fotos_actuales = resultado[0]
                
                if fotos_actuales and fotos_actuales.strip():
                    nuevas_fotos = f"{fotos_actuales},{file_url}"
                else:
                    nuevas_fotos = file_url
                
                cursor.execute(
                    "UPDATE historial_clinico SET fotos = %s WHERE id = %s",
                    (nuevas_fotos, historia_id)
                )
                conn2.commit()
        except Exception as update_error:
            pass
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
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error subiendo archivo: {str(e)}")

# ====================== ENDPOINTS DE SALA DE ESPERA ======================

@app.get("/api/sala-espera")
def get_sala_espera(mostrarTodos: bool = True):
    try:
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='root',
            database='u997398721_consultorio_db',
            port=3306,
            cursorclass=pymysql.cursors.DictCursor
        )
        with conn:
            with conn.cursor() as cursor:
                hoy = datetime.now().strftime('%Y-%m-%d')
                
                try:
                    cursor.execute("SELECT COUNT(*) as count FROM estado_sala_espera")
                    count_estados = cursor.fetchone()['count']
                    
                    if count_estados == 0:
                        estados = [
                            ('pendiente', 'Paciente pendiente de atencion', '#9CA3AF', 1),
                            ('llegada', 'Paciente ha llegado', '#FBBF24', 2),
                            ('confirmada', 'Cita confirmada', '#10B981', 3),
                            ('en_consulta', 'Paciente en consulta', '#3B82F6', 4),
                            ('completada', 'Consulta completada', '#8B5CF6', 5),
                            ('no_asistio', 'Paciente no asistio', '#EF4444', 6)
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

@app.post("/api/sala-espera", response_model=dict)
def crear_registro_sala_espera(registro: SalaEsperaCreate):
    try:
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='root',
            database='u997398721_consultorio_db',
            port=3306,
            cursorclass=pymysql.cursors.DictCursor
        )
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
                        VALUES ('pendiente', 'Paciente pendiente de atencion', '#9CA3AF', 1)
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
                        "message": "El paciente ya esta registrado en sala de espera hoy",
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

@app.put("/api/sala-espera/{paciente_id}/estado", response_model=dict)
def actualizar_estado_sala_espera(paciente_id: int, datos: SalaEsperaUpdate):
    try:
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='root',
            database='u997398721_consultorio_db',
            port=3306,
            cursorclass=pymysql.cursors.DictCursor
        )
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

@app.put("/api/sala-espera/bulk-estados", response_model=dict)
def bulk_update_estados_sala_espera(request: BulkUpdateEstadosRequest):
    try:
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='root',
            database='u997398721_consultorio_db',
            port=3306,
            cursorclass=pymysql.cursors.DictCursor
        )
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
                            errores.append(f"Estado '{estado_nombre}' no valido para paciente {paciente_id}")
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

@app.get("/api/sala-espera/estadisticas")
def get_estadisticas_sala_espera():
    try:
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='root',
            database='u997398721_consultorio_db',
            port=3306,
            cursorclass=pymysql.cursors.DictCursor
        )
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
        raise HTTPException(status_code=500, detail=f"Error obteniendo estadisticas: {str(e)}")

# ====================== ENDPOINTS DE AGENDA DE PROCEDIMIENTOS ======================

@app.get("/api/agenda-procedimientos/disponibilidad")
def verificar_disponibilidad(
    fecha: str,
    hora: str,
    duracion: int,
    exclude_id: int | None = None,
    procedimiento_id: int | None = None
):
    # 🔒 Normalizar procedimiento_id
    if procedimiento_id is not None:
        try:
            procedimiento_id = int(procedimiento_id)
            if procedimiento_id <= 0:
                procedimiento_id = None
        except ValueError:
            procedimiento_id = None

    print("🧪 procedimiento_id final:", procedimiento_id, type(procedimiento_id))

    """
    Verifica disponibilidad de horario para procedimientos.
    """
    try:
        from datetime import datetime, timedelta
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='root',
            database='u997398721_consultorio_db',
            port=3306,
            cursorclass=pymysql.cursors.DictCursor
        )
        with conn:
            with conn.cursor() as cursor:
                # Asegurar formato de hora
                hora_inicio = hora
                if hora_inicio.count(":") == 1:
                    hora_inicio += ":00"
                    print(f"   🕐 Hora formateada: {hora_inicio}")
                
                hora_fin = (datetime.strptime(hora_inicio, '%H:%M:%S') + 
                           timedelta(minutes=duracion)).strftime('%H:%M:%S')
                
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
                
                if procedimiento_id is not None and procedimiento_id != "":
                    try:
                        proc_id_int = int(procedimiento_id)
                        query += " AND ap.procedimiento_id != %s"
                        params.append(proc_id_int)
                    except ValueError:
                        raise HTTPException(
                            status_code=422,
                            detail="procedimiento_id debe ser un entero válido"
                        )
                
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
                
                print(f"📝 Query SQL: {query}")
                print(f"📝 Parámetros: {params}")
                
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
                
    except Exception as e:
        print(f"❌ ERROR CRÍTICO en verificar_disponibilidad: {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "error": True,
            "message": f"Error del servidor: {str(e)}",
            "disponible": False,
            "conflictos": []
        } 

@app.get("/api/agenda-procedimientos", response_model=dict)
def get_agenda_procedimientos(
    limit: int = 100, 
    offset: int = 0,
    fecha: Optional[str] = None,
    estado: Optional[str] = None,
    numero_documento: Optional[str] = None,
    fecha_inicio: Optional[str] = None,
    fecha_fin: Optional[str] = None
):
    try:
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='root',
            database='u997398721_consultorio_db',
            port=3306,
            cursorclass=pymysql.cursors.DictCursor
        )
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

@app.get("/api/agenda-procedimientos/{procedimiento_id}", response_model=dict)
def get_agenda_procedimiento(procedimiento_id: int):
    try:
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='root',
            database='u997398721_consultorio_db',
            port=3306,
            cursorclass=pymysql.cursors.DictCursor
        )
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

@app.post("/api/agenda-procedimientos", response_model=dict)
def create_agenda_procedimiento(procedimiento: AgendaProcedimientoCreate):
    try:
        from datetime import datetime, timedelta
        
        print(f"📥 BACKEND create_agenda_procedimiento recibió:")
        print(f"   numero_documento: {procedimiento.numero_documento}")
        print(f"   fecha: {procedimiento.fecha} (tipo: {type(procedimiento.fecha)})")
        print(f"   hora: {procedimiento.hora} (tipo: {type(procedimiento.hora)})")
        print(f"   procedimiento_id: {procedimiento.procedimiento_id} (tipo: {type(procedimiento.procedimiento_id)})")
        print(f"   duracion: {procedimiento.duracion}")
        print(f"   estado: {procedimiento.estado}")
        
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='root',
            database='u997398721_consultorio_db',
            port=3306,
            cursorclass=pymysql.cursors.DictCursor
        )
        with conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT nombre, apellido FROM paciente 
                    WHERE numero_documento = %s
                """, (procedimiento.numero_documento,))
                
                paciente = cursor.fetchone()
                if not paciente:
                    print(f"❌ Paciente no encontrado: {procedimiento.numero_documento}")
                    raise HTTPException(
                        status_code=404, 
                        detail=f"Paciente con documento {procedimiento.numero_documento} no encontrado"
                    )
                
                cursor.execute("""
                    SELECT id, nombre FROM procedimiento 
                    WHERE id = %s
                """, (procedimiento.procedimiento_id,))
                
                proc = cursor.fetchone()
                if not proc:
                    print(f"❌ Procedimiento no encontrado: {procedimiento.procedimiento_id}")
                    raise HTTPException(
                        status_code=404, 
                        detail=f"Procedimiento con ID {procedimiento.procedimiento_id} no encontrado"
                    )
                
                duracion = procedimiento.duracion or 60
                
                hora_inicio = procedimiento.hora
                hora_fin = (datetime.strptime(hora_inicio, '%H:%M:%S') + 
                           timedelta(minutes=duracion)).strftime('%H:%M:%S')
                
                print(f"🔍 Verificando conflictos:")
                print(f"   Fecha: {procedimiento.fecha}")
                print(f"   Hora inicio: {hora_inicio}")
                print(f"   Hora fin: {hora_fin}")
                print(f"   Duración: {duracion} minutos")
                
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
                    print(f"❌ Conflictos encontrados: {len(conflictos)}")
                    for conflicto in conflictos:
                        print(f"   - ID: {conflicto['id']}, Hora: {conflicto['hora']}, Estado: {conflicto['estado']}")
                    
                    conflicto_info = conflictos[0]
                    raise HTTPException(
                        status_code=409,
                        detail=f"Conflicto de horario. Ya existe un procedimiento programado para esa hora. ID conflicto: {conflicto_info['id']}"
                    )
                
                print(f"✅ Sin conflictos, procediendo a insertar...")
                
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
                
                print(f"✅ Procedimiento creado exitosamente: ID {procedimiento_id}")
                
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
        import traceback
        print(f"❌ ERROR creando procedimiento: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail={
            "error": "Error creando procedimiento agendado",
            "message": str(e)
        })
    
@app.put("/api/agenda-procedimientos/{procedimiento_id}", response_model=dict)
def update_agenda_procedimiento(procedimiento_id: int, procedimiento: AgendaProcedimientoUpdate):
    try:
        from datetime import datetime, timedelta
        
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='root',
            database='u997398721_consultorio_db',
            port=3306,
            cursorclass=pymysql.cursors.DictCursor
        )
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
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail={
            "error": "Error actualizando procedimiento agendado",
            "message": str(e)
        })

@app.delete("/api/agenda-procedimientos/{procedimiento_id}", response_model=dict)
def delete_agenda_procedimiento(procedimiento_id: int):
    try:
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='root',
            database='u997398721_consultorio_db',
            port=3306,
            cursorclass=pymysql.cursors.DictCursor
        )
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
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail={
            "error": "Error eliminando procedimiento agendado",
            "message": str(e)
        })

@app.get("/api/debug/params")
def debug_params(
    fecha: str,
    hora: str,
    duracion: int = Query(60),
    exclude_id: Optional[int] = Query(None),
    procedimiento_id: Optional[Union[int, str]] = Query(None)
):
    """
    Endpoint para debuggear los parámetros recibidos
    """
    return {
        "fecha": fecha,
        "fecha_type": type(fecha).__name__,
        "hora": hora,
        "hora_type": type(hora).__name__,
        "duracion": duracion,
        "duracion_type": type(duracion).__name__,
        "exclude_id": exclude_id,
        "exclude_id_type": type(exclude_id).__name__ if exclude_id else "None",
        "procedimiento_id": procedimiento_id,
        "procedimiento_id_type": type(procedimiento_id).__name__ if procedimiento_id else "None",
        "procedimiento_id_is_int": isinstance(procedimiento_id, int),
        "procedimiento_id_is_str": isinstance(procedimiento_id, str),
        "procedimiento_id_int_conversion": int(procedimiento_id) if procedimiento_id and str(procedimiento_id).isdigit() else "No convertible"
    }

@app.get("/api/agenda-procedimientos/estados/disponibles")
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

@app.get("/api/agenda-procedimientos/calendario/{year}/{month}")
def get_calendario_procedimientos(year: int, month: int):
    try:
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='root',
            database='u997398721_consultorio_db',
            port=3306,
            cursorclass=pymysql.cursors.DictCursor
        )
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

# ====================== ENDPOINTS DE COTIZACIONES ======================

@app.get("/api/cotizaciones", response_model=dict)
def get_cotizaciones(limit: int = 50, offset: int = 0):
    try:
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='root',
            database='u997398721_consultorio_db',
            port=3306,
            cursorclass=pymysql.cursors.DictCursor
        )
        with conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT 
                        c.id,
                        c.paciente_id,
                        c.usuario_id,
                        c.plan_id,
                        c.estado_id,
                        ec.nombre as estado_nombre,
                        c.total,
                        c.notas as observaciones,
                        DATE(c.fecha_emision) as fecha_creacion,
                        DATE(c.fecha_vencimiento) as fecha_vencimiento,
                        p.nombre as paciente_nombre,
                        p.apellido as paciente_apellido,
                        p.numero_documento as paciente_documento,
                        u.nombre as usuario_nombre
                    FROM cotizacion c
                    JOIN paciente p ON c.paciente_id = p.id
                    JOIN usuario u ON c.usuario_id = u.id
                    JOIN estado_cotizacion ec ON c.estado_id = ec.id
                    ORDER BY c.fecha_emision DESC
                    LIMIT %s OFFSET %s
                """, (limit, offset))
                cotizaciones = cursor.fetchall()
                
                for cotizacion in cotizaciones:
                    cursor.execute("""
                        SELECT 
                            id,
                            tipo,
                            COALESCE(procedimiento_id, 0) as item_id,
                            descripcion as nombre,
                            cantidad,
                            precio_unitario,
                            subtotal
                        FROM cotizacion_item
                        WHERE cotizacion_id = %s
                        ORDER BY tipo, descripcion
                    """, (cotizacion['id'],))
                    items = cursor.fetchall()
                    
                    # 🔴 NUEVO: Obtener servicios incluidos para cada cotización
                    cursor.execute("""
                        SELECT 
                            servicio_nombre,
                            requiere
                        FROM cotizacion_servicio_incluido
                        WHERE cotizacion_id = %s
                    """, (cotizacion['id'],))
                    servicios_incluidos = cursor.fetchall()
                    
                    # Si no hay servicios, usar los por defecto
                    if not servicios_incluidos:
                        servicios_incluidos = [
                            {"servicio_nombre": "CIRUJANO PLASTICO, AYUDANTE Y PERSONAL CLINICO", "requiere": False},
                            {"servicio_nombre": "ANESTESIOLOGO", "requiere": False},
                            {"servicio_nombre": "CONTROLES CON MEDICO Y ENFERMERA", "requiere": False},
                            {"servicio_nombre": "VALORACION CON ANESTESIOLOGO", "requiere": False},
                            {"servicio_nombre": "HEMOGRAMA DE CONTROL", "requiere": False},
                            {"servicio_nombre": "UNA NOCHE DE HOSPITALIZACION CON UN ACOMPAÑANTES", "requiere": False},
                            {"servicio_nombre": "IMPLANTES", "requiere": False},
                        ]
                    
                    subtotal_procedimientos = 0
                    subtotal_adicionales = 0
                    subtotal_otros_adicionales = 0
                    
                    for item in items:
                        if item['tipo'] == 'procedimiento':
                            subtotal_procedimientos += float(item['subtotal'])
                        elif item['tipo'] == 'adicional':
                            subtotal_adicionales += float(item['subtotal'])
                        elif item['tipo'] == 'otro_adicional':
                            subtotal_otros_adicionales += float(item['subtotal'])
                    
                    cotizacion['items'] = items
                    cotizacion['servicios_incluidos'] = servicios_incluidos  # 🔴 AGREGAR ESTO
                    cotizacion['subtotal_procedimientos'] = subtotal_procedimientos
                    cotizacion['subtotal_adicionales'] = subtotal_adicionales
                    cotizacion['subtotal_otros_adicionales'] = subtotal_otros_adicionales
                    
                    if cotizacion['fecha_vencimiento'] and cotizacion['fecha_creacion']:
                        try:
                            from datetime import datetime
                            fecha_creacion = datetime.strptime(str(cotizacion['fecha_creacion']), '%Y-%m-%d')
                            fecha_vencimiento = datetime.strptime(str(cotizacion['fecha_vencimiento']), '%Y-%m-%d')
                            validez_dias = (fecha_vencimiento - fecha_creacion).days
                            cotizacion['validez_dias'] = validez_dias if validez_dias > 0 else 7
                        except:
                            cotizacion['validez_dias'] = 7
                    else:
                        cotizacion['validez_dias'] = 7
                
                cursor.execute("SELECT COUNT(*) as total FROM cotizacion")
                total = cursor.fetchone()['total']
                
                return {
                    "cotizaciones": cotizaciones,
                    "total": total,
                    "limit": limit,
                    "offset": offset
                }
    except Exception as e:
        error_msg = str(e)
        if "cotizacion" in error_msg.lower():
            return {"cotizaciones": [], "total": 0}
        raise HTTPException(status_code=500, detail=error_msg)
        
@app.get("/api/cotizaciones/{cotizacion_id}", response_model=dict)
def get_cotizacion(cotizacion_id: int):
    try:
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='root',
            database='u997398721_consultorio_db',
            port=3306,
            cursorclass=pymysql.cursors.DictCursor
        )
        with conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT 
                        c.*,
                        c.notas as observaciones,
                        ec.nombre as estado_nombre,
                        p.nombre as paciente_nombre,
                        p.apellido as paciente_apellido,
                        p.numero_documento as paciente_documento,
                        p.telefono as paciente_telefono,
                        p.email as paciente_email,
                        u.nombre as usuario_nombre
                    FROM cotizacion c
                    JOIN estado_cotizacion ec ON c.estado_id = ec.id
                    JOIN paciente p ON c.paciente_id = p.id
                    JOIN usuario u ON c.usuario_id = u.id
                    WHERE c.id = %s
                """, (cotizacion_id,))
                cotizacion = cursor.fetchone()
                
                if not cotizacion:
                    raise HTTPException(status_code=404, detail="Cotización no encontrada")
                
                cursor.execute("""
                    SELECT 
                        id,
                        tipo,
                        item_id,
                        descripcion as nombre,
                        cantidad,
                        precio_unitario,
                        subtotal
                    FROM cotizacion_item
                    WHERE cotizacion_id = %s
                    ORDER BY tipo, descripcion
                """, (cotizacion_id,))
                items = cursor.fetchall()
                
                # 🔴 NUEVO: Obtener servicios incluidos de la BD
                cursor.execute("""
                    SELECT 
                        servicio_nombre,
                        requiere
                    FROM cotizacion_servicio_incluido
                    WHERE cotizacion_id = %s
                """, (cotizacion_id,))
                servicios_incluidos = cursor.fetchall()
                
                # Si no hay servicios en la BD, usar los por defecto
                if not servicios_incluidos:
                    servicios_incluidos = [
                        {"servicio_nombre": "CIRUJANO PLASTICO, AYUDANTE Y PERSONAL CLINICO", "requiere": False},
                        {"servicio_nombre": "ANESTESIOLOGO", "requiere": False},
                        {"servicio_nombre": "CONTROLES CON MEDICO Y ENFERMERA", "requiere": False},
                        {"servicio_nombre": "VALORACION CON ANESTESIOLOGO", "requiere": False},
                        {"servicio_nombre": "HEMOGRAMA DE CONTROL", "requiere": False},
                        {"servicio_nombre": "UNA NOCHE DE HOSPITALIZACION CON UN ACOMPAÑANTES", "requiere": False},
                        {"servicio_nombre": "IMPLANTES", "requiere": False},
                    ]
                
                subtotal_procedimientos = 0
                subtotal_adicionales = 0
                subtotal_otros_adicionales = 0
                
                for item in items:
                    if item['tipo'] == 'procedimiento':
                        subtotal_procedimientos += float(item['subtotal'])
                    elif item['tipo'] == 'adicional':
                        subtotal_adicionales += float(item['subtotal'])
                    elif item['tipo'] == 'otro_adicional':
                        subtotal_otros_adicionales += float(item['subtotal'])
                
                cotizacion['items'] = items
                cotizacion['servicios_incluidos'] = servicios_incluidos  # 🔴 AGREGAR ESTO
                cotizacion['subtotal_procedimientos'] = subtotal_procedimientos
                cotizacion['subtotal_adicionales'] = subtotal_adicionales
                cotizacion['subtotal_otros_adicionales'] = subtotal_otros_adicionales
                
                if cotizacion['fecha_vencimiento'] and cotizacion['fecha_emision']:
                    try:
                        from datetime import datetime
                        fecha_creacion = datetime.strptime(str(cotizacion['fecha_emision']), '%Y-%m-%d %H:%M:%S')
                        fecha_vencimiento = datetime.strptime(str(cotizacion['fecha_vencimiento']), '%Y-%m-%d')
                        validez_dias = (fecha_vencimiento - fecha_creacion.date()).days
                        cotizacion['validez_dias'] = validez_dias if validez_dias > 0 else 7
                    except:
                        cotizacion['validez_dias'] = 7
                else:
                    cotizacion['validez_dias'] = 7
                
                return cotizacion
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail={
            "error": "Error obteniendo cotización",
            "message": str(e)
        })
    
@app.put("/api/cotizaciones/{cotizacion_id}", response_model=dict)
def update_cotizacion(cotizacion_id: int, cotizacion: CotizacionUpdate):
    print(f"🔄 Actualizando cotización ID: {cotizacion_id}")
    print(f"📦 Datos recibidos: {cotizacion}")
    
    try:
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='root',
            database='u997398721_consultorio_db',
            port=3306,
            cursorclass=pymysql.cursors.DictCursor
        )
        with conn:
            with conn.cursor() as cursor:
                # 1. Verificar que la cotización existe
                cursor.execute("SELECT id FROM cotizacion WHERE id = %s", (cotizacion_id,))
                if not cursor.fetchone():
                    print(f"❌ Cotización {cotizacion_id} no encontrada")
                    raise HTTPException(status_code=404, detail="Cotización no encontrada")
                
                # 2. Preparar campos a actualizar - SIN 'total'
                update_fields = []
                values = []
                
                if cotizacion.paciente_id is not None:
                    cursor.execute("SELECT id FROM paciente WHERE id = %s", (cotizacion.paciente_id,))
                    if not cursor.fetchone():
                        raise HTTPException(status_code=404, detail="Paciente no encontrado")
                    
                    update_fields.append("paciente_id = %s")
                    values.append(cotizacion.paciente_id)
                
                if cotizacion.usuario_id is not None:
                    cursor.execute("SELECT id FROM usuario WHERE id = %s", (cotizacion.usuario_id,))
                    if not cursor.fetchone():
                        raise HTTPException(status_code=404, detail="Usuario no encontrado")
                    
                    update_fields.append("usuario_id = %s")
                    values.append(cotizacion.usuario_id)
                
                # En el endpoint update_cotizacion en main.py
                if cotizacion.estado_id is not None:
                    cursor.execute("SELECT id FROM estado_cotizacion WHERE id = %s", (cotizacion.estado_id,))
                    if not cursor.fetchone():
                        raise HTTPException(status_code=404, detail="Estado no encontrado")
                    
                    update_fields.append("estado_id = %s")
                    values.append(cotizacion.estado_id)
                
                # Actualizar subtotales si se envían
                if cotizacion.subtotal_procedimientos is not None:
                    update_fields.append("subtotal_procedimientos = %s")
                    values.append(float(cotizacion.subtotal_procedimientos))
                
                if cotizacion.subtotal_adicionales is not None:
                    update_fields.append("subtotal_adicionales = %s")
                    values.append(float(cotizacion.subtotal_adicionales))
                
                if cotizacion.subtotal_otros_adicionales is not None:
                    update_fields.append("subtotal_otros_adicionales = %s")
                    values.append(float(cotizacion.subtotal_otros_adicionales))
                
                # **IMPORTANTE: NO actualizar 'total' - es GENERATED y se calculará automáticamente**
                # MySQL calculará: total = subtotal_procedimientos + subtotal_adicionales + subtotal_otros_adicionales
                
                if cotizacion.observaciones is not None:
                    update_fields.append("notas = %s")
                    values.append(cotizacion.observaciones)
                
                if cotizacion.fecha_vencimiento is not None:
                    update_fields.append("fecha_vencimiento = %s")
                    values.append(cotizacion.fecha_vencimiento)
                
                # 3. Actualizar cotización principal si hay campos
                if update_fields:
                    values.append(cotizacion_id)
                    query = f"UPDATE cotizacion SET {', '.join(update_fields)} WHERE id = %s"
                    print(f"📝 Query SQL: {query}")
                    print(f"📝 Valores: {values}")
                    
                    cursor.execute(query, values)
                    conn.commit()
                    
                    print(f"✅ Cotización {cotizacion_id} actualizada")
                
                # 4. Actualizar items si se proporcionan
                if cotizacion.items is not None:
                    print(f"📦 Actualizando {len(cotizacion.items)} items...")
                    
                    # Eliminar items existentes
                    cursor.execute("DELETE FROM cotizacion_item WHERE cotizacion_id = %s", (cotizacion_id,))
                    
                    # Insertar nuevos items
                    for item in cotizacion.items:
                        cursor.execute("""
                            INSERT INTO cotizacion_item (
                                cotizacion_id, tipo, item_id, descripcion,
                                cantidad, precio_unitario, subtotal
                            ) VALUES (%s, %s, %s, %s, %s, %s, %s)
                        """, (
                            cotizacion_id,
                            item.tipo,
                            item.item_id,
                            item.nombre,
                            item.cantidad,
                            float(item.precio_unitario),
                            float(item.subtotal)
                        ))
                    
                    conn.commit()
                    print(f"✅ Items actualizados para cotización {cotizacion_id}")
                
                # 5. Actualizar servicios incluidos si se proporcionan
                if cotizacion.servicios_incluidos is not None:
                    print(f"🔧 Actualizando {len(cotizacion.servicios_incluidos)} servicios incluidos...")
                    
                    try:
                        # Eliminar servicios existentes
                        cursor.execute("DELETE FROM cotizacion_servicio_incluido WHERE cotizacion_id = %s", (cotizacion_id,))
                        
                        # Insertar nuevos servicios
                        for servicio in cotizacion.servicios_incluidos:
                            cursor.execute("""
                                INSERT INTO cotizacion_servicio_incluido (
                                    cotizacion_id, servicio_nombre, requiere
                                ) VALUES (%s, %s, %s)
                            """, (
                                cotizacion_id,
                                servicio.servicio_nombre,
                                servicio.requiere
                            ))
                        
                        conn.commit()
                        print(f"✅ Servicios incluidos actualizados para cotización {cotizacion_id}")
                        
                    except Exception as table_error:
                        print(f"⚠️ Tabla de servicios no disponible: {table_error}")
                
                return {
                    "success": True,
                    "message": "Cotización actualizada exitosamente",
                    "cotizacion_id": cotizacion_id
                }
                
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error actualizando cotización: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail={
            "error": "Error actualizando cotización",
            "message": str(e)
        })
                    
@app.post("/api/cotizaciones", response_model=dict)
def create_cotizacion(cotizacion: CotizacionCreate):
    try:
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='root',
            database='u997398721_consultorio_db',
            port=3306,
            cursorclass=pymysql.cursors.DictCursor
        )
        
        with conn:
            with conn.cursor() as cursor:
                # Verificar que el paciente existe
                cursor.execute("SELECT id, nombre, apellido FROM paciente WHERE id = %s", (cotizacion.paciente_id,))
                paciente = cursor.fetchone()
                if not paciente:
                    raise HTTPException(status_code=404, detail=f"Paciente con ID {cotizacion.paciente_id} no encontrado")
                
                paciente_nombre = paciente['nombre']
                paciente_apellido = paciente['apellido']
                
                # Verificar que el usuario existe
                cursor.execute("SELECT id, nombre FROM usuario WHERE id = %s", (cotizacion.usuario_id,))
                usuario = cursor.fetchone()
                if not usuario:
                    raise HTTPException(status_code=404, detail=f"Usuario con ID {cotizacion.usuario_id} no encontrado")
                
                usuario_nombre = usuario['nombre']
                
                # Verificar que el estado existe
                cursor.execute("SELECT id FROM estado_cotizacion WHERE id = %s", (cotizacion.estado_id,))
                if not cursor.fetchone():
                    raise HTTPException(status_code=404, detail=f"Estado de cotización con ID {cotizacion.estado_id} no encontrado")
                
                # Calcular fecha_vencimiento si no se proporciona
                fecha_vencimiento = cotizacion.fecha_vencimiento
                if not fecha_vencimiento and cotizacion.validez_dias:
                    from datetime import datetime, timedelta
                    fecha_vencimiento = (datetime.now() + timedelta(days=cotizacion.validez_dias)).strftime('%Y-%m-%d')
                
                # **CORRECCIÓN CRÍTICA: Insertar SIN el campo 'total'**
                # El campo 'total' es GENERATED, MySQL lo calculará automáticamente
                cursor.execute("""
                    INSERT INTO cotizacion (
                        paciente_id, usuario_id, plan_id, estado_id,
                        notas, fecha_vencimiento,
                        subtotal_procedimientos, subtotal_adicionales, subtotal_otros_adicionales
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    cotizacion.paciente_id,
                    cotizacion.usuario_id,
                    cotizacion.plan_id,
                    cotizacion.estado_id,
                    cotizacion.observaciones or "",
                    fecha_vencimiento,
                    cotizacion.subtotal_procedimientos if hasattr(cotizacion, 'subtotal_procedimientos') else 0,
                    cotizacion.subtotal_adicionales if hasattr(cotizacion, 'subtotal_adicionales') else 0,
                    cotizacion.subtotal_otros_adicionales if hasattr(cotizacion, 'subtotal_otros_adicionales') else 0
                ))
                
                cotizacion_id = cursor.lastrowid
                
                # Insertar items
                for item in cotizacion.items:
                    cursor.execute("""
                        INSERT INTO cotizacion_item (
                            cotizacion_id, tipo, item_id, descripcion,
                            cantidad, precio_unitario, subtotal
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s)
                    """, (
                        cotizacion_id,
                        item.tipo,
                        item.item_id,
                        item.nombre,
                        item.cantidad,
                        item.precio_unitario,
                        item.subtotal
                    ))
                
                # Insertar servicios incluidos
                for servicio in cotizacion.servicios_incluidos:
                    cursor.execute("""
                        INSERT INTO cotizacion_servicio_incluido (
                            cotizacion_id, servicio_nombre, requiere
                        ) VALUES (%s, %s, %s)
                    """, (
                        cotizacion_id,
                        servicio.servicio_nombre,
                        servicio.requiere
                    ))
                
                conn.commit()
                
                return {
                    "success": True,
                    "message": "Cotización creada exitosamente",
                    "cotizacion_id": cotizacion_id,
                    "paciente_nombre": f"{paciente_nombre} {paciente_apellido}",
                    "usuario_nombre": usuario_nombre
                }
                
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"ERROR DETALLADO: {error_details}")
        raise HTTPException(status_code=500, detail={
            "error": "Error creando cotización",
            "message": str(e),
            "type": type(e).__name__
        })
                        
@app.delete("/api/cotizaciones/{cotizacion_id}", response_model=dict)
def delete_cotizacion(cotizacion_id: int):
    try:
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='root',
            database='u997398721_consultorio_db',
            port=3306,
            cursorclass=pymysql.cursors.DictCursor
        )
        with conn:
            with conn.cursor() as cursor:
                cursor.execute("SELECT id FROM cotizacion WHERE id = %s", (cotizacion_id,))
                cotizacion_existente = cursor.fetchone()
                if not cotizacion_existente:
                    raise HTTPException(status_code=404, detail="Cotizacion no encontrada")
                
                cursor.execute("DELETE FROM cotizacion_item WHERE cotizacion_id = %s", (cotizacion_id,))
                cursor.execute("DELETE FROM cotizacion WHERE id = %s", (cotizacion_id,))
                
                conn.commit()
                
                return {
                    "success": True,
                    "message": "Cotizacion eliminada exitosamente",
                    "cotizacion_id": cotizacion_id
                }
                
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail={
            "error": "Error eliminando cotizacion",
            "message": str(e),
            "type": type(e).__name__
        })

@app.get("/api/cotizaciones/plantilla-servicios")
def get_plantilla_servicios():
    servicios_base = [
        {"servicio_nombre": "CIRUJANO PLASTICO, AYUDANTE Y PERSONAL CLINICO", "requiere": False},
        {"servicio_nombre": "ANESTESIOLOGO", "requiere": False},
        {"servicio_nombre": "CONTROLES CON MEDICO Y ENFERMERA", "requiere": False},
        {"servicio_nombre": "VALORACION CON ANESTESIOLOGO", "requiere": False},
        {"servicio_nombre": "HEMOGRAMA DE CONTROL", "requiere": False},
        {"servicio_nombre": "UNA NOCHE DE HOSPITALIZACION CON UN ACOMPAÑANTES", "requiere": False},
        {"servicio_nombre": "IMPLANTES", "requiere": False},
    ]
    return {"servicios": servicios_base}

# ====================== ENDPOINTS DE DEBUG ======================

@app.get("/api/debug/upload-dir")
def debug_upload_dir():
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

@app.get("/api/debug/sala-espera")
def debug_sala_espera():
    try:
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='root',
            database='u997398721_consultorio_db',
            port=3306,
            cursorclass=pymysql.cursors.DictCursor
        )
        with conn:
            with conn.cursor() as cursor:
                hoy = datetime.now().strftime('%Y-%m-%d')
                
                cursor.execute("SHOW TABLES LIKE '%sala%'")
                tablas_sala = cursor.fetchall()
                
                cursor.execute("""
                    SELECT COUNT(*) as total FROM sala_espera 
                    WHERE DATE(fecha_hora_ingreso) = %s
                """, (hoy,))
                registros_hoy = cursor.fetchone()
                
                cursor.execute("""
                    SELECT 
                        se.id,
                        se.paciente_id,
                        p.nombre,
                        p.apellido,
                        COALESCE(ese.nombre, 'pendiente') as estado,
                        se.fecha_hora_ingreso,
                        se.fecha_hora_cambio_estado,
                        se.tiempo_espera_minutos,
                        se.tiene_cita_hoy,
                        se.hora_cita_programada
                    FROM sala_espera se
                    LEFT JOIN paciente p ON se.paciente_id = p.id
                    LEFT JOIN estado_sala_espera ese ON se.estado_id = ese.id
                    ORDER BY se.fecha_hora_ingreso DESC
                    LIMIT 10
                """)
                ultimos_registros = cursor.fetchall()
                
                cursor.execute("SELECT * FROM estado_sala_espera ORDER BY orden")
                estados = cursor.fetchall()
                
                cursor.execute("DESCRIBE sala_espera")
                estructura = cursor.fetchall()
                
                return {
                    "tablas_disponibles": [tabla[f"Tables_in_u997398721_consultorio_db (%sala%)"] for tabla in tablas_sala],
                    "registros_hoy": registros_hoy['total'],
                    "estados_disponibles": estados,
                    "ultimos_registros": ultimos_registros,
                    "estructura_sala_espera": estructura,
                    "fecha_actual": hoy
                }
    except Exception as e:
        return {"error": str(e), "tablas": []}
    
# ====================== ENDPOINTS DE PLAN QUIRÚRGICO ======================

@app.get("/api/planes-quirurgicos", response_model=dict)
def get_planes_quirurgicos(limit: int = 50, offset: int = 0):
    try:
        conn = pymysql.connect(
            host="localhost",
            user="hicadministracion@hotmail.com",
            password="Hic12969991",
            database="u997398721_consultorio_db",
            port=3306,
            cursorclass=pymysql.cursors.DictCursor
        )

        with conn:
            with conn.cursor() as cursor:
                cursor.execute("SELECT COUNT(*) AS total FROM plan_quirurgico")
                total = cursor.fetchone()["total"]

                # 🔴 MODIFICACIÓN: Agregar JOIN con paciente para traer nombre y documento
                cursor.execute("""
                    SELECT 
                        pq.*,
                        p.nombre AS paciente_nombre,
                        p.apellido AS paciente_apellido,
                        p.numero_documento AS paciente_documento,
                        CONCAT(p.nombre, ' ', p.apellido) AS nombre_completo_paciente,
                        u.nombre AS usuario_nombre
                    FROM plan_quirurgico pq
                    JOIN paciente p ON pq.paciente_id = p.id
                    JOIN usuario u ON pq.usuario_id = u.id
                    ORDER BY pq.fecha_creacion DESC
                    LIMIT %s OFFSET %s
                """, (limit, offset))

                planes = cursor.fetchall()

                return {
                    "success": True,
                    "total": total,
                    "limit": limit,
                    "offset": offset,
                    "planes": planes
                }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.get("/api/planes-quirurgicos/{plan_id}", response_model=dict)
def get_plan_quirurgico(plan_id: str):
    print(f"🔍 GET Plan quirúrgico ID: {plan_id}")
    try:
        # Limpiar ID si viene con prefijo 'plan_'
        plan_id_num = plan_id.replace('plan_', '')
        print(f"🔍 ID numérico: {plan_id_num}")
        
        conn = pymysql.connect(
            host="localhost",
            user="hicadministracion@hotmail.com",
            password="Hic12969991",
            database="u997398721_consultorio_db",
            port=3306,
            cursorclass=pymysql.cursors.DictCursor
        )
        
        with conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT * 
                    FROM plan_quirurgico 
                    WHERE id = %s
                """, (plan_id_num,))
                
                plan = cursor.fetchone()
                print(f"🔍 Plan encontrado en BD: {plan}")
                
                if not plan:
                    raise HTTPException(status_code=404, detail="Plan no encontrado")
                
                # Log de todos los campos
                print("📊 CAMPOS DEL PLAN:")
                for key, value in plan.items():
                    print(f"   {key}: {value}")
                
                return {
                    "success": True,
                    "plan": plan
                }
                
    except Exception as e:
        print(f"❌ ERROR obteniendo plan: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/pacientes/todos", response_model=dict)
def get_todos_pacientes():
    """
    Obtiene todos los pacientes para selección en formularios
    """
    try:
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='root',
            database='u997398721_consultorio_db',
            port=3306,
            cursorclass=pymysql.cursors.DictCursor
        )
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

@app.post("/api/planes-quirurgicos", response_model=dict)
def create_plan_quirurgico(plan: PlanQuirurgicoCreate):
    try:
        def norm_datetime(v):
            if not v:
                return None
            if isinstance(v, str):
                return v.replace("T", " ").replace("Z", "")
            return v

        def norm_time(v):
            if not v:
                return None
            if isinstance(v, str):
                return v[:8]
            return v

        conn = pymysql.connect(
            host="localhost",
            user="hicadministracion@hotmail.com",
            password="Hic12969991",
            database="u997398721_consultorio_db",
            port=3306,
            cursorclass=pymysql.cursors.DictCursor,
            autocommit=False
        )

        with conn.cursor() as cursor:

            cursor.execute("SELECT * FROM paciente WHERE id=%s", (plan.paciente_id,))
            paciente = cursor.fetchone()
            if not paciente:
                raise HTTPException(404, "Paciente no encontrado")

            cursor.execute("SELECT * FROM usuario WHERE id=%s", (plan.usuario_id,))
            usuario = cursor.fetchone()
            if not usuario:
                raise HTTPException(404, "Usuario no encontrado")

            edad = plan.edad
            if not edad and paciente.get("fecha_nacimiento"):
                fn = paciente["fecha_nacimiento"]
                edad = (datetime.now().date() - fn.date()).days // 365

            imc = plan.imc
            categoria_imc = plan.categoriaIMC

            if plan.peso and plan.altura and plan.altura > 0:
                imc = imc or float(plan.peso) / (float(plan.altura) ** 2)
                categoria_imc = categoria_imc or (
                    "Bajo peso" if imc < 18.5 else
                    "Saludable" if imc < 25 else
                    "Sobrepeso" if imc < 30 else
                    "Obesidad"
                )

            sql = """
            INSERT INTO plan_quirurgico (
                paciente_id, usuario_id,
                procedimiento_desc, anestesiologo, materiales_requeridos,
                notas_preoperatorias, riesgos, hora, fecha_programada,
                nombre_completo, peso, altura, fecha_nacimiento, imc,
                imagen_procedimiento, fecha_ultimo_procedimiento,
                descripcion_procedimiento, detalles, notas_doctor,
                tiempo_cirugia_minutos, entidad, edad,
                telefono, celular, direccion, email,
                motivo_consulta, farmacologicos, traumaticos,
                quirurgicos, alergicos, toxicos, habitos,
                cabeza, mamas, tcs, abdomen, gluteos, extremidades, pies_faneras,
                identificacion, fecha_consulta, hora_consulta,
                categoriaIMC, edad_calculada, ocupacion,
                enfermedad_actual, antecedentes, notas_corporales,
                duracion_estimada, tipo_anestesia, requiere_hospitalizacion,
                tiempo_hospitalizacion, reseccion_estimada,
                firma_cirujano, firma_paciente,
                esquema_mejorado, plan_conducta
            ) VALUES (
                %s,%s,%s,%s,%s,%s,%s,%s,%s,
                %s,%s,%s,%s,%s,%s,%s,%s,%s,%s,
                %s,%s,%s,%s,%s,%s,%s,%s,%s,%s,
                %s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,
                %s,%s,%s,%s,%s,%s,%s,%s,%s,%s,
                %s,%s,%s,%s,%s,%s,%s,%s
            )
            """

            values = tuple([
                plan.paciente_id, plan.usuario_id,
                plan.procedimiento_desc, plan.anestesiologo, plan.materiales_requeridos,
                plan.notas_preoperatorias, plan.riesgos, norm_time(plan.hora),
                norm_datetime(plan.fecha_programada),
                plan.nombre_completo or f"{paciente['nombre']} {paciente['apellido']}",
                plan.peso, plan.altura, plan.fecha_nacimiento, imc,
                plan.imagen_procedimiento, plan.fecha_ultimo_procedimiento,
                plan.descripcion_procedimiento, plan.detalles, plan.notas_doctor,
                plan.tiempo_cirugia_minutos, plan.entidad, edad,
                plan.telefono, plan.celular, plan.direccion, plan.email,
                plan.motivo_consulta, plan.farmacologicos, plan.traumaticos,
                plan.quirurgicos, plan.alergicos, plan.toxicos, plan.habitos,
                plan.cabeza, plan.mamas, plan.tcs, plan.abdomen,
                plan.gluteos, plan.extremidades, plan.pies_faneras,
                plan.identificacion, plan.fecha_consulta, norm_time(plan.hora_consulta),
                categoria_imc, edad, plan.ocupacion,
                json.dumps(plan.enfermedad_actual),
                json.dumps(plan.antecedentes),
                json.dumps(plan.notas_corporales),
                plan.duracion_estimada, plan.tipo_anestesia,
                int(bool(plan.requiere_hospitalizacion)),
                plan.tiempo_hospitalizacion, plan.reseccion_estimada,
                plan.firma_cirujano, plan.firma_paciente,
                json.dumps(plan.esquema_mejorado),
                plan.plan_conducta
            ])

            cursor.execute(sql, values)
            conn.commit()

            return {"success": True, "plan_id": cursor.lastrowid}

    except Exception as e:
        raise HTTPException(500, str(e))

@app.put("/api/planes-quirurgicos/{plan_id}", response_model=dict)
def update_plan_quirurgico(plan_id: str, plan_update: PlanQuirurgicoUpdate):
    """
    Actualiza un plan quirúrgico existente - VERSIÓN CORREGIDA
    """
    try:
        # Extraer ID numérico
        plan_id_num = plan_id.replace('plan_', '')
        
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='root',
            database='u997398721_consultorio_db',
            port=3306,
            cursorclass=pymysql.cursors.DictCursor
        )
        with conn:
            with conn.cursor() as cursor:
                # 1. Verificar que el plan existe y obtener datos actuales
                cursor.execute("""
                    SELECT * FROM plan_quirurgico WHERE id = %s
                """, (plan_id_num,))
                
                plan_existente = cursor.fetchone()
                if not plan_existente:
                    raise HTTPException(status_code=404, detail="Plan quirúrgico no encontrado")
                
                # 2. Construir query dinámica
                update_fields = []
                values = []
                
                # 3. Calcular IMC si se actualizan peso o altura
                # Usar valores existentes si no se proporcionan nuevos
                peso = plan_update.peso if plan_update.peso is not None else plan_existente['peso']
                altura = plan_update.altura if plan_update.altura is not None else plan_existente['altura']
                
                # Solo calcular IMC si tenemos ambos valores válidos
                if peso is not None and altura is not None and altura > 0:
                    try:
                        peso_float = float(peso)
                        altura_float = float(altura)
                        imc_calculado = peso_float / (altura_float ** 2)
                        
                        update_fields.append("imc = %s")
                        values.append(float(imc_calculado))
                        
                        # Calcular categoría IMC
                        if imc_calculado < 18.5:
                            categoria = "Bajo peso"
                        elif imc_calculado < 25:
                            categoria = "Saludable"
                        elif imc_calculado < 30:
                            categoria = "Sobrepeso"
                        else:
                            categoria = "Obesidad"
                        
                        update_fields.append("categoriaIMC = %s")
                        values.append(categoria)
                        
                    except (ValueError, TypeError) as e:
                        print(f"⚠️ Error calculando IMC: {e}")
                        # Mantener valores existentes si hay error
                        if plan_existente['imc']:
                            update_fields.append("imc = %s")
                            values.append(float(plan_existente['imc']))
                        if plan_existente['categoriaIMC']:
                            update_fields.append("categoriaIMC = %s")
                            values.append(plan_existente['categoriaIMC'])
                
                # 4. Mapear campos normales con manejo de tipos
                field_mapping = {
                    'procedimiento_desc': plan_update.procedimiento_desc,
                    'anestesiologo': plan_update.anestesiologo,
                    'materiales_requeridos': plan_update.materiales_requeridos,
                    'notas_preoperatorias': plan_update.notas_preoperatorias,
                    'riesgos': plan_update.riesgos,
                    'hora': plan_update.hora,
                    'fecha_programada': plan_update.fecha_programada,
                    'peso': plan_update.peso,
                    'altura': plan_update.altura,
                    'farmacologicos': plan_update.farmacologicos,
                    'traumaticos': plan_update.traumaticos,
                    'quirurgicos': plan_update.quirurgicos,
                    'alergicos': plan_update.alergicos,
                    'toxicos': plan_update.toxicos,
                    'habitos': plan_update.habitos,
                    'cabeza': plan_update.cabeza,
                    'mamas': plan_update.mamas,
                    'tcs': plan_update.tcs,
                    'abdomen': plan_update.abdomen,
                    'gluteos': plan_update.gluteos,
                    'extremidades': plan_update.extremidades,
                    'pies_faneras': plan_update.pies_faneras,
                    'duracion_estimada': plan_update.duracion_estimada,
                    'tipo_anestesia': plan_update.tipo_anestesia,
                    'tiempo_hospitalizacion': plan_update.tiempo_hospitalizacion,
                    'reseccion_estimada': plan_update.reseccion_estimada,
                    'firma_cirujano': plan_update.firma_cirujano,
                    'firma_paciente': plan_update.firma_paciente,
                    'imagen_procedimiento': plan_update.imagen_procedimiento,
                    'descripcion_procedimiento': plan_update.descripcion_procedimiento,
                    'detalles': plan_update.detalles,
                    'notas_doctor': plan_update.notas_doctor,
                    'tiempo_cirugia_minutos': plan_update.tiempo_cirugia_minutos,
                    'plan_conducta': plan_update.plan_conducta
                }
                
                for field, value in field_mapping.items():
                    if value is not None:
                        update_fields.append(f"{field} = %s")
                        values.append(value)
                
                # 5. Manejar campo booleano
                if plan_update.requiere_hospitalizacion is not None:
                    update_fields.append("requiere_hospitalizacion = %s")
                    # Convertir a int (0 o 1) para MySQL
                    requiere_int = 1 if plan_update.requiere_hospitalizacion else 0
                    values.append(requiere_int)
                
                # 6. Manejar campos JSON - siempre serializar si se proporcionan
                if plan_update.enfermedad_actual is not None:
                    update_fields.append("enfermedad_actual = %s")
                    values.append(json.dumps(plan_update.enfermedad_actual))
                
                if plan_update.antecedentes is not None:
                    update_fields.append("antecedentes = %s")
                    values.append(json.dumps(plan_update.antecedentes))
                
                if plan_update.notas_corporales is not None:
                    update_fields.append("notas_corporales = %s")
                    values.append(json.dumps(plan_update.notas_corporales))
                
                if plan_update.esquema_mejorado is not None:
                    update_fields.append("esquema_mejorado = %s")
                    values.append(json.dumps(plan_update.esquema_mejorado))
                
                # 7. Actualizar fecha de modificación
                update_fields.append("fecha_modificacion = NOW()")
                
                # 8. Verificar si hay algo para actualizar (más allá de fecha_modificacion)
                if len(update_fields) <= 1:  # Solo fecha_modificacion
                    return {
                        "success": True,
                        "message": "Sin cambios para actualizar",
                        "plan_id": plan_id
                    }
                
                # 9. Ejecutar actualización
                values.append(plan_id_num)
                query = f"UPDATE plan_quirurgico SET {', '.join(update_fields)} WHERE id = %s"
                
                print(f"🔍 Query de actualización: {query}")
                print(f"🔍 Valores: {values}")
                
                cursor.execute(query, values)
                conn.commit()
                
                # 10. Obtener el plan actualizado para retornar
                cursor.execute("""
                    SELECT * FROM plan_quirurgico WHERE id = %s
                """, (plan_id_num,))
                
                plan_actualizado = cursor.fetchone()
                
                return {
                    "success": True,
                    "message": "Plan quirúrgico actualizado exitosamente",
                    "plan_id": plan_id,
                    "data": plan_actualizado
                }
                
    except HTTPException as he:
        print(f"❌ HTTPException: {he.detail}")
        raise he
    except pymysql.err.ProgrammingError as pe:
        print(f"❌ Error SQL: {pe}")
        raise HTTPException(status_code=500, detail={
            "error": "Error de programación SQL",
            "message": str(pe)
        })
    except pymysql.err.OperationalError as oe:
        print(f"❌ Error operacional: {oe}")
        raise HTTPException(status_code=500, detail={
            "error": "Error operacional de base de datos",
            "message": str(oe)
        })
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"❌ Error general: {error_details}")
        raise HTTPException(status_code=500, detail={
            "error": "Error actualizando plan quirúrgico",
            "message": str(e),
            "details": error_details
        })

# Coloca esto ANTES del endpoint de descarga
@app.get("/api/test-file-existence")
def test_file_existence():
    """
    Test para verificar si los archivos existen realmente
    """
    import os
    
    # Lista de archivos que podrían existir
    posibles_archivos = [
        "esquemas-corporales.pdf",
        "esquemas-corporales.png",
        "example.pdf",
        "test.jpg"
    ]
    
    upload_dir = os.path.join(os.path.dirname(__file__), "uploads")
    
    results = []
    for archivo in posibles_archivos:
        file_path = os.path.join(upload_dir, archivo)
        exists = os.path.exists(file_path)
        results.append({
            "archivo": archivo,
            "existe": exists,
            "ruta": file_path,
            "ruta_absoluta": os.path.abspath(file_path) if exists else None
        })
    
    # Listar contenido de uploads
    contenido = []
    if os.path.exists(upload_dir):
        contenido = os.listdir(upload_dir)
    
    return {
        "directorio_actual": os.getcwd(),
        "directorio_script": os.path.dirname(__file__),
        "upload_dir": upload_dir,
        "upload_dir_exists": os.path.exists(upload_dir),
        "resultados": results,
        "contenido_uploads": contenido
    }

# ====================== ENDPOINT DE DESCARGA DE ARCHIVOS ======================

@app.post("/api/planes-quirurgicos/{plan_id}/descargar-archivo")
async def descargar_archivo_plan(plan_id: int, data: dict):
    """
    Descarga un archivo adjunto de un plan quirúrgico
    """
    try:
        nombre_archivo = data.get("nombreArchivo")
        
        if not nombre_archivo:
            raise HTTPException(status_code=400, detail="Nombre de archivo requerido")
        
        print(f"📥 Solicitando descarga del archivo: {nombre_archivo}, para plan: {plan_id}")
        
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='root',
            database='u997398721_consultorio_db',
            port=3306,
            cursorclass=pymysql.cursors.DictCursor
        )
        
        with conn:
            with conn.cursor() as cursor:
                # Buscar el plan en la base de datos
                cursor.execute("""
                    SELECT id, imagen_procedimiento, nombre_completo 
                    FROM plan_quirurgico 
                    WHERE id = %s
                """, (plan_id,))
                
                plan = cursor.fetchone()
                
                if not plan:
                    raise HTTPException(status_code=404, detail="Plan no encontrado")
                
                # Verificar que el plan tiene archivos adjuntos
                if not plan['imagen_procedimiento']:
                    raise HTTPException(status_code=404, detail="El plan no tiene archivos adjuntos")
                
                print(f"🔍 Plan encontrado: {plan['nombre_completo']}")
                print(f"📁 Campo imagen_procedimiento: {plan['imagen_procedimiento']}")
                
                # Parsear el JSON de imagen_procedimiento
                try:
                    # Intentar parsear como JSON
                    archivos_adjuntos = json.loads(plan['imagen_procedimiento'])
                    if not isinstance(archivos_adjuntos, list):
                        archivos_adjuntos = [archivos_adjuntos]
                except json.JSONDecodeError:
                    # Si no es JSON válido, tratar como string simple
                    print("⚠️ No es JSON válido, tratando como string")
                    archivos_adjuntos = [plan['imagen_procedimiento']]
                except Exception as e:
                    print(f"⚠️ Error parseando JSON: {e}")
                    archivos_adjuntos = [plan['imagen_procedimiento']]
                
                print(f"📋 Archivos adjuntos parseados: {archivos_adjuntos}")
                
                # Verificar que el archivo solicitado esté en la lista
                if nombre_archivo not in archivos_adjuntos:
                    raise HTTPException(
                        status_code=404, 
                        detail=f"El archivo '{nombre_archivo}' no se encuentra en los archivos adjuntos del plan. Archivos disponibles: {', '.join(archivos_adjuntos)}"
                    )
                
                # ========== IMPORTANTE: SI EL ARCHIVO NO EXISTE FÍSICAMENTE ==========
                # Opción 1: Intentar buscar el archivo físicamente
                file_path = os.path.join(UPLOAD_DIR, nombre_archivo)
                
                if os.path.exists(file_path):
                    # El archivo existe físicamente, proceder normalmente
                    print(f"✅ Archivo encontrado físicamente en: {file_path}")
                    file_size = os.path.getsize(file_path)
                    
                    # Leer el archivo
                    with open(file_path, "rb") as file:
                        file_content = file.read()
                else:
                    # El archivo NO existe físicamente
                    print(f"⚠️ Archivo NO encontrado físicamente. Creando archivo simulado...")
                    
                    # Opción 2: Crear un archivo simulado basado en la extensión
                    extension = os.path.splitext(nombre_archivo)[1].lower()
                    
                    if extension == '.pdf':
                        # Crear un PDF simple
                        from reportlab.pdfgen import canvas
                        from io import BytesIO
                        
                        buffer = BytesIO()
                        c = canvas.Canvas(buffer)
                        c.drawString(100, 750, f"Plan Quirúrgico: {plan['nombre_completo']}")
                        c.drawString(100, 730, f"Archivo: {nombre_archivo}")
                        c.drawString(100, 710, f"ID Plan: {plan_id}")
                        c.drawString(100, 690, f"Fecha: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
                        c.drawString(100, 670, "Nota: Este es un archivo simulado")
                        c.drawString(100, 650, "Los archivos reales no se encontraron en el servidor")
                        c.showPage()
                        c.save()
                        
                        file_content = buffer.getvalue()
                        file_size = len(file_content)
                        
                    elif extension in ['.jpg', '.jpeg', '.png', '.gif']:
                        # Crear una imagen simple (blanco con texto)
                        from PIL import Image, ImageDraw, ImageFont
                        import io
                        
                        # Crear imagen 800x600
                        img = Image.new('RGB', (800, 600), color='white')
                        d = ImageDraw.Draw(img)
                        
                        # Usar fuente por defecto o truetype si está disponible
                        try:
                            font = ImageFont.truetype("arial.ttf", 20)
                        except:
                            font = ImageFont.load_default()
                        
                        d.text((50, 50), f"Plan Quirúrgico: {plan['nombre_completo']}", fill='black', font=font)
                        d.text((50, 80), f"Archivo: {nombre_archivo}", fill='black', font=font)
                        d.text((50, 110), f"ID Plan: {plan_id}", fill='black', font=font)
                        d.text((50, 140), f"Fecha: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", fill='black', font=font)
                        d.text((50, 170), "Nota: Esta es una imagen simulada", fill='black', font=font)
                        d.text((50, 200), "Los archivos reales no se encontraron en el servidor", fill='black', font=font)
                        
                        # Guardar en buffer
                        buffer = io.BytesIO()
                        
                        if extension == '.png':
                            img.save(buffer, format='PNG')
                        elif extension in ['.jpg', '.jpeg']:
                            img.save(buffer, format='JPEG')
                        elif extension == '.gif':
                            img.save(buffer, format='GIF')
                        
                        file_content = buffer.getvalue()
                        file_size = len(file_content)
                        
                    else:
                        # Para otros tipos de archivo, crear un archivo de texto
                        contenido_texto = f"""Plan Quirúrgico: {plan['nombre_completo']}
Archivo: {nombre_archivo}
ID Plan: {plan_id}
Fecha: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
Nota: Este es un archivo simulado
Los archivos reales no se encontraron en el servidor

Este archivo fue solicitado pero no existe físicamente en el servidor.
Los nombres de archivo están almacenados en la base de datos como referencias.
"""
                        
                        file_content = contenido_texto.encode('utf-8')
                        file_size = len(file_content)
                
                # Obtener la extensión para determinar el tipo MIME
                file_extension = os.path.splitext(nombre_archivo)[1].lower()
                
                # Mapear extensiones comunes a tipos MIME
                mime_types = {
                    '.jpg': 'image/jpeg',
                    '.jpeg': 'image/jpeg',
                    '.png': 'image/png',
                    '.gif': 'image/gif',
                    '.pdf': 'application/pdf',
                    '.doc': 'application/msword',
                    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                    '.xls': 'application/vnd.ms-excel',
                    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    '.txt': 'text/plain',
                    '.csv': 'text/csv',
                }
                
                media_type = mime_types.get(file_extension, 'application/octet-stream')
                print(f"📄 Tipo MIME: {media_type}, Tamaño: {file_size} bytes")
                
                # Crear respuesta con el archivo
                from fastapi.responses import Response
                
                return Response(
                    content=file_content,
                    media_type=media_type,
                    headers={
                        "Content-Disposition": f"attachment; filename=\"{nombre_archivo}\"",
                        "Content-Length": str(file_size),
                        "Cache-Control": "private, max-age=0, must-revalidate"
                    }
                )
                
    except HTTPException:
        raise
    except ImportError as ie:
        # Si faltan dependencias para crear archivos simulados
        print(f"⚠️ Error de importación: {ie}")
        
        # Crear un archivo de texto simple como fallback
        contenido = f"Error: No se pudo generar el archivo. Dependencias faltantes: {ie}"
        
        from fastapi.responses import Response
        return Response(
            content=contenido.encode('utf-8'),
            media_type='text/plain',
            headers={
                "Content-Disposition": f"attachment; filename=\"error.txt\"",
                "Content-Length": str(len(contenido))
            }
        )
        
    except Exception as e:
        import traceback
        print(f"❌ Error descargando archivo: {str(e)}")
        traceback.print_exc()
        raise HTTPException(
            status_code=500, 
            detail=f"Error interno del servidor: {str(e)}"
        )

@app.delete("/api/planes-quirurgicos/{plan_id}", response_model=dict)
def delete_plan_quirurgico(plan_id: str):
    """
    Elimina un plan quirúrgico
    """
    try:
        # Extraer ID numérico
        plan_id_num = plan_id.replace('plan_', '')
        
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='root',
            database='u997398721_consultorio_db',
            port=3306,
            cursorclass=pymysql.cursors.DictCursor
        )
        with conn:
            with conn.cursor() as cursor:
                # Verificar que el plan existe
                cursor.execute("SELECT id, nombre_completo FROM plan_quirurgico WHERE id = %s", (plan_id_num,))
                plan = cursor.fetchone()
                if not plan:
                    raise HTTPException(status_code=404, detail="Plan quirúrgico no encontrado")
                
                # Eliminar el plan
                cursor.execute("DELETE FROM plan_quirurgico WHERE id = %s", (plan_id_num,))
                conn.commit()
                
                return {
                    "success": True,
                    "message": "Plan quirúrgico eliminado exitosamente",
                    "plan_id": plan_id,
                    "plan_nombre": plan['nombre_completo']
                }
                
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail={
            "error": "Error eliminando plan quirúrgico",
            "message": str(e)
        })

@app.get("/api/pacientes/buscar", response_model=dict)
def buscar_pacientes(
    q: str = Query("", description="Texto para buscar por nombre, apellido o documento"),
    limit: int = Query(10, description="Límite de resultados")
):
    """
    Busca pacientes para autocompletar en formularios
    """
    try:
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='root',
            database='u997398721_consultorio_db',
            port=3306,
            cursorclass=pymysql.cursors.DictCursor
        )
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
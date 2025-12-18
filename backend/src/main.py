from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import pymysql
import os
import shutil
from datetime import datetime, time
from pydantic import BaseModel
from typing import Optional, Dict, List

# Configurar directorio para archivos subidos
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(os.path.join(UPLOAD_DIR, "historias"), exist_ok=True)

# Configuración básica
FRONTEND_URL = "http://localhost:3000"
BACKEND_URL = "http://localhost:8000"
PROJECT_NAME = "Consultorio Dr. Ignacio Córdoba"
VERSION = "1.0.0"
API_V1_STR = "/api"

# PRIMERO definir la aplicación
app = FastAPI(
    title=PROJECT_NAME,
    version=VERSION,
    openapi_url=f"{API_V1_STR}/openapi.json"
)

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Montar directorio de archivos estáticos
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# ========================================
# INTENTAR IMPORTAR RUTAS
# ========================================
try:
    # Intenta importar desde la estructura app/...
    from app.api.routes import procedimiento, adicional, otro_adicional
    
    # Incluir las rutas
    app.include_router(procedimiento.router, prefix=API_V1_STR, tags=["procedimientos"])
    app.include_router(adicional.router, prefix=API_V1_STR, tags=["adicionales"])
    app.include_router(otro_adicional.router, prefix=API_V1_STR, tags=["otros_adicionales"])
    print("✅ Módulos de rutas cargados correctamente")
    
except ImportError as e:
    print(f"⚠️ Advertencia: No se pudieron cargar módulos específicos: {e}")
    print("✅ Continuando con endpoints básicos...")

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
# MODELOS PYDANTIC PARA PROCEDIMIENTOS Y ADICIONALES
# ========================================

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
# MODELOS PYDANTIC PARA SALA DE ESPERA
# ========================================

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
    cambios: Dict[str, str]  # paciente_id -> estado_nombre


# ========================================
# MODELOS PYDANTIC PARA COTIZACIONES - CORREGIDOS
# ========================================

class CotizacionItemBase(BaseModel):
    tipo: str  # 'procedimiento', 'adicional', 'otro_adicional'
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
    estado_id: int = 1  # pendiente por defecto
    items: List[CotizacionItemBase] = []
    servicios_incluidos: List[CotizacionServicioIncluido] = []
    subtotal_procedimientos: float = 0
    subtotal_adicionales: float = 0
    subtotal_otros_adicionales: float = 0
    # **CAMBIAR: total ya NO es requerido, es opcional**
    total: Optional[float] = None  # La BD lo calcula automáticamente
    validez_dias: int = 7
    observaciones: Optional[str] = None
    fecha_vencimiento: Optional[str] = None

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
    # **CAMBIAR: total ya NO es requerido en actualización**
    total: Optional[float] = None  # La BD lo calcula automáticamente
    validez_dias: Optional[int] = None
    observaciones: Optional[str] = None
    fecha_vencimiento: Optional[str] = None

# ========================================
# ENDPOINTS PARA COTIZACIONES
# ========================================

@app.get("/api/cotizaciones", response_model=dict)
def get_cotizaciones(limit: int = 50, offset: int = 0):
    """Obtener todas las cotizaciones con sus detalles"""
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
                # Obtener cotizaciones
                cursor.execute("""
                    SELECT 
                        c.id,
                        c.paciente_id,
                        c.usuario_id,
                        c.plan_id,
                        c.estado_id,
                        ec.nombre as estado_nombre,
                        c.total,  # **Este es el total calculado por MySQL**
                        c.subtotal_procedimientos,
                        c.subtotal_adicionales,
                        c.subtotal_otros_adicionales,
                        c.validez_dias,
                        c.observaciones,
                        DATE(c.fecha_creacion) as fecha_creacion,
                        DATE(c.fecha_vencimiento) as fecha_vencimiento,
                        p.nombre as paciente_nombre,
                        p.apellido as paciente_apellido,
                        p.numero_documento as paciente_documento,
                        u.nombre as usuario_nombre
                    FROM cotizacion c
                    JOIN paciente p ON c.paciente_id = p.id
                    JOIN usuario u ON c.usuario_id = u.id
                    JOIN estado_cotizacion ec ON c.estado_id = ec.id
                    ORDER BY c.fecha_creacion DESC
                    LIMIT %s OFFSET %s
                """, (limit, offset))
                cotizaciones = cursor.fetchall()
                
                # Para cada cotización, obtener sus ítems y servicios incluidos
                for cotizacion in cotizaciones:
                    # Obtener ítems
                    cursor.execute("""
                        SELECT 
                            id,
                            tipo,
                            item_id,
                            nombre,
                            descripcion,
                            cantidad,
                            precio_unitario,
                            subtotal
                        FROM cotizacion_item
                        WHERE cotizacion_id = %s
                        ORDER BY tipo, nombre
                    """, (cotizacion['id'],))
                    cotizacion['items'] = cursor.fetchall()
                    
                    # Obtener servicios incluidos
                    cursor.execute("""
                        SELECT 
                            id,
                            servicio_nombre,
                            requiere
                        FROM cotizacion_servicio_incluido
                        WHERE cotizacion_id = %s
                    """, (cotizacion['id'],))
                    cotizacion['servicios_incluidos'] = cursor.fetchall()
                
                # Obtener total de cotizaciones
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
    """Obtener una cotización específica por ID"""
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
                    SELECT 
                        c.*,
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
                
                # Obtener ítems
                cursor.execute("""
                    SELECT 
                        id,
                        tipo,
                        item_id,
                        nombre,
                        descripcion,
                        cantidad,
                        precio_unitario,
                        subtotal
                    FROM cotizacion_item
                    WHERE cotizacion_id = %s
                    ORDER BY tipo, nombre
                """, (cotizacion_id,))
                cotizacion['items'] = cursor.fetchall()
                
                # Obtener servicios incluidos
                cursor.execute("""
                    SELECT 
                        id,
                        servicio_nombre,
                        requiere
                    FROM cotizacion_servicio_incluido
                    WHERE cotizacion_id = %s
                """, (cotizacion_id,))
                cotizacion['servicios_incluidos'] = cursor.fetchall()
                
                return cotizacion
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"❌ Error obteniendo cotización {cotizacion_id}: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail={
            "error": "Error obteniendo cotización",
            "message": str(e)
        })
    
@app.post("/api/cotizaciones", response_model=dict)
def create_cotizacion(cotizacion: CotizacionCreate):
    """Crear una nueva cotización - VERSIÓN CORREGIDA"""
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
                # **CRÍTICO: Eliminar el campo 'total' si viene en el request**
                # Convertir el modelo a dict y eliminar 'total'
                cotizacion_dict = cotizacion.dict()
                cotizacion_dict.pop('total', None)  # Elimina 'total' si existe
                
                # Verificar que el paciente existe - CORREGIDO
                cursor.execute("SELECT id, nombre, apellido FROM paciente WHERE id = %s", (cotizacion.paciente_id,))
                resultado_paciente = cursor.fetchone()
                if not resultado_paciente:
                    raise HTTPException(status_code=404, detail="Paciente no encontrado")
                
                # Acceder correctamente como diccionario
                paciente_nombre = resultado_paciente['nombre']
                paciente_apellido = resultado_paciente['apellido']
                
                # Verificar que el usuario existe
                cursor.execute("SELECT id, nombre FROM usuario WHERE id = %s", (cotizacion.usuario_id,))
                resultado_usuario = cursor.fetchone()
                if not resultado_usuario:
                    raise HTTPException(status_code=404, detail="Usuario no encontrado")
                
                # Acceder correctamente como diccionario
                usuario_nombre = resultado_usuario['nombre']
                
                # Verificar que el estado existe
                cursor.execute("SELECT id FROM estado_cotizacion WHERE id = %s", (cotizacion.estado_id,))
                estado = cursor.fetchone()
                if not estado:
                    raise HTTPException(status_code=404, detail="Estado no encontrado")
                
                # Calcular fecha de vencimiento si no se proporciona
                fecha_vencimiento = cotizacion.fecha_vencimiento
                if not fecha_vencimiento and cotizacion.validez_dias:
                    from datetime import datetime, timedelta
                    fecha_vencimiento = (datetime.now() + timedelta(days=cotizacion.validez_dias)).strftime('%Y-%m-%d')
                
                # **CORRECIÓN: Insertar sin el campo 'total'**
                cursor.execute("""
                    INSERT INTO cotizacion (
                        paciente_id, usuario_id, plan_id, estado_id,
                        subtotal_procedimientos, subtotal_adicionales,
                        subtotal_otros_adicionales, validez_dias, observaciones,
                        fecha_vencimiento
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    cotizacion.paciente_id,
                    cotizacion.usuario_id,
                    cotizacion.plan_id,
                    cotizacion.estado_id,
                    cotizacion.subtotal_procedimientos,
                    cotizacion.subtotal_adicionales,
                    cotizacion.subtotal_otros_adicionales,
                    cotizacion.validez_dias,
                    cotizacion.observaciones or "",
                    fecha_vencimiento
                ))
                
                cotizacion_id = cursor.lastrowid
                
                # Insertar ítems
                for item in cotizacion.items:
                    cursor.execute("""
                        INSERT INTO cotizacion_item (
                            cotizacion_id, tipo, item_id, nombre,
                            descripcion, cantidad, precio_unitario, subtotal
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    """, (
                        cotizacion_id,
                        item.tipo,
                        item.item_id,
                        item.nombre,
                        item.descripcion or "",
                        item.cantidad,
                        item.precio_unitario,
                        item.subtotal
                    ))
                
                # Insertar servicios incluidos
                servicios_a_insertar = cotizacion.servicios_incluidos if cotizacion.servicios_incluidos else []
                if not servicios_a_insertar:
                    servicios_base = [
                        "CIRUJANO PLASTICO, AYUDANTE Y PERSONAL CLINICO",
                        "ANESTESIOLOGO",
                        "CONTROLES CON MEDICO Y ENFERMERA",
                        "VALORACION CON ANESTESIOLOGO",
                        "HEMOGRAMA DE CONTROL",
                        "UNA NOCHE DE HOSPITALIZACION CON UN ACOMPAÑANTES",
                        "IMPLANTES"
                    ]
                    for servicio_nombre in servicios_base:
                        cursor.execute("""
                            INSERT INTO cotizacion_servicio_incluido (
                                cotizacion_id, servicio_nombre, requiere
                            ) VALUES (%s, %s, %s)
                        """, (cotizacion_id, servicio_nombre, 0))
                else:
                    for servicio in servicios_a_insertar:
                        cursor.execute("""
                            INSERT INTO cotizacion_servicio_incluido (
                                cotizacion_id, servicio_nombre, requiere
                            ) VALUES (%s, %s, %s)
                        """, (
                            cotizacion_id,
                            servicio.servicio_nombre,
                            1 if servicio.requiere else 0
                        ))
                
                conn.commit()
                
                # **OBTENER la cotización recién creada con el total calculado por MySQL**
                cursor.execute("SELECT * FROM cotizacion WHERE id = %s", (cotizacion_id,))
                cotizacion_creada = cursor.fetchone()
                
                return {
                    "success": True,
                    "message": "Cotización creada exitosamente",
                    "cotizacion_id": cotizacion_id,
                    "paciente_nombre": f"{paciente_nombre} {paciente_apellido}",
                    "usuario_nombre": usuario_nombre,
                    "total": float(cotizacion_creada['total']) if cotizacion_creada and cotizacion_creada['total'] else 0.00
                }
                
    except HTTPException:
        raise
    except Exception as e:
        # **CORRECCIÓN CRÍTICA: Manejo de errores apropiado**
        import traceback
        error_details = traceback.format_exc()
        print(f"❌ Error creando cotización: {error_details}")
        raise HTTPException(status_code=500, detail={
            "error": "Error creando cotización",
            "message": str(e),
            "type": type(e).__name__
        })
        
@app.delete("/api/cotizaciones/{cotizacion_id}", response_model=dict)
def delete_cotizacion(cotizacion_id: int):
    """Eliminar una cotización y sus registros relacionados"""
    try:
        print(f"🗑️ Eliminando cotización {cotizacion_id}")
        
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
                cursor.execute("SELECT id FROM cotizacion WHERE id = %s", (cotizacion_id,))
                cotizacion_existente = cursor.fetchone()
                if not cotizacion_existente:
                    raise HTTPException(status_code=404, detail="Cotización no encontrada")
                
                # Eliminar en cascada (primero los detalles, luego la cotización)
                cursor.execute("DELETE FROM cotizacion_item WHERE cotizacion_id = %s", (cotizacion_id,))
                cursor.execute("DELETE FROM cotizacion_servicio_incluido WHERE cotizacion_id = %s", (cotizacion_id,))
                cursor.execute("DELETE FROM cotizacion WHERE id = %s", (cotizacion_id,))
                
                conn.commit()
                
                return {
                    "success": True,
                    "message": "Cotización eliminada exitosamente",
                    "cotizacion_id": cotizacion_id
                }
                
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error eliminando cotización: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail={
            "error": "Error eliminando cotización",
            "message": str(e),
            "type": type(e).__name__
        })
    
# ========================================
# ENDPOINTS DE UTILIDAD PARA COTIZACIONES
# ========================================

@app.get("/api/estados/cotizaciones")
def get_estados_cotizaciones():
    """Obtener todos los estados de cotización"""
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
                cursor.execute("SELECT * FROM estado_cotizacion ORDER BY orden")
                estados = cursor.fetchall()
                return {"estados": estados}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail={
            "error": "Error obteniendo estados de cotización",
            "message": str(e)
        })

@app.get("/api/cotizaciones/plantilla-servicios")
def get_plantilla_servicios():
    """Obtener la plantilla base de servicios incluidos"""
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

# ========================================
# ENDPOINTS BÁSICOS
# ========================================

@app.get("/")
def root():
    return {"message": "API del Consultorio Dr. Ignacio Córdoba", "version": VERSION}

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
                paciente_nombre = ""
                paciente_apellido = ""
                
                if isinstance(resultado, dict):
                    paciente_nombre = resultado['nombre']
                    paciente_apellido = resultado['apellido']
                else:
                    paciente_nombre = resultado[1]  # índice 1 = nombre
                    paciente_apellido = resultado[2]  # índice 2 = apellido
                
                print(f"✅ Paciente encontrado: {paciente_nombre} {paciente_apellido}")
                
                # Verificar que el usuario existe
                cursor.execute("SELECT id, nombre FROM Usuario WHERE id = %s", (cita.usuario_id,))
                resultado_usuario = cursor.fetchone()
                if not resultado_usuario:
                    print(f"❌ ERROR: Usuario ID {cita.usuario_id} no encontrado")
                    raise HTTPException(status_code=404, detail=f"Usuario con ID {cita.usuario_id} no encontrado")
                
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
                    AND estado_id != 4
                """, (cita.usuario_id, fecha_hora_limpia))
                
                if cursor.fetchone():
                    print(f"⚠️ ADVERTENCIA: Ya existe una cita programada para este doctor a las {fecha_hora_limpia}")
                
                # Insertar la cita
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
# ENDPOINTS PARA PROCEDIMIENTOS (CORREGIDOS - SIN COLUMNAS ACTIVO O INCLUIDO)
# ========================================

@app.get("/api/procedimientos", response_model=dict)
def get_procedimientos():
    """Obtener todos los procedimientos - VERSIÓN CORREGIDA"""
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
                # CONSULTA CORREGIDA: Solo obtener columnas existentes
                cursor.execute("""
                    SELECT 
                        id,
                        nombre,
                        precio,
                        fecha_creacion as created_at
                    FROM procedimiento
                    ORDER BY nombre
                """)
                procedimientos = cursor.fetchall()
                return {"procedimientos": procedimientos}
    except Exception as e:
        error_msg = str(e)
        if "procedimiento" in error_msg.lower():
            return {"procedimientos": []}
        raise HTTPException(status_code=500, detail=error_msg)

@app.get("/api/procedimientos/{procedimiento_id}", response_model=dict)
def get_procedimiento(procedimiento_id: int):
    """Obtener un procedimiento específico por ID - VERSIÓN CORREGIDA"""
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
                # CONSULTA CORREGIDA: Solo columnas existentes
                cursor.execute("""
                    SELECT 
                        id,
                        nombre,
                        precio,
                        fecha_creacion as created_at
                    FROM procedimiento
                    WHERE id = %s
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
    """Crear un nuevo procedimiento"""
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
                    INSERT INTO procedimiento (nombre, precio)
                    VALUES (%s, %s)
                """, (
                    procedimiento.nombre,
                    procedimiento.precio
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
    """Actualizar un procedimiento existente"""
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
                cursor.execute("SELECT id FROM procedimiento WHERE id = %s", (procedimiento_id,))
                if not cursor.fetchone():
                    raise HTTPException(status_code=404, detail="Procedimiento no encontrado")
                
                update_fields = []
                values = []
                
                if procedimiento.nombre is not None:
                    update_fields.append("nombre = %s")
                    values.append(procedimiento.nombre)
                
                if procedimiento.precio is not None:
                    update_fields.append("precio = %s")
                    values.append(procedimiento.precio)
                
                if not update_fields:
                    raise HTTPException(status_code=400, detail="No se proporcionaron datos para actualizar")
                
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
    """Eliminar un procedimiento"""
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
                cursor.execute("SELECT id FROM procedimiento WHERE id = %s", (procedimiento_id,))
                if not cursor.fetchone():
                    raise HTTPException(status_code=404, detail="Procedimiento no encontrado")
                
                cursor.execute("DELETE FROM procedimiento WHERE id = %s", (procedimiento_id,))
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

# ========================================
# ENDPOINTS PARA ADICIONALES (CORREGIDOS - SIN COLUMNAS INCLUIDO O ACTIVO)
# ========================================

@app.get("/api/adicionales", response_model=dict)
def get_adicionales():
    """Obtener todos los adicionales"""
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
                    SELECT 
                        id,
                        nombre,
                        precio,
                        fecha_creacion as created_at
                    FROM adicional
                    ORDER BY nombre
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
    """Obtener un adicional específico por ID"""
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
                    SELECT 
                        id,
                        nombre,
                        precio,
                        fecha_creacion as created_at
                    FROM adicional
                    WHERE id = %s
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
    """Crear un nuevo adicional"""
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
                    INSERT INTO adicional (nombre, precio)
                    VALUES (%s, %s)
                """, (
                    adicional.nombre,
                    adicional.precio
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
    """Actualizar un adicional existente"""
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
                cursor.execute("SELECT id FROM adicional WHERE id = %s", (adicional_id,))
                if not cursor.fetchone():
                    raise HTTPException(status_code=404, detail="Adicional no encontrado")
                
                update_fields = []
                values = []
                
                if adicional.nombre is not None:
                    update_fields.append("nombre = %s")
                    values.append(adicional.nombre)
                
                if adicional.precio is not None:
                    update_fields.append("precio = %s")
                    values.append(adicional.precio)
                
                if not update_fields:
                    raise HTTPException(status_code=400, detail="No se proporcionaron datos para actualizar")
                
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
    """Eliminar un adicional"""
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
                cursor.execute("SELECT id FROM adicional WHERE id = %s", (adicional_id,))
                if not cursor.fetchone():
                    raise HTTPException(status_code=404, detail="Adicional no encontrado")
                
                cursor.execute("DELETE FROM adicional WHERE id = %s", (adicional_id,))
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

# ========================================
# ENDPOINTS PARA OTROS ADICIONALES (CORREGIDOS - SIN COLUMNAS INCLUIDO O ACTIVO)
# ========================================

@app.get("/api/otros-adicionales", response_model=dict)
def get_otros_adicionales():
    """Obtener todos los otros adicionales"""
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
                    SELECT 
                        id,
                        nombre,
                        precio,
                        fecha_creacion as created_at
                    FROM otro_adicional
                    ORDER BY nombre
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
    """Obtener un otro adicional específico por ID"""
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
                    SELECT 
                        id,
                        nombre,
                        precio,
                        fecha_creacion as created_at
                    FROM otro_adicional
                    WHERE id = %s
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
    """Crear un nuevo otro adicional"""
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
                    INSERT INTO otro_adicional (nombre, precio)
                    VALUES (%s, %s)
                """, (
                    otro_adicional.nombre,
                    otro_adicional.precio
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
    """Actualizar un otro adicional existente"""
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
                cursor.execute("SELECT id FROM otro_adicional WHERE id = %s", (otro_adicional_id,))
                if not cursor.fetchone():
                    raise HTTPException(status_code=404, detail="Otro adicional no encontrado")
                
                update_fields = []
                values = []
                
                if otro_adicional.nombre is not None:
                    update_fields.append("nombre = %s")
                    values.append(otro_adicional.nombre)
                
                if otro_adicional.precio is not None:
                    update_fields.append("precio = %s")
                    values.append(otro_adicional.precio)
                
                if not update_fields:
                    raise HTTPException(status_code=400, detail="No se proporcionaron datos para actualizar")
                
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
    """Eliminar un otro adicional"""
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
                cursor.execute("SELECT id FROM otro_adicional WHERE id = %s", (otro_adicional_id,))
                if not cursor.fetchone():
                    raise HTTPException(status_code=404, detail="Otro adicional no encontrado")
                
                cursor.execute("DELETE FROM otro_adicional WHERE id = %s", (otro_adicional_id,))
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
                    "message": "Historia clínica creada exitosamente",
                    "historia_id": historia_id,
                    "id": historia_id
                }
    except HTTPException:
        raise
    except Exception as e:
        if "Table 'prueba_consultorio_db.historial_clinico' doesn't exist" in str(e):
            raise HTTPException(status_code=500, detail="Tabla de historias clínicas no existe.")
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
                cursor.execute("SELECT id FROM historial_clinico WHERE id = %s", (historia_id,))
                if not cursor.fetchone():
                    raise HTTPException(status_code=404, detail="Historia clínica no encontrada")
                
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
                    "message": "Historia clínica actualizada exitosamente",
                    "historia_id": historia_id
                }
    except HTTPException:
        raise
    except Exception as e:
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
                cursor.execute("SELECT id FROM historial_clinico WHERE id = %s", (historia_id,))
                if not cursor.fetchone():
                    raise HTTPException(status_code=404, detail="Historia clínica no encontrada")
                
                cursor.execute("DELETE FROM historial_clinico WHERE id = %s", (historia_id,))
                conn.commit()
                
                return MessageResponse(message="Historia clínica eliminada exitosamente")
                
    except HTTPException:
        raise
    except Exception as e:
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
        max_size = 10 * 1024 * 1024
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
        await file.seek(0)
        with open(file_path, "wb") as buffer:
            while True:
                chunk = await file.read(8192)
                if not chunk:
                    break
                buffer.write(chunk)
        
        print(f"✅ Archivo guardado correctamente: {file_path}")
        
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
                cursor.execute("SELECT fotos FROM historial_clinico WHERE id = %s", (historia_id,))
                resultado = cursor.fetchone()
                fotos_actuales = ""
                if resultado and resultado[0]:
                    fotos_actuales = resultado[0]
                    print(f"📸 Fotos actuales en BD: {fotos_actuales}")
                else:
                    print(f"📸 No hay fotos previas en BD")
                
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
# ENDPOINTS DE SALA DE ESPERA (CORREGIDOS)
# ========================================

@app.get("/api/sala-espera")
def get_sala_espera(mostrarTodos: bool = True):
    """Obtener pacientes en sala de espera"""
    try:
        print(f"📥 GET /api/sala-espera llamado con mostrarTodos={mostrarTodos}")
        
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
                hoy = datetime.now().strftime('%Y-%m-%d')
                print(f"📅 Fecha actual: {hoy}")
                
                # Primero, verificar que la tabla estado_sala_espera existe y tiene datos
                try:
                    cursor.execute("SELECT COUNT(*) as count FROM estado_sala_espera")
                    count_estados = cursor.fetchone()['count']
                    print(f"📊 Estados disponibles: {count_estados}")
                    
                    if count_estados == 0:
                        print("⚠️ La tabla estado_sala_espera está vacía. Insertando estados por defecto...")
                        estados = [
                            ('pendiente', 'Paciente pendiente de atención', '#9CA3AF', 1),
                            ('llegada', 'Paciente ha llegado', '#FBBF24', 2),
                            ('confirmada', 'Cita confirmada', '#10B981', 3),
                            ('en_consulta', 'Paciente en consulta', '#3B82F6', 4),
                            ('completada', 'Consulta completada', '#8B5CF6', 5),
                            ('no_asistio', 'Paciente no asistió', '#EF4444', 6)
                        ]
                        
                        for estado in estados:
                            cursor.execute("""
                                INSERT IGNORE INTO estado_sala_espera (nombre, descripcion, color, orden)
                                VALUES (%s, %s, %s, %s)
                            """, estado)
                        
                        conn.commit()
                        print(f"✅ {len(estados)} estados insertados")
                except Exception as e:
                    print(f"❌ Error verificando estados: {str(e)}")
                
                # Consulta base para obtener pacientes
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
                    print(f"🔍 Ejecutando query para TODOS los pacientes")
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
                    print(f"🔍 Ejecutando query para pacientes CON CITA HOY")
                
                cursor.execute(query, params)
                pacientes = cursor.fetchall()
                print(f"📊 Pacientes obtenidos: {len(pacientes)}")
                
                # Si el paciente no tiene registro en sala_espera, crear uno por defecto
                pacientes_actualizados = 0
                for paciente in pacientes:
                    if not paciente['sala_espera_id']:
                        print(f"⚠️ Paciente {paciente['id']} ({paciente['nombre']} {paciente['apellido']}) no tiene registro en sala_espera")
                        
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
                            print(f"✅ Registro creado para paciente {paciente['id']}")
                
                if pacientes_actualizados > 0:
                    conn.commit()
                    print(f"✅ {pacientes_actualizados} registros de sala_espera creados")
                    
                    cursor.execute(query, params)
                    pacientes = cursor.fetchall()
                    print(f"📊 Pacientes después de actualizar: {len(pacientes)}")
                
                # Formatear respuesta
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
        print(f"❌ Error obteniendo sala de espera: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error obteniendo sala de espera: {str(e)}")

@app.post("/api/sala-espera", response_model=dict)
def crear_registro_sala_espera(registro: SalaEsperaCreate):
    """Crear un nuevo registro en sala de espera"""
    try:
        print(f"📝 Creando registro sala espera para paciente {registro.paciente_id}")
        
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
                cursor.execute("SELECT id, nombre, apellido FROM paciente WHERE id = %s", (registro.paciente_id,))
                paciente = cursor.fetchone()
                if not paciente:
                    print(f"❌ Paciente {registro.paciente_id} no encontrado")
                    raise HTTPException(status_code=404, detail="Paciente no encontrado")
                
                print(f"✅ Paciente encontrado: {paciente['nombre']} {paciente['apellido']}")
                
                cursor.execute("SELECT id FROM estado_sala_espera WHERE nombre = 'pendiente'")
                estado = cursor.fetchone()
                if not estado:
                    print(f"❌ Estado 'pendiente' no encontrado")
                    cursor.execute("""
                        INSERT INTO estado_sala_espera (nombre, descripcion, color, orden)
                        VALUES ('pendiente', 'Paciente pendiente de atención', '#9CA3AF', 1)
                    """)
                    estado_id = cursor.lastrowid
                    print(f"✅ Estado 'pendiente' creado con ID {estado_id}")
                    estado = {'id': estado_id}
                
                hoy = datetime.now().strftime('%Y-%m-%d')
                cursor.execute("""
                    SELECT id FROM sala_espera 
                    WHERE paciente_id = %s AND DATE(fecha_hora_ingreso) = %s
                """, (registro.paciente_id, hoy))
                
                registro_existente = cursor.fetchone()
                
                if registro_existente:
                    print(f"⚠️ El paciente ya está registrado en sala de espera hoy (ID: {registro_existente['id']})")
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
                
                print(f"✅ Registro creado exitosamente con ID: {registro_id}")
                
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
        print(f"❌ Error creando registro sala de espera: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error creando registro: {str(e)}")

@app.put("/api/sala-espera/{paciente_id}/estado", response_model=dict)
def actualizar_estado_sala_espera(paciente_id: int, datos: SalaEsperaUpdate):
    """Actualizar estado de un paciente en sala de espera"""
    try:
        print(f"🔄 Actualizando estado para paciente {paciente_id} a '{datos.estado}'")
        
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
                cursor.execute("SELECT id, nombre, apellido FROM paciente WHERE id = %s", (paciente_id,))
                paciente = cursor.fetchone()
                if not paciente:
                    print(f"❌ Paciente {paciente_id} no encontrado")
                    raise HTTPException(status_code=404, detail="Paciente no encontrado")
                
                print(f"✅ Paciente encontrado: {paciente['nombre']} {paciente['apellido']}")
                
                cursor.execute("SELECT id FROM estado_sala_espera WHERE nombre = %s", (datos.estado,))
                estado = cursor.fetchone()
                if not estado:
                    print(f"❌ Estado '{datos.estado}' no encontrado. Creando...")
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
                    print(f"✅ Estado '{datos.estado}' creado con ID {estado_id}")
                
                hoy = datetime.now().strftime('%Y-%m-%d')
                cursor.execute("""
                    SELECT id, estado_id FROM sala_espera 
                    WHERE paciente_id = %s AND DATE(fecha_hora_ingreso) = %s
                """, (paciente_id, hoy))
                
                registro = cursor.fetchone()
                print(f"🔍 Registro encontrado para hoy: {registro}")
                
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
                        print(f"📝 Historial registrado")
                    except Exception as hist_error:
                        print(f"⚠️ No se pudo registrar en historial: {hist_error}")
                    
                    print(f"✅ Registro actualizado. Estado anterior: {estado_anterior_id}, nuevo: {estado['id']}")
                else:
                    print(f"⚠️ No hay registro para hoy. Creando nuevo...")
                    
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
                    print(f"✅ Nuevo registro creado ID: {registro_id}")
                    
                    try:
                        cursor.execute("""
                            INSERT INTO historial_sala_espera 
                            (sala_espera_id, estado_nuevo_id, fecha_hora_cambio) 
                            VALUES (%s, %s, NOW())
                        """, (registro_id, estado['id']))
                        print(f"📝 Historial registrado")
                    except Exception as hist_error:
                        print(f"⚠️ No se pudo registrar en historial: {hist_error}")
                
                conn.commit()
                print(f"✅ Cambios confirmados en la base de datos")
                
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
        print(f"❌ Error actualizando estado: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error actualizando estado: {str(e)}")

@app.put("/api/sala-espera/bulk-estados", response_model=dict)
def bulk_update_estados_sala_espera(request: BulkUpdateEstadosRequest):
    """Actualizar múltiples estados de sala de espera a la vez"""
    try:
        print(f"🔄 Bulk update de estados. Pacientes a actualizar: {len(request.cambios)}")
        print(f"📋 Cambios: {request.cambios}")
        
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
                        print(f"⚠️ Estado '{estado_nombre}' no encontrado. Creando...")
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
                        print(f"✅ Estado '{estado_nombre}' creado con ID {estado_id}")
                
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
                            
                            print(f"✅ Paciente {paciente_id}: {estado_anterior_id} -> {estado_id}")
                        else:
                            print(f"⚠️ Paciente {paciente_id} no tiene registro hoy. Creando...")
                            
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
                            
                            print(f"✅ Nuevo registro creado para paciente {paciente_id} con ID {registro_id}")
                        
                        actualizados += 1
                        
                    except Exception as e:
                        error_msg = f"Error con paciente {paciente_id}: {str(e)}"
                        errores.append(error_msg)
                        print(f"❌ {error_msg}")
                        continue
                
                conn.commit()
                print(f"✅ Bulk update completado. Actualizados: {actualizados}, Errores: {len(errores)}")
                
                return {
                    "success": True,
                    "message": f"Se actualizaron {actualizados} pacientes",
                    "actualizados": actualizados,
                    "errores": errores if errores else None,
                    "timestamp": datetime.now().isoformat()
                }
                
    except Exception as e:
        print(f"❌ Error en bulk update: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error actualizando estados: {str(e)}")

@app.get("/api/sala-espera/estadisticas")
def get_estadisticas_sala_espera():
    """Obtener estadísticas de sala de espera"""
    try:
        print(f"📊 Obteniendo estadísticas de sala de espera")
        
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
                print(f"📈 Estadísticas generales: {general_stats}")
                
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
                print(f"📈 Estadísticas por estado: {estados_stats}")
                
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
                
                print(f"📊 Estadísticas finales: {estadisticas}")
                
                return {
                    "success": True,
                    "fecha": hoy,
                    "estadisticas": estadisticas
                }
                
    except Exception as e:
        print(f"❌ Error obteniendo estadísticas: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error obteniendo estadísticas: {str(e)}")

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

@app.get("/api/debug/sala-espera")
def debug_sala_espera():
    """Diagnóstico de sala de espera"""
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
                    "tablas_disponibles": [tabla[f"Tables_in_prueba_consultorio_db (%sala%)"] for tabla in tablas_sala],
                    "registros_hoy": registros_hoy['total'],
                    "estados_disponibles": estados,
                    "ultimos_registros": ultimos_registros,
                    "estructura_sala_espera": estructura,
                    "fecha_actual": hoy
                }
    except Exception as e:
        return {"error": str(e), "tablas": []}

@app.get("/api/debug/endpoints")
def debug_endpoints():
    """Listar todos los endpoints disponibles"""
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
    """Endpoint para probar conexión con frontend"""
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
            "message": "✅ Backend funcionando correctamente",
            "frontend_url": FRONTEND_URL,
            "backend_url": BACKEND_URL,
            "database": "MySQL - prueba_consultorio_db",
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
            "message": f"❌ Error en el backend: {str(e)}",
            "timestamp": datetime.now().isoformat()
        }
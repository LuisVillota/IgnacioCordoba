from sqlalchemy import Column, String, Integer, Boolean, ForeignKey, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from .base import BaseModel

@app.post("/api/usuarios")
def create_usuario(usuario: UsuarioCreate):
    try:
        conn = pymysql.connect(
            host="localhost",
            user="root",
            password="root",
            database="prueba_consultorio_db",
            port=3306,
            cursorclass=pymysql.cursors.DictCursor,
        )

        with conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO Usuario (
                        username,
                        password,
                        nombre,
                        email,
                        rol_id,
                        activo,
                        fecha_creacion
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        usuario.username,
                        usuario.password,
                        usuario.nombre,
                        usuario.email,
                        usuario.rol_id,
                        int(usuario.activo),
                        datetime.now(),
                    ),
                )

                conn.commit()
                usuario_id = cursor.lastrowid

        return {
            "success": True,
            "usuario_id": usuario_id
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Tabla intermedia Rol_Permiso
rol_permiso = Table(
    'rol_permiso',
    BaseModel.metadata,
    Column('rol_id', Integer, ForeignKey('rol.id'), primary_key=True),
    Column('permiso_id', Integer, ForeignKey('permiso.id'), primary_key=True)
)

class UsuarioCreate(BaseModel):
    username: str
    password: str
    nombre: str
    email: str
    rol_id: int
    activo: bool
    
    
class Rol(BaseModel):
    __tablename__ = "rol"  # Nota: en SQL es "Rol" con mayúscula
    
    nombre = Column(String(50), nullable=False)
    descripcion = Column(String(255))
    
    usuarios = relationship("Usuario", back_populates="rol")
    permisos = relationship("Permiso", secondary=rol_permiso, back_populates="roles")

class Permiso(BaseModel):
    __tablename__ = "permiso"
    
    codigo = Column(String(10), unique=True, nullable=False)
    nombre = Column(String(50), nullable=False)
    descripcion = Column(String(255))
    
    roles = relationship("Rol", secondary=rol_permiso, back_populates="permisos")

class Usuario(BaseModel):
    __tablename__ = "usuario"
    
    username = Column(String(50), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)  # En SQL es "password"
    nombre = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    rol_id = Column(Integer, ForeignKey("rol.id"), nullable=False)
    activo = Column(Boolean, default=True)
    fecha_creacion = Column(DateTime, server_default=func.now())
    
    rol = relationship("Rol", back_populates="usuarios")
    
    
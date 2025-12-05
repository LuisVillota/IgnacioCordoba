from sqlalchemy import Column, String, Integer, Boolean, ForeignKey, Table
from sqlalchemy.orm import relationship
from .base import BaseModel

# Tabla intermedia para Rol-Permiso
rol_permiso = Table(
    'rol_permiso',
    BaseModel.metadata,
    Column('rol_id', Integer, ForeignKey('rol.id'), primary_key=True),
    Column('permiso_id', Integer, ForeignKey('permiso.id'), primary_key=True)
)

class Rol(BaseModel):
    __tablename__ = "rol"
    
    nombre = Column(String(50), unique=True, nullable=False)
    descripcion = Column(String(200))
    
    # Relaciones
    usuarios = relationship("Usuario", back_populates="rol")
    permisos = relationship("Permiso", secondary=rol_permiso, back_populates="roles")

class Permiso(BaseModel):
    __tablename__ = "permiso"
    
    codigo = Column(String(20), unique=True, nullable=False)  # RF01, RF07, etc.
    nombre = Column(String(100), nullable=False)
    descripcion = Column(String(200))
    
    # Relaciones
    roles = relationship("Rol", secondary=rol_permiso, back_populates="permisos")

class Usuario(BaseModel):
    __tablename__ = "usuario"
    
    username = Column(String(50), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    nombre = Column(String(100), nullable=False)
    email = Column(String(100), unique=True)
    rol_id = Column(Integer, ForeignKey("rol.id"), nullable=False)
    activo = Column(Boolean, default=True)
    
    # Relaciones
    rol = relationship("Rol", back_populates="usuarios")
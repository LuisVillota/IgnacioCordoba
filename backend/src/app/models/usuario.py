from sqlalchemy import Column, String, Integer, Boolean, ForeignKey, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from .base import BaseModel

# Tabla intermedia Rol_Permiso
rol_permiso = Table(
    'rol_permiso',
    BaseModel.metadata,
    Column('rol_id', Integer, ForeignKey('rol.id'), primary_key=True),
    Column('permiso_id', Integer, ForeignKey('permiso.id'), primary_key=True)
)
    
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

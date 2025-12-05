from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from .base import BaseModel

class EstadoCita(BaseModel):
    __tablename__ = "estado_cita"
    
    nombre = Column(String(50), unique=True, nullable=False)
    color = Column(String(7))  # Código hex
    
    # Relaciones
    citas = relationship("Cita", back_populates="estado")

class Cita(BaseModel):
    __tablename__ = "cita"
    
    paciente_id = Column(Integer, ForeignKey("paciente.id"), nullable=False)
    usuario_id = Column(Integer, ForeignKey("usuario.id"), nullable=False)
    fecha_hora = Column(DateTime, nullable=False)
    tipo = Column(String(50))  # control, valoracion, programacion
    duracion_minutos = Column(Integer, default=30)
    estado_id = Column(Integer, ForeignKey("estado_cita.id"), nullable=False, default=4)  # pendiente
    notas = Column(Text)
    
    # Relaciones
    paciente = relationship("Paciente", back_populates="citas")
    usuario = relationship("Usuario", back_populates="citas")
    estado = relationship("EstadoCita", back_populates="citas")
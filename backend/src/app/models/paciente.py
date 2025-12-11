from sqlalchemy import Column, String, Integer, Date, DateTime, ForeignKey, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from .base import BaseModel

class Paciente(BaseModel):
    __tablename__ = "paciente"
    
    documento = Column(String(20), unique=True, nullable=False)
    tipo_documento = Column(String(10), default="CC")  # CC, TI, CE, PAS
    nombre = Column(String(100), nullable=False)
    apellido = Column(String(100), nullable=False)
    fecha_nacimiento = Column(Date)
    genero = Column(String(1))  # M, F, O
    telefono = Column(String(20))
    email = Column(String(100))
    direccion = Column(String(200))
    fecha_registro = Column(DateTime, server_default=func.now())
    
    # Relaciones - COMENTA TEMPORALMENTE las relaciones circulares
    # citas = relationship("Cita", back_populates="paciente", cascade="all, delete-orphan")
    historiales = relationship("HistorialClinico", back_populates="paciente", cascade="all, delete-orphan")
    # planes_quirurgicos = relationship("PlanQuirurgico", back_populates="paciente", cascade="all, delete-orphan")
    # cotizaciones = relationship("Cotizacion", back_populates="paciente", cascade="all, delete-orphan")
    # facturas = relationship("Factura", back_populates="paciente", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Paciente {self.nombre} {self.apellido}>"
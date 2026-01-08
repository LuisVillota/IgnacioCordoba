# backend\src\app\models\cotizacion.py
from sqlalchemy import Column, Integer, Float, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from .base import BaseModel

class Cotizacion(BaseModel):
    __tablename__ = "cotizacion"
    
    paciente_id = Column(Integer, ForeignKey('paciente.id'), nullable=False)
    usuario_id = Column(Integer, ForeignKey('usuario.id'), nullable=False)
    plan_id = Column(Integer, ForeignKey('plan_quirurgico.id'), nullable=True)
    estado_id = Column(Integer, ForeignKey('estado_cotizacion.id'), nullable=False)
    
    total = Column(Float(10, 2), nullable=False, default=0.00)
    subtotal_procedimientos = Column(Float(10, 2), nullable=False, default=0.00)
    subtotal_adicionales = Column(Float(10, 2), nullable=False, default=0.00)
    subtotal_otros_adicionales = Column(Float(10, 2), nullable=False, default=0.00)
    
    notas = Column(Text, nullable=True)
    fecha_emision = Column(DateTime, default=func.now())
    fecha_vencimiento = Column(DateTime, nullable=True)
    
    # Relaciones
    paciente = relationship("paciente")
    usuario = relationship("Usuario")
    plan = relationship("PlanQuirurgico")
    estado = relationship("EstadoCotizacion")
    items = relationship("CotizacionItem", back_populates="cotizacion")
    servicios_incluidos = relationship("CotizacionServicioIncluido", cascade="all, delete-orphan")

class CotizacionItem(BaseModel):
    __tablename__ = "cotizacion_item"
    
    cotizacion_id = Column(Integer, ForeignKey('cotizacion.id'), nullable=False)
    tipo = Column(String(50), nullable=False)  # 'procedimiento', 'adicional', 'otro_adicional'
    item_id = Column(Integer, nullable=False)
    descripcion = Column(String(255), nullable=False)
    cantidad = Column(Integer, nullable=False, default=1)
    precio_unitario = Column(Float(10, 2), nullable=False)
    subtotal = Column(Float(10, 2), nullable=False)
    
    # Relación
    cotizacion = relationship("Cotizacion", back_populates="items")

class CotizacionServicioIncluido(BaseModel):
    __tablename__ = "cotizacion_servicio_incluido"
    
    cotizacion_id = Column(Integer, ForeignKey('cotizacion.id'), nullable=False)
    servicio_nombre = Column(String(255), nullable=False)
    requiere = Column(Boolean, default=False, nullable=False)
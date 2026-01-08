# backend\src\app\models\estado_cotizacion.py
from sqlalchemy import Column, String, Integer
from .base import BaseModel

class EstadoCotizacion(BaseModel):
    __tablename__ = "estado_cotizacion"
    
    nombre = Column(String(50), nullable=False)
    descripcion = Column(String(255), nullable=True)
    color = Column(String(20), nullable=True, default='#6B7280')
    orden = Column(Integer, nullable=False, default=1)
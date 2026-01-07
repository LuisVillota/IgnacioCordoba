from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import date

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

class CotizacionBase(BaseModel):
    paciente_id: int
    usuario_id: int
    plan_id: Optional[int] = None
    estado_id: Optional[int] = None
    observaciones: Optional[str] = None
    fecha_vencimiento: Optional[date] = None
    validez_dias: Optional[int] = 7

class CotizacionCreate(CotizacionBase):
    items: List[CotizacionItemBase] = []
    servicios_incluidos: List[CotizacionServicioIncluido] = []
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
    observaciones: Optional[str] = None
    fecha_vencimiento: Optional[date] = None

class CotizacionInDB(CotizacionBase):
    id: int
    total: float
    fecha_emision: date
    paciente_nombre: Optional[str] = None
    paciente_apellido: Optional[str] = None
    paciente_documento: Optional[str] = None
    usuario_nombre: Optional[str] = None
    estado_nombre: Optional[str] = None
    items: List[CotizacionItemBase] = []
    servicios_incluidos: List[CotizacionServicioIncluido] = []
    
    class Config:
        from_attributes = True
from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime

class CotizacionItemCreate(BaseModel):
    tipo: str  # 'procedimiento', 'adicional', 'otroAdicional'
    item_id: int
    nombre: str
    descripcion: Optional[str] = ""
    cantidad: int = 1
    precio_unitario: float
    subtotal: float

class CotizacionServicioIncluidoCreate(BaseModel):
    servicio_nombre: str
    requiere: bool = False

class CotizacionCreate(BaseModel):
    paciente_id: int
    usuario_id: int
    estado_id: int = 1  # Por defecto: pendiente
    items: List[CotizacionItemCreate] = []
    servicios_incluidos: List[CotizacionServicioIncluidoCreate] = []
    
    # **SUBOTALES - REQUERIDOS para que MySQL calcule el total**
    subtotal_procedimientos: float = 0.00
    subtotal_adicionales: float = 0.00
    subtotal_otros_adicionales: float = 0.00
    
    # **TOTAL - NO REQUERIDO (la BD lo calcula)**
    total: Optional[float] = None  # O simplemente no incluyas este campo
    
    validez_dias: int = 7
    observaciones: Optional[str] = ""
    fecha_vencimiento: Optional[date] = None
    
    class Config:
        from_attributes = True

class CotizacionResponse(BaseModel):
    id: int
    paciente_id: int
    usuario_id: int
    estado_id: int
    subtotal_procedimientos: float
    subtotal_adicionales: float
    subtotal_otros_adicionales: float
    total: float  # **En la respuesta SÍ incluye el total**
    validez_dias: int
    observaciones: Optional[str]
    fecha_vencimiento: Optional[date]
    fecha_creacion: datetime
    
    class Config:
        from_attributes = True
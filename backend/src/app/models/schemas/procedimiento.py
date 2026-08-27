from pydantic import BaseModel
from typing import Optional
from datetime import date

class ProcedimientoBase(BaseModel):
    codigo: str
    nombre: str
    descripcion: Optional[str] = None
    precio_base: float
    activo: bool = True

class ProcedimientoCreate(BaseModel):
    nombre: str
    precio: float

class ProcedimientoUpdate(BaseModel):
    nombre: Optional[str] = None
    precio: Optional[float] = None

class ProcedimientoSimple(BaseModel):
    id: int
    nombre: str
    precio: float
    created_at: Optional[str] = None

class ProcedimientoInDB(ProcedimientoBase):
    id: int
    tarifa_id: Optional[int] = None
    
    class Config:
        from_attributes = True
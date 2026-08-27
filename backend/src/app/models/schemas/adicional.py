from pydantic import BaseModel
from typing import Optional

class AdicionalBase(BaseModel):
    codigo: str
    nombre: str
    descripcion: Optional[str] = None
    activo: bool = True
    precio: float

class AdicionalCreate(BaseModel):
    nombre: str
    precio: float

class AdicionalUpdate(BaseModel):
    nombre: Optional[str] = None
    precio: Optional[float] = None

class AdicionalSimple(BaseModel):
    id: int
    nombre: str
    precio: float
    created_at: Optional[str] = None

class AdicionalInDB(AdicionalBase):
    id: int
    tarifa_id: Optional[int] = None
    
    class Config:
        from_attributes = True
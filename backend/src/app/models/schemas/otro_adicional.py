from pydantic import BaseModel
from typing import Optional

class OtroAdicionalBase(BaseModel):
    codigo: str
    nombre: str
    descripcion: Optional[str] = None
    activo: bool = True
    precio: float

class OtroAdicionalCreate(BaseModel):
    nombre: str
    precio: int

class OtroAdicionalUpdate(BaseModel):
    nombre: Optional[str] = None
    precio: Optional[int] = None

class OtroAdicionalInDB(OtroAdicionalBase):
    id: int
    tarifa_id: Optional[int] = None
    
    class Config:
        from_attributes = True
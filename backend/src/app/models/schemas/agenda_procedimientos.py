from pydantic import BaseModel, validator
from typing import Optional, Union
from enum import Enum
from datetime import date

class EstadoProcedimiento(str, Enum):
    PROGRAMADO = "Programado"
    APLAZADO = "Aplazado"
    CONFIRMADO = "Confirmado"
    EN_QUIROFANO = "En Quirofano"
    OPERADO = "Operado"
    CANCELADO = "Cancelado"

class AgendaProcedimientoBase(BaseModel):
    numero_documento: str
    fecha: date
    hora: str
    procedimiento_id: int
    duracion: Optional[int] = None
    anestesiologo: Optional[str] = None
    estado: EstadoProcedimiento = EstadoProcedimiento.PROGRAMADO
    observaciones: Optional[str] = None
    
    @validator('procedimiento_id', pre=True)
    def convert_procedimiento_id(cls, v):
        if v is None:
            raise ValueError('procedimiento_id es requerido')
        if isinstance(v, int):
            return v
        if isinstance(v, str):
            try:
                return int(v)
            except (ValueError, TypeError):
                raise ValueError(f'procedimiento_id debe ser un número válido. Recibido: {v}')
        try:
            return int(v)
        except (ValueError, TypeError):
            raise ValueError(f'procedimiento_id debe ser un número. Recibido: {v}')

class AgendaProcedimientoCreate(AgendaProcedimientoBase):
    pass

class AgendaProcedimientoUpdate(BaseModel):
    fecha: Optional[date] = None
    hora: Optional[str] = None
    procedimiento_id: Optional[Union[int, str]] = None
    duracion: Optional[int] = None
    anestesiologo: Optional[str] = None
    estado: Optional[EstadoProcedimiento] = None
    observaciones: Optional[str] = None
    
    @validator('procedimiento_id', pre=True)
    def convert_update_procedimiento_id(cls, v):
        if v is None:
            return None
        if isinstance(v, int):
            return v
        if isinstance(v, str):
            try:
                if v.strip() == "":
                    return None
                return int(v)
            except (ValueError, TypeError):
                raise ValueError(f'procedimiento_id debe ser un número válido. Recibido: {v}')
        try:
            return int(v)
        except (ValueError, TypeError):
            raise ValueError(f'procedimiento_id debe ser un número. Recibido: {v}')
        
class AgendaProcedimientoResponse(AgendaProcedimientoBase):
    id: int
    paciente_nombre: Optional[str] = None
    paciente_apellido: Optional[str] = None
    procedimiento_nombre: Optional[str] = None

class AgendaProcedimientoInDB(AgendaProcedimientoBase):
    id: int
    paciente_nombre: Optional[str] = None
    paciente_apellido: Optional[str] = None
    procedimiento_nombre: Optional[str] = None
    paciente_telefono: Optional[str] = None
    paciente_email: Optional[str] = None
    procedimiento_precio: Optional[float] = None
    
    class Config:
        from_attributes = True
from pydantic import BaseModel, ConfigDict, Field
from datetime import date, time
from typing import Optional
from enum import Enum


class EstadoProcedimiento(str, Enum):
    PROGRAMADO = "Programado"
    APLAZADO = "Aplazado"
    CONFIRMADO = "Confirmado"
    EN_QUIROFANO = "En Quirofano"
    OPERADO = "Operado"
    CANCELADO = "Cancelado"


class AgendaProcedimientosBase(BaseModel):
    numero_documento: str = Field(..., max_length=15)
    fecha: date
    hora: time
    procedimiento_id: int
    duracion: Optional[int] = None
    anestesiologo: Optional[str] = Field(None, max_length=100)
    estado: EstadoProcedimiento = EstadoProcedimiento.PROGRAMADO
    observaciones: Optional[str] = None


class AgendaProcedimientosCreate(AgendaProcedimientosBase):
    pass


class AgendaProcedimientosUpdate(BaseModel):
    fecha: Optional[date] = None
    hora: Optional[time] = None
    procedimiento_id: Optional[int] = None
    duracion: Optional[int] = None
    anestesiologo: Optional[str] = Field(None, max_length=100)
    estado: Optional[EstadoProcedimiento] = None
    observaciones: Optional[str] = None


class AgendaProcedimientosInDB(AgendaProcedimientosBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


class AgendaProcedimientos(AgendaProcedimientosInDB):
    pass


# Esquema con datos relacionados (si necesitas mostrar más información)
class AgendaProcedimientosWithRelations(AgendaProcedimientos):
    paciente_nombre: Optional[str] = None
    procedimiento_nombre: Optional[str] = None
from pydantic import BaseModel
from typing import Optional, Dict
from datetime import datetime

class SalaEsperaBase(BaseModel):
    paciente_id: int
    cita_id: Optional[int] = None
    estado_id: int
    notas: Optional[str] = None
    tiene_cita_hoy: Optional[bool] = False

class SalaEsperaCreate(BaseModel):
    paciente_id: int
    cita_id: Optional[int] = None

class SalaEsperaUpdate(BaseModel):
    estado: str
    cita_id: Optional[int] = None

class BulkUpdateEstadosRequest(BaseModel):
    cambios: Dict[str, str]

class SalaEsperaInDB(SalaEsperaBase):
    id: int
    fecha_hora_ingreso: Optional[datetime] = None
    fecha_hora_cambio_estado: Optional[datetime] = None
    tiempo_espera_minutos: Optional[int] = None
    hora_cita_programada: Optional[str] = None
    
    class Config:
        from_attributes = True
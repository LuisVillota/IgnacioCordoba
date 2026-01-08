from pydantic import BaseModel, validator
from typing import Optional
from datetime import datetime

class CitaBase(BaseModel):
    paciente_id: int
    usuario_id: int
    fecha_hora: str
    tipo: str = "control"
    duracion_minutos: int = 30
    estado_id: int = 4
    notas: Optional[str] = None
    
    @validator('fecha_hora')
    def validate_fecha_hora(cls, v):
        try:
            # Intentar parsear la fecha
            if 'Z' in v:
                v = v.replace('Z', '')
            if len(v) == 16:  # Formato YYYY-MM-DDTHH:MM
                v += ":00"
            datetime.fromisoformat(v)
            return v
        except ValueError:
            raise ValueError('Formato de fecha y hora inválido. Use YYYY-MM-DDTHH:MM:SS')

class CitaCreate(CitaBase):
    pass

class CitaUpdate(BaseModel):
    paciente_id: Optional[int] = None
    usuario_id: Optional[int] = None
    fecha_hora: Optional[str] = None
    tipo: Optional[str] = None
    duracion_minutos: Optional[int] = None
    estado_id: Optional[int] = None
    notas: Optional[str] = None
    
    @validator('fecha_hora')
    def validate_fecha_hora(cls, v):
        if v is None:
            return v
        try:
            if 'Z' in v:
                v = v.replace('Z', '')
            if len(v) == 16:
                v += ":00"
            datetime.fromisoformat(v)
            return v
        except ValueError:
            raise ValueError('Formato de fecha y hora inválido. Use YYYY-MM-DDTHH:MM:SS')

class CitaInDB(CitaBase):
    id: int
    paciente_nombre: Optional[str] = None
    paciente_apellido: Optional[str] = None
    doctor_nombre: Optional[str] = None
    estado_nombre: Optional[str] = None
    estado_color: Optional[str] = None
    fecha_creacion: Optional[datetime] = None
    
    class Config:
        from_attributes = True
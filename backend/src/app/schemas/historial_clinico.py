from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional

class HistorialClinicoBase(BaseModel):
    paciente_id: int
    motivo_consulta: Optional[str] = None
    antecedentes_medicos: Optional[str] = None
    antecedentes_quirurgicos: Optional[str] = None
    antecedentes_alergicos: Optional[str] = None
    antecedentes_farmacologicos: Optional[str] = None
    exploracion_fisica: Optional[str] = None
    diagnostico: Optional[str] = None
    tratamiento: Optional[str] = None
    recomendaciones: Optional[str] = None
    fotos: Optional[str] = None

class HistorialClinicoCreate(HistorialClinicoBase):
    pass

class HistorialClinicoUpdate(HistorialClinicoBase):
    pass

class HistorialClinicoResponse(HistorialClinicoBase):
    id: int
    fecha_creacion: datetime
    
    model_config = ConfigDict(from_attributes=True)